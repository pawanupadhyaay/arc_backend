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
const jwt = require('jsonwebtoken');

// Import routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const tournamentRoutes = require('./routes/tournaments');
const leaveRequestRoutes = require('./routes/leaveRequests');
const randomConnectionRoutes = require('./routes/randomConnections');
const recruitmentRoutes = require('./routes/recruitment');

// Connect to database
connectDB();

const app = express();
const server = createServer(app);

// Simple Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001", 
      "http://127.0.0.1:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Simple socket authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.id) {
      return next(new Error('Invalid token: no userId'));
    }
    
    socket.userId = decoded.id;
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// Set io instance
setIoInstance(io);
app.set('io', io);

// Simple user tracking
const connectedUsers = new Map();

// Security middleware
app.use(helmet());

// Rate limiting - more lenient
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// CORS
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://localhost:3001", 
    "http://127.0.0.1:3000"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/uploads', express.static('uploads'));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Gaming Social Platform API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
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
app.use('/api/recruitment', recruitmentRoutes);

// Simple socket handling
io.on('connection', (socket) => {
  console.log('New socket connection:', socket.id);
  
  const userId = socket.userId;
  if (!userId) {
    console.log('No userId, disconnecting');
    socket.disconnect();
    return;
  }
  
  // Track user
  connectedUsers.set(socket.id, userId);
  console.log(`User ${userId} connected. Total: ${connectedUsers.size}`);

  // Join user room
  socket.on('join-user-room', (userId) => {
    if (userId) {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined their room`);
    }
  });

  // Handle ping
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Simple disconnect handling
  socket.on('disconnect', (reason) => {
    console.log(`User ${userId} disconnected: ${reason}`);
    connectedUsers.delete(socket.id);
    console.log(`Remaining users: ${connectedUsers.size}`);
  });
});

// Error handlers
app.use(handleValidationErrors);
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
  // Don't exit, just log
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err.message);
  // Don't exit, just log
});

module.exports = { app, io };
