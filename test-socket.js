const { io } = require('socket.io-client');

// URL to test
const serverUrl = process.argv[2] || 'http://localhost:3001';
const userId = 'test-user-' + Date.now();

console.log(`Connecting to socket server at: ${serverUrl}`);

const socket = io(serverUrl, {
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  auth: {
    userId
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
  withCredentials: true
});

// Log all events
socket.onAny((event, ...args) => {
  console.log(`Socket event: ${event}`, args);
});

socket.on('connect', () => {
  console.log('Connected successfully!');
  console.log('Socket ID:', socket.id);
  
  // Try to get transport info
  try {
    console.log('Using transport:', socket.io.engine.transport.name);
    console.log('Available transports:', socket.io.engine.transports);
  } catch (err) {
    console.error('Error accessing transport info:', err.message);
  }
  
  // Disconnect after success
  setTimeout(() => {
    socket.disconnect();
    console.log('Disconnected by script');
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  
  // Exit after 5 seconds on error
  setTimeout(() => {
    console.log('Exiting due to connection error');
    process.exit(1);
  }, 5000);
});

socket.on('error', (err) => {
  console.error('Socket error:', err);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Print a message immediately to confirm script is running
console.log('Socket connection initiated. Waiting for events...');

// Exit if no connection after 10 seconds
setTimeout(() => {
  if (!socket.connected) {
    console.error('Failed to connect after 10 seconds');
    process.exit(1);
  }
}, 10000); 