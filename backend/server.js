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

// Connect to database
connectDB();

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Set io instance for notification emitter
setIoInstance(io);

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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tournaments', tournamentRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room for notifications
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their personal room`);
  });

  // Join chat room
  socket.on('join-chat-room', (roomId) => {
    socket.join(`chat-${roomId}`);
    console.log(`User joined chat room: ${roomId}`);
  });

  // Leave chat room
  socket.on('leave-chat-room', (roomId) => {
    socket.leave(`chat-${roomId}`);
    console.log(`User left chat room: ${roomId}`);
  });

  // Handle new message
  socket.on('send-message', (data) => {
    const { recipientId, chatRoomId, message } = data;
    
    if (recipientId) {
      // Direct message
      io.to(`user-${recipientId}`).emit('new-message', message);
    } else if (chatRoomId) {
      // Group message
      socket.to(`chat-${chatRoomId}`).emit('new-message', message);
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const { recipientId, chatRoomId, user } = data;
    
    if (recipientId) {
      socket.to(`user-${recipientId}`).emit('user-typing', user);
    } else if (chatRoomId) {
      socket.to(`chat-${chatRoomId}`).emit('user-typing', user);
    }
  });

  socket.on('typing-stop', (data) => {
    const { recipientId, chatRoomId, user } = data;
    
    if (recipientId) {
      socket.to(`user-${recipientId}`).emit('user-stopped-typing', user);
    } else if (chatRoomId) {
      socket.to(`chat-${chatRoomId}`).emit('user-stopped-typing', user);
    }
  });

  // Handle notifications
  socket.on('send-notification', (data) => {
    const { recipientId, notification } = data;
    io.to(`user-${recipientId}`).emit('new-notification', notification);
  });

  // Handle online status
  socket.on('user-online', (userId) => {
    socket.broadcast.emit('user-status-change', { userId, status: 'online' });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // You could implement offline status here
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

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Health: http://localhost:${PORT}/api/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Promise Rejection:', err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err.message);
  process.exit(1);
});

module.exports = { app, io };
