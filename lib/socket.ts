import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (userId: string) => {
  if (socket) return socket;
  
  // Use environment variable with fallback to localhost
  const serverUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';
  
  socket = io(serverUrl, {
    auth: {
      userId
    },
  });
  
  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from WebSocket server');
  });
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

// Direct messaging
export const sendDirectMessage = (to: string, from: string, message: string) => {
  if (!socket) return;
  
  socket.emit('send-direct-message', {
    to,
    from,
    message
  });
};

// Call management
export const createCall = (callId: string, creatorId: string) => {
  if (!socket) return;
  
  socket.emit('create-call', {
    callId,
    creatorId
  });
};

export const joinCall = (callId: string, userId: string) => {
  if (!socket) return;
  
  socket.emit('join-call', {
    callId,
    userId
  });
};

export const leaveCall = (callId: string, userId: string) => {
  if (!socket) return;
  
  socket.emit('leave-call', {
    callId,
    userId
  });
};

export const sendCallSignal = (to: string, from: string, signal: any, callId: string) => {
  if (!socket) return;
  
  socket.emit('call-signal', {
    to,
    from,
    signal,
    callId
  });
}; 