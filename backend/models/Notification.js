const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Notification recipient is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'like',
      'comment',
      'follow',
      'message',
      'post_share',
      'team_invite',
      'team_request',
      'recruitment_application',
      'achievement',
      'mention',
      'system',
      'roster_invite',
      'staff_invite'
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [300, 'Message cannot exceed 300 characters']
  },
  data: {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    chatRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom'
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId
    },
    rosterInviteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RosterInvite'
    },
    staffInviteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StaffInvite'
    },
    customData: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  expiresAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    console.log('Creating notification with data:', JSON.stringify(data, null, 2));
    console.log('Data type:', typeof data);
    console.log('Data keys:', Object.keys(data));
    
    const notification = new this(data);
    console.log('Notification object created:', notification._id);
    
    // Validate the notification before saving
    const validationError = notification.validateSync();
    if (validationError) {
      console.error('Notification validation error:', validationError);
      console.error('Validation error details:', {
        message: validationError.message,
        name: validationError.name,
        errors: validationError.errors
      });
      throw new Error(`Notification validation failed: ${validationError.message}`);
    }
    
    console.log('Notification validation passed, saving...');
    await notification.save();
    console.log('Notification saved successfully:', notification._id);
    console.log('Saved notification details:', {
      id: notification._id,
      type: notification.type,
      recipient: notification.recipient,
      title: notification.title,
      message: notification.message,
      isActive: notification.isActive,
      isRead: notification.isRead,
      data: notification.data
    });
    
    // Populate sender info for real-time sending (only if sender exists)
    if (data.sender) {
      try {
        await notification.populate('sender', 'username profile.displayName profile.avatar');
        console.log('Sender populated successfully');
      } catch (populateError) {
        console.error('Error populating sender:', populateError);
      }
    }
    
    return notification;
  } catch (error) {
    console.error('Error in createNotification:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    throw new Error(`Failed to create notification: ${error.message}`);
  }
};

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
