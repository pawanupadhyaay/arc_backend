const express = require('express');
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');
const RosterInvite = require('../models/RosterInvite');
const StaffInvite = require('../models/StaffInvite');
const User = require('../models/User');

const router = express.Router();

// Get user's notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { isRead } = req.query;

    console.log('Fetching notifications for user:', userId);
    console.log('Filter params:', { page, limit, skip, isRead });

    const filter = { recipient: userId, isActive: true };
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    console.log('Notification filter:', filter);

    const notifications = await Notification.find(filter)
      .populate('sender', 'username profile.displayName profile.avatar')
      .populate('data.postId', 'content.text')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log('Found notifications:', notifications.length);
    console.log('Notification details:', notifications.map(n => ({
      id: n._id,
      type: n.type,
      title: n.title,
      recipient: n.recipient,
      isRead: n.isRead,
      isActive: n.isActive
    })));
    
    // Debug: Check specifically for staff_invite notifications
    const staffInviteNotifications = notifications.filter(n => n.type === 'staff_invite');
    console.log('Staff invite notifications found:', staffInviteNotifications.length);
    console.log('Staff invite notification details:', staffInviteNotifications.map(n => ({
      id: n._id,
      type: n.type,
      title: n.title,
      recipient: n.recipient,
      isRead: n.isRead,
      isActive: n.isActive,
      data: n.data
    })));

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false, isActive: true });

    console.log('Total notifications:', total);
    console.log('Unread count:', unreadCount);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: notifications.length,
          totalNotifications: total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ _id: id, recipient: userId });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ _id: id, recipient: userId });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isActive = false;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// Accept roster invite through notification
const acceptRosterInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    console.log('Accepting roster invite - notification ID:', id, 'user ID:', userId);

    const notification = await Notification.findOne({ 
      _id: id, 
      recipient: userId, 
      type: 'roster_invite',
      isActive: true 
    });
    
    if (!notification) {
      console.log('Roster invite notification not found');
      return res.status(404).json({
        success: false,
        message: 'Roster invite notification not found'
      });
    }

    console.log('Found roster invite notification:', notification._id);
    console.log('Notification data:', notification.data);

    const rosterInvite = await RosterInvite.findById(notification.data.rosterInviteId);
    if (!rosterInvite || rosterInvite.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Roster invite is no longer valid'
      });
    }

    // Update roster invite status
    rosterInvite.status = 'accepted';
    await rosterInvite.save();

    // Add player to team roster
    const team = await User.findById(rosterInvite.team);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Find or create roster for the game
    let roster = team.teamInfo.rosters.find(r => r.game === rosterInvite.game);
    if (!roster) {
      roster = {
        game: rosterInvite.game,
        players: []
      };
      team.teamInfo.rosters.push(roster);
    }

    // Add player to roster
    roster.players.push({
      user: userId,
      role: rosterInvite.role,
      inGameName: rosterInvite.inGameName,
      joinedAt: new Date()
    });

    // Add team to player's joined teams
    const player = await User.findById(userId);
    if (player) {
      // Ensure playerInfo and joinedTeams exist
      if (!player.playerInfo) {
        player.playerInfo = {};
      }
      if (!player.playerInfo.joinedTeams) {
        player.playerInfo.joinedTeams = [];
      }
      
      // Check if player is already in this team for this game
      const existingMembership = player.playerInfo.joinedTeams.find(
        membership => membership.team.toString() === rosterInvite.team.toString() && 
                     membership.game === rosterInvite.game
      );
      
      if (!existingMembership) {
        // Add new team membership
        player.playerInfo.joinedTeams.push({
          team: rosterInvite.team,
          game: rosterInvite.game,
          role: rosterInvite.role,
          inGameName: rosterInvite.inGameName,
          joinedAt: new Date(),
          leftAt: null,
          isActive: true
        });
      } else {
        // Update existing membership if it was inactive
        existingMembership.isActive = true;
        existingMembership.leftAt = null;
        existingMembership.role = rosterInvite.role;
        existingMembership.inGameName = rosterInvite.inGameName;
      }
      await player.save();
    }

    await team.save();

    // Mark notification as read and deactivate
    notification.isRead = true;
    notification.isActive = false;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Roster invite accepted successfully'
    });

  } catch (error) {
    console.error('Error accepting roster invite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept roster invite',
      error: error.message
    });
  }
};

