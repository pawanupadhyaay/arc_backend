const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  game: {
    type: String,
    required: true,
    enum: ['BGMI', 'Valorant', 'Free Fire', 'Call of Duty Mobile']
  },
  mode: {
    type: String,
    required: false,
    enum: ['Battle Royale', 'Deathmatch', '5v5', 'Solo']
  },
  format: {
    type: String,
    required: true,
    enum: ['Solo', 'Duo', 'Squad', '5v5']
  },

  status: {
    type: String,
    required: true,
    enum: ['Upcoming', 'Registration Open', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Upcoming'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    default: 'Online'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  prizePool: {
    type: Number,
    default: 0
  },
  entryFee: {
    type: Number,
    default: 0
  },
  totalSlots: {
    type: Number,
    required: true,
    min: 4
  },
  teamsPerGroup: {
    type: Number,
    required: true,
    min: 2,
    max: 16
  },
  numberOfGroups: {
    type: Number,
    required: true,
    min: 1
  },
  prizePoolType: {
    type: String,
    required: true,
    enum: ['with_prize', 'without_prize'],
    default: 'with_prize'
  },
  currentRound: {
    type: Number,
    default: 1
  },
  totalRounds: {
    type: Number,
    default: 1
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  groups: [{
    name: String,
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    broadcastChannelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }
  }],
  banner: {
    type: String,
    default: null
  },
  rules: [{
    type: String
  }],
  broadcastChannels: [{
    name: String,
    type: {
      type: String,
      enum: ['Text Messages', 'Voice', 'Video'],
      default: 'Text Messages'
    },
    description: String,
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }
  }],
  matches: [{
    round: Number,
    groupId: String,
    team1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    team2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled'
    },
    scheduledTime: Date,
    result: {
      team1Score: Number,
      team2Score: Number
    }
  }],
  winners: [{
    position: Number,
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    prize: Number
  }]
}, {
  timestamps: true
});

// Indexes for better performance
tournamentSchema.index({ status: 1, startDate: 1 });
tournamentSchema.index({ host: 1 });
tournamentSchema.index({ game: 1, format: 1 });

module.exports = mongoose.model('Tournament', tournamentSchema);
