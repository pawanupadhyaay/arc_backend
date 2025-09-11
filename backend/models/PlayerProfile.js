const mongoose = require('mongoose');

const playerProfileSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Player is required']
  },
  profileType: {
    type: String,
    enum: ['looking-for-team', 'staff-position'],
    required: [true, 'Profile type is required']
  },
  // Game and Role Information
  game: {
    type: String,
    required: [true, 'Game is required'],
    enum: ['BGMI', 'Valorant', 'Free Fire', 'Call of Duty Mobile', 'CS:GO', 'Fortnite', 'Apex Legends', 'League of Legends', 'Dota 2']
  },
  role: {
    type: String,
    required: function() {
      return this.profileType === 'looking-for-team';
    }
  },
  // For staff profiles
  staffRole: {
    type: String,
    enum: ['Coach', 'Manager', 'Video Editor', 'Social Media Manager', 'GFX Artist', 'Scrims Manager', 'Tournament Manager'],
    required: function() {
      return this.profileType === 'staff-position';
    }
  },
  // Player/Staff Information
  playerInfo: {
    playerName: String,
    currentRank: String,
    experienceLevel: String,
    tournamentExperience: String,
    achievements: String,
    availability: String,
    languages: String,
    additionalInfo: String
  },
  // Staff specific information
  professionalInfo: {
    fullName: String,
    experienceLevel: String,
    availability: String,
    preferredLocation: String,
    skillsAndExpertise: String,
    professionalAchievements: String,
    portfolio: String
  },
  // Expectations and Contact
  expectations: {
    expectedSalary: String,
    compensationPreference: String,
    preferredTeamSize: String,
    teamType: String,
    preferredLocation: String,
    additionalInfo: String,
    contactInformation: String
  },
  // Status and Metadata
  status: {
    type: String,
    enum: ['active', 'paused', 'inactive'],
    default: 'active'
  },
  interestedTeams: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    interestedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'],
      default: 'pending'
    },
    message: String
  }],
  views: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
playerProfileSchema.index({ player: 1, createdAt: -1 });
playerProfileSchema.index({ profileType: 1, game: 1, status: 1 });
playerProfileSchema.index({ 'expectations.preferredLocation': 1 });
playerProfileSchema.index({ createdAt: -1 });
playerProfileSchema.index({ expiresAt: 1 });

// Virtual for interested teams count
playerProfileSchema.virtual('interestedTeamsCount').get(function() {
  return this.interestedTeams ? this.interestedTeams.length : 0;
});

// Ensure virtual fields are included in JSON
playerProfileSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('PlayerProfile', playerProfileSchema);