// Decline roster invite through notification
const declineRosterInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ 
      _id: id, 
      recipient: userId, 
      type: 'roster_invite',
      isActive: true 
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Roster invite notification not found'
      });
    }

    const rosterInvite = await RosterInvite.findById(notification.data.rosterInviteId);
    if (rosterInvite) {
      rosterInvite.status = 'declined';
      await rosterInvite.save();
    }

    // Mark notification as read and deactivate
    notification.isRead = true;
    notification.isActive = false;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Roster invite declined'
    });

  } catch (error) {
    console.error('Error declining roster invite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline roster invite',
      error: error.message
    });
  }
};

// Accept staff invite through notification
const acceptStaffInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    console.log('Accepting staff invite - notification ID:', id, 'user ID:', userId);

    const notification = await Notification.findOne({ 
      _id: id, 
      recipient: userId, 
      type: 'staff_invite',
      isActive: true 
    });
    
    if (!notification) {
      console.log('Staff invite notification not found');
      return res.status(404).json({
        success: false,
        message: 'Staff invite notification not found'
      });
    }

    console.log('Found staff invite notification:', notification._id);
    console.log('Notification data:', notification.data);

    const staffInvite = await StaffInvite.findById(notification.data.staffInviteId);
    if (!staffInvite || staffInvite.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Staff invite is no longer valid'
      });
    }

    // Update staff invite status
    staffInvite.status = 'accepted';
    await staffInvite.save();

    // Add member to team staff
    const team = await User.findById(staffInvite.team);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Add member to staff
    team.teamInfo.staff.push({
      user: userId,
      role: staffInvite.role,
      joinedAt: new Date()
    });

    await team.save();

    // Add team to player's joined teams (for staff members)
    const player = await User.findById(userId);
    if (player) {
      console.log('Player found for staff invite acceptance:', player.username);
      
      // Ensure playerInfo and joinedTeams exist
      if (!player.playerInfo) {
        player.playerInfo = {};
      }
      if (!player.playerInfo.joinedTeams) {
        player.playerInfo.joinedTeams = [];
      }
      
      console.log('Player joinedTeams before update:', player.playerInfo.joinedTeams.length);
      console.log('Current joinedTeams:', JSON.stringify(player.playerInfo.joinedTeams, null, 2));
      
      // Check if player is already in this team as staff
      const existingMembership = player.playerInfo.joinedTeams.find(
        membership => membership.team.toString() === staffInvite.team.toString() && 
                     membership.game === 'Staff' // Staff members have game as 'Staff'
      );
      
      if (!existingMembership) {
        console.log('Adding new staff membership to player');
        // Add new team membership for staff
        player.playerInfo.joinedTeams.push({
          team: staffInvite.team,
          game: 'Staff',
          role: staffInvite.role,
          inGameName: null,
          joinedAt: new Date(),
          leftAt: null,
          isActive: true
        });
      } else {
        console.log('Updating existing staff membership');
        // Update existing membership if it was inactive
        existingMembership.isActive = true;
        existingMembership.leftAt = null;
        existingMembership.role = staffInvite.role;
      }
      
      await player.save();
      console.log('Player saved successfully');
      console.log('Player joinedTeams after update:', player.playerInfo.joinedTeams.length);
      console.log('Updated joinedTeams:', JSON.stringify(player.playerInfo.joinedTeams, null, 2));
    } else {
      console.log('Player not found for staff invite acceptance');
    }

    // Mark notification as read and deactivate
    notification.isRead = true;
    notification.isActive = false;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Staff invite accepted successfully'
    });

  } catch (error) {
    console.error('Error accepting staff invite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept staff invite',
      error: error.message
    });
  }
};

// Decline staff invite through notification
const declineStaffInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({ 
      _id: id, 
      recipient: userId, 
      type: 'staff_invite',
      isActive: true 
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Staff invite notification not found'
      });
    }

    const staffInvite = await StaffInvite.findById(notification.data.staffInviteId);
    if (staffInvite) {
      staffInvite.status = 'declined';
      await staffInvite.save();
    }

    // Mark notification as read and deactivate
    notification.isRead = true;
    notification.isActive = false;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Staff invite declined'
    });

  } catch (error) {
    console.error('Error declining staff invite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline staff invite',
      error: error.message
    });
  }
};

// Routes
router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);
router.put('/:id/accept-roster', protect, acceptRosterInvite);
router.put('/:id/decline-roster', protect, declineRosterInvite);
router.put('/:id/accept-staff', protect, acceptStaffInvite);
router.put('/:id/decline-staff', protect, declineStaffInvite);

module.exports = router;
