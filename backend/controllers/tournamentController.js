const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Notification = require('../models/Notification');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/tournaments';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
}).single('banner');

// Create new tournament
const createTournament = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      // Debug: Log the request body
      console.log('Request body:', req.body);
      console.log('Request file:', req.file);

      const {
        name,
        description,
        game,
        mode,
        format,
        startDate,
        endDate,
        registrationDeadline,
        location,
        timezone,
        prizePool,
        entryFee,
        totalSlots,
        teamsPerGroup,
        numberOfGroups,
        prizePoolType,
        rules
      } = req.body;

    const hostId = req.user._id;

    // Validate dates
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const deadline = new Date(registrationDeadline);

    if (start <= now) {
      return res.status(400).json({
        success: false,
        message: 'Tournament start date must be in the future'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    if (deadline >= start) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline must be before start date'
      });
    }

    // Validate prize pool for prize tournaments
    if (prizePoolType === 'with_prize' && (!prizePool || prizePool < 100)) {
      return res.status(400).json({
        success: false,
        message: 'Prize pool must be at least ₹100 for prize tournaments'
      });
    }

    // Create tournament
    const tournamentData = {
      name,
      description,
      game,
      mode: mode || null,
      format,
      startDate: start,
      endDate: end,
      registrationDeadline: deadline,
      location: location || 'Online',
      timezone: timezone || 'UTC',
      prizePool: prizePoolType === 'with_prize' ? (prizePool || 0) : 0,
      entryFee: entryFee || 0,
      totalSlots: parseInt(totalSlots),
      teamsPerGroup: parseInt(teamsPerGroup),
      numberOfGroups: parseInt(numberOfGroups),
      prizePoolType,
      host: hostId,
      banner: req.file ? req.file.filename : null,
      rules: rules ? rules.split(',').map(rule => rule.trim()) : [],
      status: 'Upcoming'
    };

    const tournament = await Tournament.create(tournamentData);
    
    // Populate host info
    await tournament.populate('host', 'username profile.displayName profile.avatar');

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      data: {
        tournament
      }
    });
    });
  } catch (error) {
    console.error('Tournament creation error:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create tournament',
      error: error.message
    });
  }
};

// Get all tournaments
const getTournaments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { status, game, format, search } = req.query;

    // Build filter object
    const filter = {};

    if (status) filter.status = status;
    if (game) filter.game = game;
    if (format) filter.format = format;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tournaments = await Tournament.find(filter)
      .populate('host', 'username profile.displayName profile.avatar')
      .populate('participants', 'username profile.displayName profile.avatar')
      .populate('teams', 'username profile.displayName profile.avatar')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Tournament.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        tournaments,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: tournaments.length,
          totalTournaments: total
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tournaments',
      error: error.message
    });
  }
};

// Get single tournament
const getTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('host', 'username profile.displayName profile.avatar')
      .populate('participants', 'username profile.displayName profile.avatar')
      .populate('teams', 'username profile.displayName profile.avatar')
      .populate('matches.team1', 'username profile.displayName profile.avatar')
      .populate('matches.team2', 'username profile.displayName profile.avatar')
      .populate('matches.winner', 'username profile.displayName profile.avatar')
      .populate('winners.team', 'username profile.displayName profile.avatar');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        tournament
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tournament',
      error: error.message
    });
  }
};

// Update tournament
const updateTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check if user is the host
    if (tournament.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only tournament host can update tournament'
      });
    }

    // Only allow updates if tournament hasn't started
    if (tournament.status !== 'Upcoming' && tournament.status !== 'Registration Open') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update tournament that has already started'
      });
    }

    const updatedTournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('host', 'username profile.displayName profile.avatar');

    res.status(200).json({
      success: true,
      message: 'Tournament updated successfully',
      data: {
        tournament: updatedTournament
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update tournament',
      error: error.message
    });
  }
};

