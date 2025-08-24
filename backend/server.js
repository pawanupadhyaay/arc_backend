const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { handleValidationErrors } = require('./middleware/validation');
const { setIoInstance } = require('./utils/notificationEmitter');

// Import routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const tournamentRoutes = require('./routes/tournaments');
const leaveRequestRoutes = require('./routes/leaveRequests');
const randomConnectionRoutes = require('./routes/randomConnections');

// Connect to database
connectDB();

const app = express();
const server = createServer(app);

// Socket.IO setup with better error handling
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Set io instance for notification emitter
setIoInstance(io);

// Make io available to routes
app.set('io', io);

// Track connected users to prevent duplicates
const connectedUsers = new Map();

// Import models for cleanup
const RandomConnection = require('./models/RandomConnection');
const ConnectionQueue = require('./models/ConnectionQueue');

// Cleanup function for user random connections
const cleanupUserRandomConnections = async (userId, io) => {
  try {
    // Find all active connections for the user
    const activeConnections = await RandomConnection.find({
      'participants.userId': userId,
      status: { $in: ['waiting', 'active'] }
    });

    // Update each connection and notify other participants
    for (const connection of activeConnections) {
      connection.status = 'disconnected';
      connection.endTime = new Date();
      connection.duration = Math.floor((connection.endTime - connection.startTime) / 1000);
      
      // Mark user as left
      const participant = connection.participants.find(p => p.userId.toString() === userId.toString());
      if (participant) {
        participant.leftAt = new Date();
      }

      await connection.save();

      // Notify other participants
      const otherParticipants = connection.participants.filter(p => p.userId.toString() !== userId.toString());
      otherParticipants.forEach(participant => {
        io.to(`user-${participant.userId}`).emit('partner-disconnected', {
          roomId: connection.roomId,
          disconnectedUserId: userId,
          reason: 'Connection lost'
        });
      });
    }

    // Remove user from any queue
    await ConnectionQueue.deleteMany({ userId });

    console.log(`Cleaned up ${activeConnections.length} random connections for user ${userId}`);
  } catch (error) {
    console.error('Error cleaning up user random connections:', error);
  }
};

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// CORS
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files for tournament banners
app.use('/uploads', express.static('uploads'));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Gaming Social Platform API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Connection test route
app.get('/api/test-connection', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Connection test successful',
    timestamp: new Date().toISOString(),
    connectedUsers: connectedUsers.size
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/random-connections', randomConnectionRoutes);

// Socket.IO connection handling with improved error handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room for notifications
  socket.on('join-user-room', (userId) => {
    try {
      // Remove user from previous room if exists
      const previousUserId = connectedUsers.get(socket.id);
      if (previousUserId && previousUserId !== userId) {
        socket.leave(`user-${previousUserId}`);
        console.log(`User ${previousUserId} left their previous room`);
      }

      // Join new room
      socket.join(`user-${userId}`);
      connectedUsers.set(socket.id, userId);
      console.log(`User ${userId} joined their personal room`);
    } catch (error) {
      console.error('Error joining user room:', error);
    }
  });

  // Join chat room
  socket.on('join-chat-room', (roomId) => {
    try {
      socket.join(`chat-${roomId}`);
      console.log(`User joined chat room: ${roomId}`);
    } catch (error) {
      console.error('Error joining chat room:', error);
    }
  });

  // Leave chat room
  socket.on('leave-chat-room', (roomId) => {
    try {
      socket.leave(`chat-${roomId}`);
      console.log(`User left chat room: ${roomId}`);
    } catch (error) {
      console.error('Error leaving chat room:', error);
    }
  });

  // Handle new message
  socket.on('send-message', (data) => {
    try {
      const { recipientId, chatRoomId, message } = data;
      
      if (recipientId) {
        // Direct message
        io.to(`user-${recipientId}`).emit('new-message', message);
      } else if (chatRoomId) {
        // Group message
        socket.to(`chat-${chatRoomId}`).emit('new-message', message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    try {
      const { recipientId, chatRoomId, user } = data;
      
      if (recipientId) {
        socket.to(`user-${recipientId}`).emit('user-typing', user);
      } else if (chatRoomId) {
        socket.to(`chat-${chatRoomId}`).emit('user-typing', user);
      }
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  });

  socket.on('typing-stop', (data) => {
    try {
      const { recipientId, chatRoomId, user } = data;
      
      if (recipientId) {
        socket.to(`user-${recipientId}`).emit('user-stopped-typing', user);
      } else if (chatRoomId) {
        socket.to(`chat-${chatRoomId}`).emit('user-stopped-typing', user);
      }
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  });

  // Handle notifications
  socket.on('send-notification', (data) => {
    try {
      const { recipientId, notification } = data;
      io.to(`user-${recipientId}`).emit('new-notification', notification);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  });

  // Handle online status
  socket.on('user-online', (userId) => {
    try {
      socket.broadcast.emit('user-status-change', { userId, status: 'online' });
    } catch (error) {
      console.error('Error handling user online status:', error);
    }
  });

  // Random Connect Events
  socket.on('join-random-queue', (data) => {
    try {
      const { selectedGame, videoEnabled } = data;
      const userId = connectedUsers.get(socket.id);
      
      if (userId) {
        socket.join(`random-queue-${selectedGame}`);
        console.log(`User ${userId} joined random queue for ${selectedGame}`);
      }
    } catch (error) {
      console.error('Error joining random queue:', error);
    }
  });

  socket.on('leave-random-queue', (data) => {
    try {
      const { selectedGame } = data;
      const userId = connectedUsers.get(socket.id);
      
      if (userId) {
        socket.leave(`random-queue-${selectedGame}`);
        console.log(`User ${userId} left random queue for ${selectedGame}`);
      }
    } catch (error) {
      console.error('Error leaving random queue:', error);
    }
  });

  socket.on('join-random-room', (roomId) => {
    try {
      const userId = connectedUsers.get(socket.id);
      socket.join(`random-room-${roomId}`);
      console.log(`User ${userId} joined random room: ${roomId}`);
      
      // Send confirmation back to the user
      socket.emit('room-joined', { roomId });
      
      // Notify other users in the room that someone joined
      socket.to(`random-room-${roomId}`).emit('user-joined-room', { 
        roomId, 
        userId 
      });
    } catch (error) {
      console.error('Error joining random room:', error);
    }
  });

  socket.on('leave-random-room', (roomId) => {
    try {
      socket.leave(`random-room-${roomId}`);
      console.log(`User left random room: ${roomId}`);
    } catch (error) {
      console.error('Error leaving random room:', error);
    }
  });

  socket.on('random-connection-message', (data) => {
    try {
      const { roomId, message } = data;
      const userId = connectedUsers.get(socket.id);
      
      if (userId && roomId) {
        // Forward message to other users in the room
        socket.to(`random-room-${roomId}`).emit('random-connection-message', {
          sender: userId,
          message,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error handling random connection message:', error);
    }
  });

  socket.on('webrtc-signal', (data) => {
    try {
      const { roomId, signal, targetUserId } = data;
      const userId = connectedUsers.get(socket.id);
      
      console.log(`WebRTC signal from ${userId} to ${targetUserId}:`, signal.type);
      console.log('Signal data:', JSON.stringify(signal, null, 2));
      
      if (userId && roomId && targetUserId) {
        // Forward WebRTC signaling to target user
        io.to(`user-${targetUserId}`).emit('webrtc-signal', {
          signal,
          fromUserId: userId,
          roomId
        });
        console.log(`WebRTC signal forwarded to user ${targetUserId}`);
        
        // Also log if the target user is connected
        const targetSocket = Array.from(io.sockets.sockets.values()).find(s => 
          connectedUsers.get(s.id) === targetUserId
        );
        if (targetSocket) {
          console.log(`Target user ${targetUserId} is connected via socket ${targetSocket.id}`);
        } else {
          console.log(`Target user ${targetUserId} is NOT connected`);
        }
      } else {
        console.log('Missing data for WebRTC signal:', { userId, roomId, targetUserId });
      }
    } catch (error) {
      console.error('Error handling WebRTC signal:', error);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('disconnect', (reason) => {
    try {
      console.log('User disconnected:', socket.id, 'Reason:', reason);
      
      // Clean up user tracking
      const userId = connectedUsers.get(socket.id);
      if (userId) {
        // Cleanup random connections if user disconnects
        cleanupUserRandomConnections(userId, io);
        
        connectedUsers.delete(socket.id);
        console.log(`Cleaned up user ${userId} from tracking`);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Validation error handler
app.use(handleValidationErrors);

// Global error handler
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Health: http://localhost:${PORT}/api/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Promise Rejection:', err.message);
  console.error(err);
  // Don't exit immediately, give time for cleanup
  setTimeout(() => {
    server.close(() => {
      process.exit(1);
    });
  }, 1000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err.message);
  console.error(err);
  // Don't exit immediately, give time for cleanup
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, io };
