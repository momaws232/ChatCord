import SimplePeer from 'simple-peer';
import { Socket } from 'socket.io-client';
import { sendCallSignal, joinCall, leaveCall, createCall } from './socket';

export interface PeerConnection {
  peerId: string;
  peer: SimplePeer.Instance;
  stream?: MediaStream;
}

export class VoiceChatService {
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private connections: Map<string, PeerConnection> = new Map();
  private callId: string | null = null;
  private userId: string | null = null;
  private onPeerStreamHandlers: ((peerId: string, stream: MediaStream) => void)[] = [];
  private onPeerDisconnectHandlers: ((peerId: string) => void)[] = [];
  
  constructor() {}

  setSocket(socket: Socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }
  
  setupSocketListeners() {
    if (!this.socket) return;
    
    // When a new user joins the call
    this.socket.on('user-joined-call', ({ userId, callId }) => {
      console.log(`User ${userId} joined call ${callId}`);
      if (this.userId && this.localStream && callId === this.callId) {
        this.initiateCall(userId);
      }
    });
    
    // When a user leaves the call
    this.socket.on('user-left-call', ({ userId }) => {
      console.log(`User ${userId} left call`);
      this.handleUserDisconnect(userId);
    });
    
    // WebRTC signaling
    this.socket.on('call-signal', ({ from, signal, callId }) => {
      console.log(`Received call signal from ${from} for call ${callId}`);
      
      if (callId !== this.callId) return;
      
      const existingConnection = this.connections.get(from);
      
      if (existingConnection) {
        // If we already have a connection, just signal
        existingConnection.peer.signal(signal);
      } else {
        // Otherwise create a new peer as the non-initiator
        this.answerCall(signal, from);
      }
    });
    
    // Call participants list
    this.socket.on('call-participants', ({ users, callId }) => {
      console.log(`Received call participants for ${callId}:`, users);
      
      if (callId !== this.callId || !this.localStream) return;
      
      // Initialize connections to all existing participants
      users.forEach((userId: string) => {
        if (!this.connections.has(userId)) {
          this.initiateCall(userId);
        }
      });
    });
  }
  
  async startCall(callId: string, userId: string) {
    this.callId = callId;
    this.userId = userId;
    
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Notify the server that we're creating a new call
      createCall(callId, userId);
      
      return this.localStream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }
  
  async joinExistingCall(callId: string, userId: string) {
    this.callId = callId;
    this.userId = userId;
    
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Join the existing call
      joinCall(callId, userId);
      
      return this.localStream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }
  
  leaveCurrentCall() {
    if (!this.callId || !this.userId) return;
    
    // Notify server
    leaveCall(this.callId, this.userId);
    
    // Close all peer connections
    this.connections.forEach(connection => {
      connection.peer.destroy();
    });
    
    this.connections.clear();
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.callId = null;
  }
  
  private initiateCall(remoteUserId: string) {
    if (!this.localStream || !this.userId || !this.callId) return;
    
    console.log(`Initiating call to ${remoteUserId}`);
    
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: this.localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ]
      }
    });
    
    this.connections.set(remoteUserId, { peerId: remoteUserId, peer });
    
    peer.on('signal', signal => {
      sendCallSignal(remoteUserId, this.userId!, signal, this.callId!);
    });
    
    peer.on('stream', stream => {
      console.log(`Received stream from ${remoteUserId}`);
      
      const connection = this.connections.get(remoteUserId);
      if (connection) {
        connection.stream = stream;
        this.notifyPeerStream(remoteUserId, stream);
      }
    });
    
    peer.on('close', () => {
      console.log(`Connection closed with ${remoteUserId}`);
      this.connections.delete(remoteUserId);
      this.notifyPeerDisconnect(remoteUserId);
    });
    
    peer.on('error', err => {
      console.error(`Peer connection error with ${remoteUserId}:`, err);
      this.connections.delete(remoteUserId);
      this.notifyPeerDisconnect(remoteUserId);
    });
  }
  
  private answerCall(signal: SimplePeer.SignalData, remoteUserId: string) {
    if (!this.localStream || !this.userId || !this.callId) return;
    
    console.log(`Answering call from ${remoteUserId}`);
    
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: this.localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ]
      }
    });
    
    this.connections.set(remoteUserId, { peerId: remoteUserId, peer });
    
    peer.on('signal', signal => {
      sendCallSignal(remoteUserId, this.userId!, signal, this.callId!);
    });
    
    peer.on('stream', stream => {
      console.log(`Received stream from ${remoteUserId}`);
      
      const connection = this.connections.get(remoteUserId);
      if (connection) {
        connection.stream = stream;
        this.notifyPeerStream(remoteUserId, stream);
      }
    });
    
    peer.on('close', () => {
      console.log(`Connection closed with ${remoteUserId}`);
      this.connections.delete(remoteUserId);
      this.notifyPeerDisconnect(remoteUserId);
    });
    
    peer.on('error', err => {
      console.error(`Peer connection error with ${remoteUserId}:`, err);
      this.connections.delete(remoteUserId);
      this.notifyPeerDisconnect(remoteUserId);
    });
    
    // Accept the incoming signal
    peer.signal(signal);
  }
  
  private handleUserDisconnect(userId: string) {
    const connection = this.connections.get(userId);
    if (connection) {
      connection.peer.destroy();
      this.connections.delete(userId);
      this.notifyPeerDisconnect(userId);
    }
  }
  
  getRemoteStreams(): { userId: string, stream: MediaStream }[] {
    const remoteStreams: { userId: string, stream: MediaStream }[] = [];
    
    this.connections.forEach((connection, userId) => {
      if (connection.stream) {
        remoteStreams.push({ userId, stream: connection.stream });
      }
    });
    
    return remoteStreams;
  }
  
  onPeerStream(handler: (peerId: string, stream: MediaStream) => void) {
    this.onPeerStreamHandlers.push(handler);
    
    // Call handler for existing streams
    this.connections.forEach((connection, peerId) => {
      if (connection.stream) {
        handler(peerId, connection.stream);
      }
    });
  }
  
  onPeerDisconnect(handler: (peerId: string) => void) {
    this.onPeerDisconnectHandlers.push(handler);
  }
  
  private notifyPeerStream(peerId: string, stream: MediaStream) {
    this.onPeerStreamHandlers.forEach(handler => handler(peerId, stream));
  }
  
  private notifyPeerDisconnect(peerId: string) {
    this.onPeerDisconnectHandlers.forEach(handler => handler(peerId));
  }
} 