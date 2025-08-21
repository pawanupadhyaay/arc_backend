import React, { useState, useEffect } from 'react';
import { Bell, X, User, Heart, MessageCircle, AtSign } from 'lucide-react';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'follow' | 'like' | 'comment' | 'mention' | 'message';
  isRead: boolean;
  actionRequired?: boolean;
  sender?: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  data?: {
    messageId?: string;
    postId?: string;
    teamId?: string;
  };
  createdAt: string;
}

const NotificationDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeSection, setActiveSection] = useState<'all' | 'invites' | 'social'>('all');
  const { socket } = useSocket();

  useEffect(() => {
    fetchNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time notifications
  useEffect(() => {
    if (socket) {
      socket.on('new-notification', (newNotification: Notification) => {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        socket.off('new-notification');
      };
    }
  }, [socket]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest('.notification-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications');
      
      const fetchedNotifications = response.data.data?.notifications || [];
      
      setNotifications(fetchedNotifications);
      setUnreadCount(response.data.data?.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };



  const markAllAsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(notification => notification._id !== notificationId));
      if (!notifications.find(n => n._id === notificationId)?.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };



  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      case 'mention':
        return <AtSign className="h-4 w-4 text-purple-500" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-primary-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'follow':
        return 'New Follower';
      case 'like':
        return 'Post Liked';
      case 'comment':
        return 'New Comment';
      case 'mention':
        return 'Mentioned You';
      case 'message':
        return 'New Message';
      default:
        return 'Notification';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Filter notifications based on active section
  const filteredNotifications = notifications.filter(notification => {
    if (activeSection === 'all') return true;
    if (activeSection === 'invites') {
      return notification.type === 'message';
    }
    if (activeSection === 'social') {
      return notification.type === 'follow' || notification.type === 'like' || notification.type === 'comment' || notification.type === 'mention';
    }
    return true;
  });

  // Group notifications by type for better organization
  const messageNotifications = filteredNotifications.filter(n => n.type === 'message');
  const socialNotifications = filteredNotifications.filter(n => n.type === 'follow' || n.type === 'like' || n.type === 'comment' || n.type === 'mention');

  return (
    <div className="relative notification-dropdown">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className="relative p-2 text-secondary-400 hover:text-white transition-colors duration-300"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-2xl shadow-2xl z-50 max-h-96 overflow-hidden">

          
          {/* Header */}
          <div className="p-4 border-b border-secondary-800/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Section Tabs */}
            <div className="flex space-x-1 bg-secondary-900/50 rounded-xl p-1">
              <button
                onClick={() => setActiveSection('all')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeSection === 'all'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-secondary-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveSection('invites')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeSection === 'invites'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-secondary-400 hover:text-white'
                }`}
              >
                Messages
              </button>
              <button
                onClick={() => setActiveSection('social')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeSection === 'social'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-secondary-400 hover:text-white'
                }`}
              >
                Social
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
                <p className="text-secondary-400 text-sm mt-2">Loading...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-12 w-12 text-secondary-600 mx-auto mb-3" />
                <p className="text-secondary-400 text-sm">No notifications</p>
              </div>
            ) : (
              <div className="p-2">
                {/* Message Notifications Section */}
                {(activeSection === 'all' || activeSection === 'invites') && messageNotifications.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-secondary-400 uppercase tracking-wider">
                      Messages
                    </div>
                    {messageNotifications.map((notification: Notification) => (
                      <div
                        key={notification._id}
                        className={`mb-2 p-3 rounded-xl transition-all duration-300 ${
                          notification.isRead
                            ? 'bg-secondary-800/30'
                            : 'bg-primary-500/10 border border-primary-500/20'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-white">
                                {getNotificationTypeLabel(notification.type)}
                              </p>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-secondary-400">
                                  {formatTimeAgo(notification.createdAt)}
                                </span>
                                <button
                                  onClick={() => deleteNotification(notification._id)}
                                  className="text-secondary-500 hover:text-red-400 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-secondary-300 mt-1">
                              {notification.message}
                            </p>
                            
                            {/* Message action - navigate to messages */}
                            {notification.type === 'message' && (
                              <div className="mt-3">
                                <button
                                  onClick={() => {
                                    // Navigate to messages page
                                    window.location.href = '/messages';
                                  }}
                                  className="flex items-center space-x-1 px-3 py-1.5 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg hover:bg-primary-500/30 transition-colors text-xs"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  <span>View Message</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Social Notifications Section */}
                {(activeSection === 'all' || activeSection === 'social') && socialNotifications.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-secondary-400 uppercase tracking-wider">
                      Social Activity
                    </div>
                    {socialNotifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`mb-2 p-3 rounded-xl transition-all duration-300 ${
                          notification.isRead
                            ? 'bg-secondary-800/30'
                            : 'bg-primary-500/10 border border-primary-500/20'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-white">
                                {getNotificationTypeLabel(notification.type)}
                              </p>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-secondary-400">
                                  {formatTimeAgo(notification.createdAt)}
                                </span>
                                <button
                                  onClick={() => deleteNotification(notification._id)}
                                  className="text-secondary-500 hover:text-red-400 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-secondary-300 mt-1">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show all notifications when not in section view */}
                {activeSection !== 'all' && filteredNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`mb-2 p-3 rounded-xl transition-all duration-300 ${
                      notification.isRead
                        ? 'bg-secondary-800/30'
                        : 'bg-primary-500/10 border border-primary-500/20'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white">
                            {getNotificationTypeLabel(notification.type)}
                          </p>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-secondary-400">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            <button
                              onClick={() => deleteNotification(notification._id)}
                              className="text-secondary-500 hover:text-red-400 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-secondary-300 mt-1">
                          {notification.message}
                        </p>
                        
                        {/* Message action - navigate to messages */}
                        {notification.type === 'message' && (
                          <div className="mt-3">
                            <button
                              onClick={() => {
                                // Navigate to messages page
                                window.location.href = '/messages';
                              }}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg hover:bg-primary-500/30 transition-colors text-xs"
                            >
                              <MessageCircle className="h-3 w-3" />
                              <span>View Message</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
