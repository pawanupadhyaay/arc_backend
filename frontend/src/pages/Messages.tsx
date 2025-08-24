import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Send, Plus, Search, X, Users, MessageCircle, Settings, UserPlus, Hash } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface Chat {
  _id: string;
  participants: {
    _id: string;
    username?: string;
    profilePicture?: string;
    role?: 'player' | 'team';
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  }[];
  lastMessage?: {
    content: string | {
      text: string;
      media?: Array<{
        type: 'image' | 'video';
        url: string;
        publicId: string;
      }>;
    };
    sender: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface Group {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  creator: {
    _id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  };
  members: Array<{
    user: {
      _id: string;
      username: string;
      profile?: {
        displayName?: string;
        avatar?: string;
      };
    };
    role: 'admin' | 'member';
    joinedAt: string;
  }>;
  memberCount: number;
  lastMessage?: {
    content: string | {
      text: string;
      media?: Array<{
        type: 'image' | 'video';
        url: string;
        publicId: string;
      }>;
    };
    sender: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface Message {
  _id: string;
  content: {
    text: string;
    media?: Array<{
      type: 'image' | 'video';
      url: string;
      publicId: string;
    }>;
  };
  sender: {
    _id: string;
    username: string;
    profilePicture?: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  };
  createdAt: string;
  inviteData?: {
    type: 'roster' | 'staff';
    inviteId: string;
    teamId: string;
    game?: string;
    role?: string;
    inGameName?: string;
    message?: string;
  };
}

interface User {
  _id: string;
  username: string;
  profilePicture?: string;
  profile?: {
    avatar?: string;
    displayName?: string;
  };
  role?: 'player' | 'team';
  userType?: 'player' | 'team';
}

const Messages: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<'dm' | 'groups'>('dm');
  
  // DM State
  const [dmChats, setDmChats] = useState<Chat[]>([]);
  const [selectedDmChat, setSelectedDmChat] = useState<Chat | null>(null);
  
  // Groups State
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Shared State
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // Group Creation State
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: ''
  });
  const [groupSettingsForm, setGroupSettingsForm] = useState({
    name: '',
    description: ''
  });
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<User[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [groupSettingsMemberSearchQuery, setGroupSettingsMemberSearchQuery] = useState('');
  const [groupSettingsMemberSearchResults, setGroupSettingsMemberSearchResults] = useState<User[]>([]);
  const [groupSettingsMemberSearching, setGroupSettingsMemberSearching] = useState(false);

  useEffect(() => {
    if (activeSection === 'dm') {
      fetchDmChats();
    } else {
      fetchGroups();
    }
  }, [activeSection]);

  useEffect(() => {
    if (selectedDmChat) {
      fetchDmMessages(selectedDmChat._id);
    } else if (selectedGroup) {
      fetchGroupMessages(selectedGroup._id);
    }
  }, [selectedDmChat, selectedGroup]);

  useEffect(() => {
    if (socket) {
      socket.on('newMessage', (data: { chatId: string; message: Message }) => {
        // Update messages if this chat is currently selected
        if ((selectedDmChat && data.chatId === selectedDmChat._id) || 
            (selectedGroup && data.chatId === selectedGroup._id)) {
          setMessages(prev => [...prev, data.message]);
        }
        
        // Update chat/group list to show new message
        if (activeSection === 'dm') {
          setDmChats(prev => prev.map(chat => {
            if (chat._id === data.chatId) {
              return {
                ...chat,
                lastMessage: {
                  content: data.message.content,
                  sender: data.message.sender._id,
                  createdAt: data.message.createdAt
                },
                unreadCount: chat.unreadCount + (selectedDmChat?._id === data.chatId ? 0 : 1)
              };
            }
            return chat;
          }));
        } else {
          setGroups(prev => prev.map(group => {
            if (group._id === data.chatId) {
              return {
                ...group,
                lastMessage: {
                  content: data.message.content,
                  sender: data.message.sender._id,
                  createdAt: data.message.createdAt
                },
                unreadCount: group.unreadCount + (selectedGroup?._id === data.chatId ? 0 : 1)
              };
            }
            return group;
          }));
        }
      });

      return () => {
        socket.off('newMessage');
      };
    }
  }, [socket, selectedDmChat, selectedGroup, activeSection]);

  const fetchDmChats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/messages/recent');
      if (response.data.success && response.data.data?.conversations) {
        setDmChats(response.data.data.conversations);
      } else {
        setDmChats([]);
      }
    } catch (error) {
      console.error('Error fetching DM chats:', error);
      setDmChats([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/messages/rooms');
      if (response.data.success && response.data.chatRooms) {
        setGroups(response.data.chatRooms);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDmMessages = async (chatId: string) => {
    try {
      const userId = chatId.replace('direct_', '');
      const response = await axios.get(`/api/messages/direct/${userId}`);
      if (response.data.success) {
        const messages = response.data.messages || response.data.data?.messages || [];
        setMessages(messages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching DM messages:', error);
      setMessages([]);
    }
  };

  const fetchGroupMessages = async (groupId: string) => {
    try {
      const response = await axios.get(`/api/messages/rooms/${groupId}`);
      if (response.data.success) {
        const messages = response.data.messages || response.data.data?.messages || [];
        setMessages(messages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching group messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      if (activeSection === 'dm' && selectedDmChat) {
        const userId = selectedDmChat._id.replace('direct_', '');
        const response = await axios.post('/api/messages/direct', {
          recipientId: userId,
          text: messageText
        });
        
        const newMessageData = response.data.data.message;
        setMessages(prev => [...prev, newMessageData]);
        
        // Update chat list
        setDmChats(prev => prev.map(chat => {
          if (chat._id === selectedDmChat._id) {
            return {
              ...chat,
              lastMessage: {
                content: newMessageData.content,
                sender: newMessageData.sender._id,
                createdAt: newMessageData.createdAt
              },
              unreadCount: 0
            };
          }
          return chat;
        }));
      } else if (activeSection === 'groups' && selectedGroup) {
        const response = await axios.post('/api/messages/group', {
          chatRoomId: selectedGroup._id,
          text: messageText
        });
        
        const newMessageData = response.data.data.message;
        setMessages(prev => [...prev, newMessageData]);
        
        // Update group list
        setGroups(prev => prev.map(group => {
          if (group._id === selectedGroup._id) {
            return {
              ...group,
              lastMessage: {
                content: newMessageData.content,
                sender: newMessageData.sender._id,
                createdAt: newMessageData.createdAt
              },
              unreadCount: 0
            };
          }
          return group;
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText);
    }
  };

  // Handle invite response (accept/decline)
  const handleInviteResponse = async (messageId: string, response: 'accept' | 'decline') => {
    try {
      const result = await axios.post(`/api/messages/${messageId}/invite-response`, {
        response
      });
      
      if (result.data.success) {
        // Add the response message to the conversation
        if (result.data.data.responseMessage) {
          setMessages(prev => [...prev, result.data.data.responseMessage]);
        }
        
        // Show success message
        console.log(`Invitation ${response}d successfully`);
      }
    } catch (error) {
      console.error('Error responding to invite:', error);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    try {
      const memberIds = selectedMembers.map(member => member._id);
      
      const response = await axios.post('/api/messages/rooms', {
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        memberIds: memberIds
      });

      if (response.data.success) {
        const newGroup = response.data.data.chatRoom;
        setGroups(prev => [newGroup, ...prev]);
        setShowCreateGroup(false);
        setGroupForm({ name: '', description: '' });
        setSelectedMembers([]);
        setMemberSearchQuery('');
        setMemberSearchResults([]);
        setActiveSection('groups');
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await axios.get(`/api/users?search=${encodeURIComponent(query)}`);
      setSearchResults(response.data.data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const searchMembers = async (query: string) => {
    if (!query.trim()) {
      setMemberSearchResults([]);
      return;
    }

    setMemberSearching(true);
    try {
      const url = `/api/users?search=${encodeURIComponent(query)}`;
      console.log('Making API call to:', url);
      const response = await axios.get(url);
      console.log('Search response:', response.data);
      // Filter out current user and already selected members
      console.log('Current user ID:', user?._id);
      console.log('All users from search:', response.data.data.users);
      console.log('Selected members:', selectedMembers);
      
      const filteredUsers = response.data.data.users.filter((searchedUser: User) => {
        const isNotCurrentUser = searchedUser._id !== user?._id;
        const isNotAlreadySelected = !selectedMembers.some(selected => selected._id === searchedUser._id);
        console.log(`User ${searchedUser.username}: isNotCurrentUser=${isNotCurrentUser}, isNotAlreadySelected=${isNotAlreadySelected}`);
        return isNotCurrentUser && isNotAlreadySelected;
      });
      console.log('Filtered users:', filteredUsers);
      setMemberSearchResults(filteredUsers || []);
      console.log('Setting member search results to:', filteredUsers || []);
    } catch (error) {
      console.error('Error searching members:', error);
      setMemberSearchResults([]);
    } finally {
      setMemberSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if ((window as any).searchTimeout) {
      clearTimeout((window as any).searchTimeout);
    }
    
    (window as any).searchTimeout = setTimeout(() => {
      searchUsers(query);
    }, 300);
  };

  const handleMemberSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    console.log('Search query:', query);
    setMemberSearchQuery(query);
    
    if ((window as any).memberSearchTimeout) {
      clearTimeout((window as any).memberSearchTimeout);
    }
    
    (window as any).memberSearchTimeout = setTimeout(() => {
      searchMembers(query);
    }, 300);
  };

  const handleMemberSelect = (member: User) => {
    console.log('Selecting member:', member);
    setSelectedMembers(prev => {
      const newMembers = [...prev, member];
      console.log('Updated selected members:', newMembers);
      return newMembers;
    });
    console.log('Clearing search query and results');
    setMemberSearchQuery('');
    setMemberSearchResults([]);
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(member => member._id !== memberId));
  };

  const openGroupSettings = (group: Group) => {
    setGroupSettingsForm({
      name: group.name,
      description: group.description || ''
    });
    setShowGroupSettings(true);
  };

  const searchGroupSettingsMembers = async (query: string) => {
    if (!query.trim()) {
      setGroupSettingsMemberSearchResults([]);
      return;
    }

    setGroupSettingsMemberSearching(true);
    try {
      const response = await axios.get(`/api/users?search=${encodeURIComponent(query)}`);
      // Filter out current user and already existing members
      const filteredUsers = response.data.data.users.filter((searchedUser: User) => 
        searchedUser._id !== user?._id && 
        !selectedGroup?.members.some(member => member.user._id === searchedUser._id)
      );
      setGroupSettingsMemberSearchResults(filteredUsers || []);
    } catch (error) {
      console.error('Error searching members for group settings:', error);
      setGroupSettingsMemberSearchResults([]);
    } finally {
      setGroupSettingsMemberSearching(false);
    }
  };

  const handleGroupSettingsMemberSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setGroupSettingsMemberSearchQuery(query);
    
    if ((window as any).groupSettingsMemberSearchTimeout) {
      clearTimeout((window as any).groupSettingsMemberSearchTimeout);
    }
    
    (window as any).groupSettingsMemberSearchTimeout = setTimeout(() => {
      searchGroupSettingsMembers(query);
    }, 300);
  };

  const addMemberToGroup = async (member: User) => {
    if (!selectedGroup) return;

    try {
      const response = await axios.post(`/api/messages/rooms/${selectedGroup._id}/members`, {
        memberId: member._id
      });

      if (response.data.success) {
        // Update the selected group with new member
        const updatedGroup = response.data.data.chatRoom;
        setSelectedGroup(updatedGroup);
        
        // Update groups list
        setGroups(prev => prev.map(group => 
          group._id === selectedGroup._id ? updatedGroup : group
        ));

        setGroupSettingsMemberSearchQuery('');
        setGroupSettingsMemberSearchResults([]);
      }
    } catch (error) {
      console.error('Error adding member to group:', error);
    }
  };

  const removeMemberFromGroup = async (memberId: string) => {
    if (!selectedGroup) return;

    try {
      const response = await axios.delete(`/api/messages/rooms/${selectedGroup._id}/members/${memberId}`);

      if (response.data.success) {
        // Update the selected group
        const updatedGroup = response.data.data.chatRoom;
        setSelectedGroup(updatedGroup);
        
        // Update groups list
        setGroups(prev => prev.map(group => 
          group._id === selectedGroup._id ? updatedGroup : group
        ));
      }
    } catch (error) {
      console.error('Error removing member from group:', error);
    }
  };

  const updateGroupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    try {
      const response = await axios.put(`/api/messages/rooms/${selectedGroup._id}`, {
        name: groupSettingsForm.name.trim(),
        description: groupSettingsForm.description.trim()
      });

      if (response.data.success) {
        const updatedGroup = response.data.data.chatRoom;
        setSelectedGroup(updatedGroup);
        
        // Update groups list
        setGroups(prev => prev.map(group => 
          group._id === selectedGroup._id ? updatedGroup : group
        ));

        setShowGroupSettings(false);
      }
    } catch (error) {
      console.error('Error updating group settings:', error);
    }
  };

  const handleUserSelect = (selectedUser: User) => {
    const newChat: Chat = {
      _id: `direct_${selectedUser._id}`,
      participants: [{
        _id: selectedUser._id,
        username: selectedUser.username || selectedUser.profile?.displayName,
        profilePicture: selectedUser.profilePicture || selectedUser.profile?.avatar,
        role: selectedUser.role || selectedUser.userType
      }],
      lastMessage: null,
      unreadCount: 0
    };
    
    setDmChats(prev => [newChat, ...prev]);
    setSelectedDmChat(newChat);
    setActiveSection('dm');
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const getOtherParticipant = (chat: Chat) => {
    if (!user?._id || !chat?.participants || !Array.isArray(chat.participants)) return null;
    const participant = chat.participants.find(p => p && p._id && p._id !== user._id);
    if (!participant) return null;
    
    return {
      ...participant,
      username: participant.username || participant.profile?.displayName || 'Unknown User'
    };
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDisplayName = (user: any) => {
    return user.profile?.displayName || user.username || 'Unknown User';
  };

  const getProfilePicture = (user: any) => {
    return user.profile?.avatar || user.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzNzM3M0EiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTcuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM2QjZCNkIiLz4KPHBhdGggZD0iTTI4IDMwQzI4IDI2LjY4NjMgMjQuNDE4MyAyNCAyMCAyNEMxNS41ODE3IDI0IDEyIDI2LjY4NjMgMTIgMzBIMjhaIiBmaWxsPSIjNkI2QjZCIi8+Cjwvc3ZnPgo=';
  };

  const isGroupAdmin = (group: Group) => {
    return group.creator._id === user?._id || 
           group.members.some(member => member.user._id === user?._id && member.role === 'admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark pt-24">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-secondary-800 rounded w-1/4 mb-6 shimmer"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-96 bg-secondary-800 rounded-xl shimmer"></div>
              <div className="md:col-span-2 h-96 bg-secondary-800 rounded-xl shimmer"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-dark pt-24">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Messages</h1>
            <p className="text-secondary-400">Please log in to view messages.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark pt-24">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-120px)]">
        <div className="grid md:grid-cols-3 gap-6 h-full">
          {/* Chat List */}
          <div className="bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-3xl p-6 shadow-large flex flex-col">
            {/* Section Tabs */}
            <div className="flex mb-6 bg-secondary-900/50 rounded-2xl p-1">
              <button
                onClick={() => {
                  setActiveSection('dm');
                  setSelectedDmChat(null);
                  setSelectedGroup(null);
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 font-semibold flex-1 ${
                  activeSection === 'dm'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                    : 'text-secondary-400 hover:text-white hover:bg-secondary-800/50'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                <span>DM</span>
              </button>
              <button
                onClick={() => {
                  setActiveSection('groups');
                  setSelectedDmChat(null);
                  setSelectedGroup(null);
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 font-semibold flex-1 ${
                  activeSection === 'groups'
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                    : 'text-secondary-400 hover:text-white hover:bg-secondary-800/50'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Groups</span>
              </button>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">
                {activeSection === 'dm' ? 'Direct Messages' : 'Groups'}
              </h2>
              <div className="flex space-x-2">
                {activeSection === 'dm' && (
                  <button 
                    onClick={() => setShowSearch(!showSearch)}
                    className="p-2 hover:bg-secondary-800/50 rounded-lg transition-colors"
                    title="Search users"
                  >
                    <Search className="h-4 w-4 text-secondary-300" />
                  </button>
                )}
                {activeSection === 'groups' && (
                  <button 
                    onClick={() => setShowCreateGroup(true)}
                    className="p-2 hover:bg-secondary-800/50 rounded-lg transition-colors"
                    title="Create group"
                  >
                    <Plus className="h-4 w-4 text-secondary-300" />
                  </button>
                )}
              </div>
            </div>

            {/* User Search (DM Section) */}
            {activeSection === 'dm' && showSearch && (
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search users by username..."
                    className="w-full bg-secondary-900/50 border border-secondary-700/50 rounded-xl px-4 py-3 text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-300 pr-10"
                  />
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-secondary-800/50 rounded"
                  >
                    <X className="h-4 w-4 text-secondary-400" />
                  </button>
                </div>
                
                {searching && (
                  <div className="mt-2 text-center text-sm text-secondary-400">
                    Searching...
                  </div>
                )}
                
                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user._id}
                        onClick={() => handleUserSelect(user)}
                        className="w-full p-2 hover:bg-secondary-800/50 rounded-lg text-left flex items-center space-x-3"
                      >
                        <img
                          src={getProfilePicture(user)}
                          alt={getDisplayName(user)}
                          className="w-8 h-8 rounded-lg object-cover border-2 border-secondary-700"
                        />
                        <div>
                          <p className="font-medium text-sm text-white">{getDisplayName(user)}</p>
                          <p className="text-xs text-secondary-400 capitalize">{user.role || user.userType}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {searchQuery && !searching && searchResults.length === 0 && (
                  <div className="mt-2 text-center text-sm text-secondary-400">
                    No users found
                  </div>
                )}
              </div>
            )}

            {/* Chat/Group List */}
            <div className="space-y-2 flex-1 overflow-y-auto">
              {activeSection === 'dm' ? (
                // DM Chats
                dmChats.length > 0 ? (
                  dmChats.map((chat) => {
                    const otherUser = getOtherParticipant(chat);
                    if (!otherUser) return null;
                    
                    return (
                      <button
                        key={chat._id}
                        onClick={() => {
                          setSelectedDmChat(chat);
                          setSelectedGroup(null);
                        }}
                        className={`w-full p-3 rounded-xl text-left transition-all duration-300 ${
                          selectedDmChat?._id === chat._id
                            ? 'bg-gradient-to-r from-primary-500/20 to-primary-600/20 border border-primary-500/30 text-primary-300 shadow-glow'
                            : 'hover:bg-secondary-800/50 text-secondary-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={getProfilePicture(otherUser)}
                            alt={otherUser.username}
                            className="w-10 h-10 rounded-xl object-cover border-2 border-secondary-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-white truncate">
                                {otherUser.username}
                              </p>
                              {chat.unreadCount > 0 && (
                                <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                            {chat.lastMessage && (
                              <p className="text-sm text-secondary-400 truncate">
                                {typeof chat.lastMessage.content === 'string' 
                                  ? chat.lastMessage.content 
                                  : chat.lastMessage.content?.text || 'No message'}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  }).filter(Boolean)
                ) : (
                  <div className="text-center py-8 text-secondary-400">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-secondary-500" />
                    <p className="font-medium mb-2">No conversations yet</p>
                    <p className="text-sm">Start a conversation with someone!</p>
                    <button 
                      onClick={() => setShowSearch(true)}
                      className="mt-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-glow transition-all duration-300"
                    >
                      Search Users
                    </button>
                  </div>
                )
              ) : (
                // Groups
                groups.length > 0 ? (
                  groups.map((group) => (
                    <button
                      key={group._id}
                      onClick={() => {
                        setSelectedGroup(group);
                        setSelectedDmChat(null);
                      }}
                      className={`w-full p-3 rounded-xl text-left transition-all duration-300 ${
                        selectedGroup?._id === group._id
                          ? 'bg-gradient-to-r from-primary-500/20 to-primary-600/20 border border-primary-500/30 text-primary-300 shadow-glow'
                          : 'hover:bg-secondary-800/50 text-secondary-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-accent-500 to-primary-500 rounded-xl flex items-center justify-center">
                          <Hash className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-white truncate">
                              {group.name}
                            </p>
                            {group.unreadCount > 0 && (
                              <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                                {group.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-secondary-400 truncate">
                              {group.memberCount} members
                            </p>
                            {group.lastMessage && (
                              <>
                                <span className="text-secondary-500">•</span>
                                <p className="text-sm text-secondary-400 truncate">
                                  {typeof group.lastMessage.content === 'string' 
                                    ? group.lastMessage.content 
                                    : group.lastMessage.content?.text || 'No message'}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-secondary-400">
                    <Users className="h-12 w-12 mx-auto mb-4 text-secondary-500" />
                    <p className="font-medium mb-2">No groups yet</p>
                    <p className="text-sm">Create a group to start chatting!</p>
                    <button 
                      onClick={() => setShowCreateGroup(true)}
                      className="mt-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-glow transition-all duration-300"
                    >
                      Create Group
                    </button>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="md:col-span-2 bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-3xl p-6 shadow-large flex flex-col h-full min-h-0">
            {selectedDmChat || selectedGroup ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between pb-4 border-b border-secondary-700/50 mb-4">
                  <div className="flex items-center space-x-3">
                    {selectedDmChat ? (
                      // DM Header
                      (() => {
                        const otherUser = getOtherParticipant(selectedDmChat);
                        if (!otherUser) return <div className="text-secondary-400">User not found</div>;
                        
                        return (
                          <>
                            <img
                              src={getProfilePicture(otherUser)}
                              alt={otherUser.username}
                              className="w-10 h-10 rounded-xl object-cover border-2 border-secondary-700"
                            />
                            <div>
                              <h3 className="font-medium text-white">{otherUser.username}</h3>
                              <p className="text-sm text-secondary-400 capitalize">{otherUser.role}</p>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      // Group Header
                      selectedGroup && (
                        <>
                          <div className="w-10 h-10 bg-gradient-to-r from-accent-500 to-primary-500 rounded-xl flex items-center justify-center">
                            <Hash className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{selectedGroup.name}</h3>
                            <p className="text-sm text-secondary-400">{selectedGroup.memberCount} members</p>
                          </div>
                        </>
                      )
                    )}
                  </div>
                  
                  {/* Group Actions */}
                  {selectedGroup && isGroupAdmin(selectedGroup) && (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => openGroupSettings(selectedGroup)}
                        className="p-2 hover:bg-secondary-800/50 rounded-lg transition-colors"
                        title="Group Settings"
                      >
                        <Settings className="h-4 w-4 text-secondary-300" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
                  {messages.map((message) => {
                    const isOwn = message.sender._id === user._id;
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${
                            isOwn
                              ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-glow'
                              : 'bg-secondary-800/50 text-white border border-secondary-700/30'
                          }`}
                        >
                          {!isOwn && selectedGroup && (
                            <p className="text-xs text-secondary-400 mb-1 font-medium">
                              {getDisplayName(message.sender)}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.content.text}</p>
                          
                          {/* Invite response buttons */}
                          {!isOwn && message.inviteData && (
                            <div className="mt-3 flex space-x-2">
                              <button
                                onClick={() => handleInviteResponse(message._id, 'accept')}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleInviteResponse(message._id, 'decline')}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                          
                          <p className={`text-xs mt-1 ${
                            isOwn ? 'text-primary-100' : 'text-secondary-400'
                          }`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message Input */}
                <form onSubmit={sendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Type a message to ${selectedDmChat ? getOtherParticipant(selectedDmChat)?.username : selectedGroup?.name}...`}
                    className="flex-1 bg-secondary-900/50 border border-secondary-700/50 rounded-xl px-4 py-3 text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-300"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-3 rounded-xl font-semibold hover:shadow-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-secondary-400">
                <div className="text-center">
                  <div className="w-16 h-16 bg-secondary-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-secondary-700">
                    {activeSection === 'dm' ? (
                      <MessageCircle className="h-8 w-8 text-secondary-500" />
                    ) : (
                      <Users className="h-8 w-8 text-secondary-500" />
                    )}
                  </div>
                  <p className="text-lg font-medium mb-2">
                    Select a {activeSection === 'dm' ? 'conversation' : 'group'}
                  </p>
                  <p>Choose a {activeSection === 'dm' ? 'chat' : 'group'} from the list to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-3xl p-6 shadow-large w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Create Group</h3>
                <button
                  onClick={() => {
                    setShowCreateGroup(false);
                    setGroupForm({ name: '', description: '' });
                    setSelectedMembers([]);
                    setMemberSearchQuery('');
                    setMemberSearchResults([]);
                  }}
                  className="p-2 hover:bg-secondary-800/50 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-secondary-400" />
                </button>
              </div>
              
              <form onSubmit={createGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Group Name</label>
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter group name..."
                    className="w-full bg-secondary-900/50 border border-secondary-700/50 rounded-xl px-4 py-3 text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-300"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description (Optional)</label>
                  <textarea
                    value={groupForm.description}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter group description..."
                    rows={3}
                    className="w-full bg-secondary-900/50 border border-secondary-700/50 rounded-xl px-4 py-3 text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-300 resize-none"
                  />
                </div>

                {/* Member Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Add Members</label>
                  
                  {/* Member Search */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={handleMemberSearchChange}
                      placeholder="Search users to add..."
                      className="w-full bg-secondary-900/50 border border-secondary-700/50 rounded-xl px-4 py-3 text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-300"
                    />
                    {memberSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400">
                        Searching...
                      </div>
                    )}
                  </div>

                  {/* Search Results */}
                  <div className="text-xs text-secondary-500 mb-2">Debug: memberSearchResults length = {memberSearchResults.length}</div>
                  {memberSearchResults.length > 0 && (
                    <div className="mb-3 max-h-32 overflow-y-auto space-y-1">
                      <div className="text-xs text-secondary-400 mb-2">Found {memberSearchResults.length} users</div>
                      {memberSearchResults.map((member) => (
                        <button
                          key={member._id}
                          type="button"
                          onClick={() => {
                            console.log('Button clicked for member:', member);
                            handleMemberSelect(member);
                          }}
                          className="w-full p-2 hover:bg-secondary-800/50 rounded-lg text-left flex items-center space-x-3"
                        >
                          <img
                            src={getProfilePicture(member)}
                            alt={getDisplayName(member)}
                            className="w-6 h-6 rounded-lg object-cover border border-secondary-700"
                          />
                          <div>
                            <p className="font-medium text-sm text-white">{getDisplayName(member)}</p>
                            <p className="text-xs text-secondary-400 capitalize">{member.role || member.userType}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {memberSearchQuery && !memberSearching && memberSearchResults.length === 0 && (
                    <div className="text-sm text-secondary-400 text-center py-2">
                      No users found
                    </div>
                  )}

                  {/* Selected Members */}
                  {selectedMembers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-secondary-400">Selected Members ({selectedMembers.length}):</p>
                      <div className="text-xs text-secondary-500">Debug: {JSON.stringify(selectedMembers.map(m => m.username))}</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedMembers.map((member) => (
                          <div key={member._id} className="flex items-center justify-between p-2 bg-secondary-800/30 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <img
                                src={getProfilePicture(member)}
                                alt={getDisplayName(member)}
                                className="w-6 h-6 rounded-lg object-cover border border-secondary-700"
                              />
                              <div>
                                <p className="font-medium text-sm text-white">{getDisplayName(member)}</p>
                                <p className="text-xs text-secondary-400 capitalize">{member.role || member.userType}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMember(member._id)}
                              className="p-1 hover:bg-secondary-700/50 rounded transition-colors"
                            >
                              <X className="h-4 w-4 text-secondary-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateGroup(false);
                      setGroupForm({ name: '', description: '' });
                      setSelectedMembers([]);
                      setMemberSearchQuery('');
                      setMemberSearchResults([]);
                    }}
                    className="flex-1 bg-secondary-800/50 text-white px-4 py-3 rounded-xl font-semibold hover:bg-secondary-700/50 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-3 rounded-xl font-semibold hover:shadow-glow transition-all duration-300"
                  >
                    Create Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Group Settings Modal */}
        {showGroupSettings && selectedGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-3xl p-6 shadow-large w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Group Settings</h3>
                <button
                  onClick={() => {
                    setShowGroupSettings(false);
                    setGroupSettingsForm({ name: '', description: '' });
                    setGroupSettingsMemberSearchQuery('');
                    setGroupSettingsMemberSearchResults([]);
                  }}
                  className="p-2 hover:bg-secondary-800/50 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-secondary-400" />
                </button>
              </div>
              
              <form onSubmit={updateGroupSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Group Name</label>
                  <input
                    type="text"
                    value={groupSettingsForm.name}
                    onChange={(e) => setGroupSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter group name..."
                    className="w-full bg-secondary-900/50 border border-secondary-700/50 rounded-xl px-4 py-3 text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-300"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description (Optional)</label>
                  <textarea
                    value={groupSettingsForm.description}
                    onChange={(e) => setGroupSettingsForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter group description..."
                    rows={3}
                    className="w-full bg-secondary-900/50 border border-secondary-700/50 rounded-xl px-4 py-3 text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-300 resize-none"
                  />
                </div>

                {/* Current Members */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Current Members ({selectedGroup.members.length})</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedGroup.members.map((member) => (
                      <div key={member.user._id} className="flex items-center justify-between p-2 bg-secondary-800/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <img
                            src={getProfilePicture(member.user)}
                            alt={getDisplayName(member.user)}
                            className="w-6 h-6 rounded-lg object-cover border border-secondary-700"
                          />
                          <div>
                            <p className="font-medium text-sm text-white">{getDisplayName(member.user)}</p>
                            <p className="text-xs text-secondary-400 capitalize">{member.role}</p>
                          </div>
                        </div>
                        {isGroupAdmin(selectedGroup) && member.user._id !== user?._id && (
                          <button
                            type="button"
                            onClick={() => removeMemberFromGroup(member.user._id)}
                            className="p-1 hover:bg-secondary-700/50 rounded transition-colors"
                          >
                            <X className="h-4 w-4 text-secondary-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New Members */}
                {isGroupAdmin(selectedGroup) && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Add New Members</label>
                    
                    {/* Member Search */}
                    <div className="relative mb-3">
                      <input
                        type="text"
                        value={groupSettingsMemberSearchQuery}
                        onChange={handleGroupSettingsMemberSearchChange}
                        placeholder="Search users to add..."
                        className="w-full bg-secondary-900/50 border border-secondary-700/50 rounded-xl px-4 py-3 text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-300"
                      />
                      {groupSettingsMemberSearching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400">
                          Searching...
                        </div>
                      )}
                    </div>

                    {/* Search Results */}
                    {groupSettingsMemberSearchResults.length > 0 && (
                      <div className="mb-3 max-h-32 overflow-y-auto space-y-1">
                        {groupSettingsMemberSearchResults.map((member) => (
                          <button
                            key={member._id}
                            type="button"
                            onClick={() => addMemberToGroup(member)}
                            className="w-full p-2 hover:bg-secondary-800/50 rounded-lg text-left flex items-center space-x-3"
                          >
                            <img
                              src={getProfilePicture(member)}
                              alt={getDisplayName(member)}
                              className="w-6 h-6 rounded-lg object-cover border border-secondary-700"
                            />
                            <div>
                              <p className="font-medium text-sm text-white">{getDisplayName(member)}</p>
                              <p className="text-xs text-secondary-400 capitalize">{member.role || member.userType}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupSettings(false);
                      setGroupSettingsForm({ name: '', description: '' });
                      setGroupSettingsMemberSearchQuery('');
                      setGroupSettingsMemberSearchResults([]);
                    }}
                    className="flex-1 bg-secondary-800/50 text-white px-4 py-3 rounded-xl font-semibold hover:bg-secondary-700/50 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-3 rounded-xl font-semibold hover:shadow-glow transition-all duration-300"
                  >
                    Update Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