// Join tournament
const joinTournament = async (req, res) => {
  try {
    console.log('Join tournament request:', {
      tournamentId: req.params.id,
      userId: req.user._id,
      userType: req.user.userType,
      username: req.user.username
    });

    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    console.log('Tournament found:', {
      id: tournament._id,
      name: tournament.name,
      status: tournament.status,
      currentParticipants: tournament.participants.length + tournament.teams.length,
      totalSlots: tournament.totalSlots
    });

    // Check if registration is open
    if (tournament.status !== 'Registration Open') {
      return res.status(400).json({
        success: false,
        message: `Tournament registration is not open. Current status: ${tournament.status}`
      });
    }

    // Check if registration deadline has passed
    if (new Date() > tournament.registrationDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    const userId = req.user._id;

    // Check if user is already registered
    const isAlreadyRegistered = tournament.participants.includes(userId) || 
                               tournament.teams.includes(userId);

    if (isAlreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this tournament'
      });
    }

    // Check if tournament is full
    const currentParticipants = tournament.participants.length + tournament.teams.length;
    if (currentParticipants >= tournament.totalSlots) {
      return res.status(400).json({
        success: false,
        message: 'Tournament is full'
      });
    }

    // Add user to tournament based on their type and tournament format
    if (req.user.userType === 'team') {
      // Teams can join all tournament formats
      tournament.teams.push(userId);
    } else {
      // Players can only join Solo and Duo tournaments
      if (tournament.format === 'Solo' || tournament.format === 'Duo') {
        tournament.participants.push(userId);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Players can only join Solo and Duo tournaments. For Squad tournaments, please join as a team.'
        });
      }
    }

    await tournament.save();

    // Send notification to host
    await Notification.createNotification({
      recipient: tournament.host,
      sender: userId,
      type: 'system',
      title: 'New Tournament Registration',
      message: `${req.user.username} has joined your tournament "${tournament.name}"`,
      data: {
        tournamentId: tournament._id,
        customData: { action: 'tournament_join' }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Successfully joined tournament'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to join tournament',
      error: error.message
    });
  }
};

// Leave tournament
const leaveTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    const userId = req.user._id;

    // Check if user is registered
    const isRegistered = tournament.participants.includes(userId) || 
                        tournament.teams.includes(userId);

    if (!isRegistered) {
      return res.status(400).json({
        success: false,
        message: 'You are not registered for this tournament'
      });
    }

    // Remove user from tournament
    tournament.participants = tournament.participants.filter(id => id.toString() !== userId.toString());
    tournament.teams = tournament.teams.filter(id => id.toString() !== userId.toString());

    await tournament.save();

    res.status(200).json({
      success: true,
      message: 'Successfully left tournament'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to leave tournament',
      error: error.message
    });
  }
};

// Auto assign groups
const autoAssignGroups = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check if user is the host
    if (tournament.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only tournament host can assign groups'
      });
    }

    const allParticipants = [...tournament.participants, ...tournament.teams];
    
    if (allParticipants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No participants to assign to groups'
      });
    }

    // Simple group assignment (can be enhanced)
    const groupSize = Math.ceil(allParticipants.length / 4); // 4 groups max
    const groups = [];
    
    for (let i = 0; i < allParticipants.length; i += groupSize) {
      const groupParticipants = allParticipants.slice(i, i + groupSize);
      groups.push({
        name: `Group ${Math.floor(i / groupSize) + 1}`,
        participants: groupParticipants
      });
    }

    tournament.groups = groups;
    await tournament.save();

    res.status(200).json({
      success: true,
      message: 'Groups assigned successfully',
      data: {
        groups: tournament.groups
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign groups',
      error: error.message
    });
  }
};

// Send broadcast
const sendBroadcast = async (req, res) => {
  try {
    const { message } = req.body;
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check if user is the host
    if (tournament.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only tournament host can send broadcasts'
      });
    }

    // Send notifications to all participants
    const allParticipants = [...tournament.participants, ...tournament.teams];
    
    const notificationPromises = allParticipants.map(participantId =>
      Notification.createNotification({
        recipient: participantId,
        sender: req.user._id,
        type: 'system',
        title: `Tournament Update: ${tournament.name}`,
        message: message,
        data: {
          tournamentId: tournament._id,
          customData: { action: 'tournament_broadcast' }
        }
      })
    );

    await Promise.all(notificationPromises);

    res.status(200).json({
      success: true,
      message: 'Broadcast sent successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast',
      error: error.message
    });
  }
};

// Start tournament
const startTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check if user is the host
    if (tournament.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only tournament host can start tournament'
      });
    }

    // Check if tournament can be started
    if (tournament.status !== 'Registration Open') {
      return res.status(400).json({
        success: false,
        message: 'Tournament cannot be started in current status'
      });
    }

    // Check if start date has arrived
    if (new Date() < tournament.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Tournament start date has not arrived yet'
      });
    }

    tournament.status = 'Ongoing';
    tournament.currentRound = 1;
    await tournament.save();

    res.status(200).json({
      success: true,
      message: 'Tournament started successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start tournament',
      error: error.message
    });
  }
};

// Delete tournament
const deleteTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check if user is the host
    if (tournament.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only tournament host can delete tournament'
      });
    }

    // Only allow deletion if tournament hasn't started
    if (tournament.status !== 'Upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete tournament that has already started'
      });
    }

    await Tournament.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Tournament deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete tournament',
      error: error.message
    });
  }
};

module.exports = {
  createTournament,
  getTournaments,
  getTournament,
  updateTournament,
  joinTournament,
  leaveTournament,
  autoAssignGroups,
  sendBroadcast,
  startTournament,
  deleteTournament
};
