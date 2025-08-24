const User = require('../models/User');
const RandomConnection = require('../models/RandomConnection');
const ConnectionQueue = require('../models/ConnectionQueue');
const { v4: uuidv4 } = require('uuid');

// Join the random connection queue
const joinQueue = async (req, res) => {
  try {
    const { selectedGame, videoEnabled = true } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!selectedGame) {
      return res.status(400).json({
        success: false,
        message: 'Game selection is required'
      });
    }

    // Check if user is already in queue
    const existingInQueue = await ConnectionQueue.findOne({
      userId,
      status: 'waiting'
    });

    if (existingInQueue) {
      return res.status(400).json({
        success: false,
        message: 'You are already in the queue'
      });
    }

    // Check if user is already in an active connection and disconnect them first
    const activeConnection = await RandomConnection.findOne({
      'participants.userId': userId,
      status: { $in: ['waiting', 'active'] }
    });

    if (activeConnection) {
      // Disconnect from existing connection first
      activeConnection.status = 'disconnected';
      activeConnection.endTime = new Date();
      activeConnection.duration = Math.floor((activeConnection.endTime - activeConnection.startTime) / 1000);
      
      // Mark user as left
      const participant = activeConnection.participants.find(p => p.userId.toString() === userId.toString());
      if (participant) {
        participant.leftAt = new Date();
      }

      await activeConnection.save();

      // Notify other participants
      const otherParticipants = activeConnection.participants.filter(p => p.userId.toString() !== userId.toString());
      otherParticipants.forEach(participant => {
        req.app.get('io').to(`user-${participant.userId}`).emit('partner-disconnected', {
          roomId: activeConnection.roomId,
          disconnectedUserId: userId
        });
      });
    }

    // Add user to queue
    const queueEntry = await ConnectionQueue.create({
      userId,
      username: req.user.username,
      displayName: req.user.profile.displayName,
      avatar: req.user.profile.avatar,
      selectedGame,
      videoEnabled
    });

    // Try to find a match immediately
    const match = await findMatch(userId, selectedGame);
    
    if (match) {
      // Create connection and notify both users
      const roomId = uuidv4();
      const connection = await RandomConnection.create({
        roomId,
        participants: [
          {
            userId,
            username: req.user.username,
            displayName: req.user.profile.displayName,
            avatar: req.user.profile.avatar,
            videoEnabled
          },
          {
            userId: match.userId,
            username: match.username,
            displayName: match.displayName,
            avatar: match.avatar,
            videoEnabled: match.videoEnabled
          }
        ],
        selectedGame,
        status: 'active',
        createdBy: userId
      });

      // Remove both users from queue
      await ConnectionQueue.deleteMany({
        userId: { $in: [userId, match.userId] }
      });

      // Emit socket events for both users
      req.app.get('io').to(`user-${userId}`).emit('connection-matched', {
        roomId: connection.roomId,
        partner: {
          userId: match.userId,
          username: match.username,
          displayName: match.displayName,
          avatar: match.avatar,
          videoEnabled: match.videoEnabled
        },
        selectedGame
      });
      
      req.app.get('io').to(`user-${match.userId}`).emit('connection-matched', {
        roomId: connection.roomId,
        partner: {
          userId,
          username: req.user.username,
          displayName: req.user.profile.displayName,
          avatar: req.user.profile.avatar,
          videoEnabled
        },
        selectedGame
      });

      return res.status(200).json({
        success: true,
        message: 'Connection established!',
        connection: connection
      });
    }

    res.status(200).json({
      success: true,
      message: 'Added to queue. Waiting for match...',
      queueId: queueEntry._id
    });

  } catch (error) {
    console.error('Join queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join queue',
      error: error.message
    });
  }
};

