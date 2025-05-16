import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (userId: string) => {
  if (socket && socket.connected) {
    console.log('Reusing existing socket connection', socket.id);
    return socket;
  }
  
  // Always connect to the same domain where the app is running
  // This will use the rewrite rule in next.config.js
  const serverUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  
  console.log('Connecting to socket server at:', serverUrl);
  
  try {
    socket = io(serverUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      auth: {
        userId
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket server with socket ID:', socket?.id);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
    });
    
    return socket;
  } catch (error) {
    console.error('Error creating socket connection:', error);
    return null;
  }
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