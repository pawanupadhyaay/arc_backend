let ioInstance = null;

// Function to set the io instance (called from server.js)
const setIoInstance = (io) => {
  ioInstance = io;
};

// Function to emit notification to a specific user
const emitNotification = (recipientId, notification) => {
  try {
    if (!ioInstance) {
      console.log('Socket.IO instance not available, notification will be fetched on next poll');
      return;
    }
    
    console.log('Emitting notification to user:', recipientId);
    console.log('Notification data:', {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message
    });
    
    ioInstance.to(`user-${recipientId}`).emit('new-notification', notification);
    console.log('Notification emitted successfully');
  } catch (error) {
    console.error('Error emitting notification:', error);
  }
};

// Function to emit notification to multiple users
const emitNotificationToMultiple = (recipientIds, notification) => {
  try {
    if (!ioInstance) {
      console.log('Socket.IO instance not available, notifications will be fetched on next poll');
      return;
    }
    
    console.log('Emitting notification to multiple users:', recipientIds.length);
    
    recipientIds.forEach(recipientId => {
      ioInstance.to(`user-${recipientId}`).emit('new-notification', notification);
    });
    
    console.log('Notifications emitted to all recipients');
  } catch (error) {
    console.error('Error emitting notifications to multiple users:', error);
  }
};

module.exports = {
  emitNotification,
  emitNotificationToMultiple,
  setIoInstance
};