// Find a suitable match
const findMatch = async (userId, selectedGame) => {
  try {
    const potentialMatches = await ConnectionQueue.find({
      userId: { $ne: userId },
      selectedGame,
      status: 'waiting'
    }).populate('userId', 'username profile.displayName profile.avatar');

    if (potentialMatches.length > 0) {
      // Return the first available match (FIFO)
      const match = potentialMatches[0];
      return {
        userId: match.userId._id,
        username: match.username,
        displayName: match.displayName,
        avatar: match.avatar,
        videoEnabled: match.videoEnabled
      };
    }

    return null;
  } catch (error) {
    console.error('Find match error:', error);
    return null;
  }
};

// Leave the queue
const leaveQueue = async (req, res) => {
  try {
    const userId = req.user._id;

    // Remove user from queue
    const result = await ConnectionQueue.deleteOne({
      userId,
      status: 'waiting'
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'You are not in the queue'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Left the queue successfully'
    });

  } catch (error) {
    console.error('Leave queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave queue',
      error: error.message
    });
  }
};

// Get current connection
const getCurrentConnection = async (req, res) => {
  try {
    const userId = req.user._id;

    const connection = await RandomConnection.findOne({
      'participants.userId': userId,
      status: { $in: ['waiting', 'active'] }
    }).populate('participants.userId', 'username profile.displayName profile.avatar');

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'No active connection found'
      });
    }

    res.status(200).json({
      success: true,
      connection
    });

  } catch (error) {
    console.error('Get current connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current connection',
      error: error.message
    });
  }
};

// Disconnect from current connection
const disconnectConnection = async (req, res) => {
  try {
    const userId = req.user._id;
    const { roomId } = req.body;

    const connection = await RandomConnection.findOne({
      roomId,
      'participants.userId': userId,
      status: { $in: ['waiting', 'active'] }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found'
      });
    }

    // Update connection status
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
      req.app.get('io').to(`user-${participant.userId}`).emit('partner-disconnected', {
        roomId,
        disconnectedUserId: userId
      });
    });

    res.status(200).json({
      success: true,
      message: 'Disconnected successfully'
    });

  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect',
      error: error.message
    });
  }
};

// Send message in random connection
const sendMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { roomId, message } = req.body;

    if (!message || !roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID and message are required'
      });
    }

    const connection = await RandomConnection.findOne({
      roomId,
      'participants.userId': userId,
      status: { $in: ['waiting', 'active'] }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found'
      });
    }

    // Add message to connection
    connection.messages.push({
      sender: userId,
      message,
      timestamp: new Date()
    });

    await connection.save();

    // Emit message to other participants
    const otherParticipants = connection.participants.filter(p => p.userId.toString() !== userId.toString());
    otherParticipants.forEach(participant => {
      req.app.get('io').to(`user-${participant.userId}`).emit('random-connection-message', {
        roomId,
        sender: userId,
        message,
        timestamp: new Date()
      });
    });

    res.status(200).json({
      success: true,
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

// Get connection history
const getConnectionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const connections = await RandomConnection.find({
      'participants.userId': userId,
      status: { $in: ['ended', 'disconnected'] }
    })
    .populate('participants.userId', 'username profile.displayName profile.avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await RandomConnection.countDocuments({
      'participants.userId': userId,
      status: { $in: ['ended', 'disconnected'] }
    });

    res.status(200).json({
      success: true,
      connections,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });

  } catch (error) {
    console.error('Get connection history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection history',
      error: error.message
    });
  }
};

// Cleanup all active connections for a user (used on logout)
const cleanupUserConnections = async (req, res) => {
  try {
    const userId = req.user.id;

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
        req.app.get('io').to(`user-${participant.userId}`).emit('partner-disconnected', {
          roomId: connection.roomId,
          disconnectedUserId: userId,
          reason: 'User logged out'
        });
      });
    }

    // Remove user from any queue
    await ConnectionQueue.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: 'All connections cleaned up successfully',
      cleanedConnections: activeConnections.length
    });

  } catch (error) {
    console.error('Cleanup connections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup connections'
    });
  }
};

module.exports = {
  joinQueue,
  leaveQueue,
  getCurrentConnection,
  disconnectConnection,
  sendMessage,
  getConnectionHistory,
  cleanupUserConnections
};
