const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // Use environment variable with fallback for local development
    origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store active users and call participants
const users = {};
const activeCalls = {};

io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  
  if (!userId) {
    console.log('Socket connection rejected - no userId provided');
    socket.disconnect();
    return;
  }
  
  console.log(`User connected: ${userId}, Socket ID: ${socket.id}`);
  users[socket.id] = { userId, socket };
  
  // Emit online status to friends
  socket.broadcast.emit('user-status-changed', { userId, status: 'online' });
  
  // Handle direct message events
  socket.on('send-direct-message', ({ to, from, message }) => {
    console.log(`Direct message from ${from} to ${to}: ${message}`);
    
    // Find socket for recipient
    const recipient = Object.values(users).find(user => user.userId === to);
    
    if (recipient) {
      recipient.socket.emit('direct-message-received', {
        from,
        message
      });
    }
  });
  
  // Call related events
  socket.on('create-call', ({ callId, creatorId }) => {
    console.log(`Call created by ${creatorId}, Call ID: ${callId}`);
    
    // Create a room for this call
    socket.join(`call:${callId}`);
    
    if (!activeCalls[callId]) {
      activeCalls[callId] = {
        creatorId,
        participants: [creatorId]
      };
    }
  });
  
  socket.on('join-call', ({ callId, userId }) => {
    console.log(`User ${userId} joining call ${callId}`);
    
    // Join call room
    socket.join(`call:${callId}`);
    
    if (!activeCalls[callId]) {
      activeCalls[callId] = {
        participants: []
      };
    }
    
    // Add user to participants
    if (!activeCalls[callId].participants.includes(userId)) {
      activeCalls[callId].participants.push(userId);
    }
    
    // Notify other users in the call about the new participant
    socket.to(`call:${callId}`).emit('user-joined-call', { userId, callId });
    
    // Send list of users already in the call to the joining user
    const usersInCall = activeCalls[callId].participants.filter(id => id !== userId);
    socket.emit('call-participants', { users: usersInCall, callId });
  });
  
  socket.on('leave-call', ({ callId, userId }) => {
    console.log(`User ${userId} leaving call ${callId}`);
    
    socket.leave(`call:${callId}`);
    
    // Remove user from call participants
    if (activeCalls[callId]) {
      activeCalls[callId].participants = activeCalls[callId].participants.filter(id => id !== userId);
      
      // Delete the call if no participants left
      if (activeCalls[callId].participants.length === 0) {
        delete activeCalls[callId];
      } else {
        // Notify other participants
        socket.to(`call:${callId}`).emit('user-left-call', { userId });
      }
    }
  });
  
  // WebRTC signaling
  socket.on('call-signal', ({ to, from, signal, callId }) => {
    console.log(`Call signal from ${from} to ${to} for call ${callId}`);
    
    // Find socket for recipient
    const recipient = Object.values(users).find(user => user.userId === to);
    
    if (recipient) {
      recipient.socket.emit('call-signal', {
        from,
        signal,
        callId
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    const user = users[socket.id];
    
    if (user) {
      console.log(`User disconnected: ${user.userId}`);
      
      // Notify friends that user is offline
      socket.broadcast.emit('user-status-changed', { userId: user.userId, status: 'offline' });
      
      // Remove user from all active calls
      Object.keys(activeCalls).forEach((callId) => {
        const participantIndex = activeCalls[callId].participants.indexOf(user.userId);
        
        if (participantIndex !== -1) {
          activeCalls[callId].participants.splice(participantIndex, 1);
          io.to(`call:${callId}`).emit('user-left-call', { userId: user.userId });
          
          // Delete the call if no participants left
          if (activeCalls[callId].participants.length === 0) {
            delete activeCalls[callId];
          }
        }
      });
      
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});

// Basic route for checking server status
app.get('/', (req, res) => {
  res.send('ChatCord Socket.io Server is running');
});

module.exports = { app, server }; 