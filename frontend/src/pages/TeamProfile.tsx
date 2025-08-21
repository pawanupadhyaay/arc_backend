import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  MapPin, 
  Calendar, 
  Mail, 
  Gamepad2, 
  Trophy, 
  Settings, 
  Edit, 
  Plus, 
  Heart, 
  MessageCircle, 
  Share2, 
  Crown,
  Star,
  Award,
  Target,
  Flame,
  Zap,
  Shield,
  UserCheck,
  UserPlus,
  Briefcase,
  Users2,
  GamepadIcon,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import AddPlayerModal from '../components/AddPlayerModal';

interface TeamUser {
  _id: string;
  username: string;
  email: string;
  profilePicture?: string;
  role?: 'player' | 'team';
  userType?: 'player' | 'team';
  profile?: {
    displayName?: string;
    avatar?: string;
    bio?: string;
    location?: string;
    gamingPreferences?: string[];
    socialLinks?: {
      discord?: string;
      steam?: string;
      twitch?: string;
    };
  };
  teamInfo?: {
    teamSize: number;
    recruitingFor: string[];
    requirements: string;
    teamType: string;
    members: Array<{
      user: {
        _id: string;
        username: string;
        profile?: {
          displayName?: string;
          avatar?: string;
        };
      };
      role: string;
      joinedAt: string;
    }>;
    rosters: Array<{
      game: string;
      players: Array<{
        user: {
          _id: string;
          username: string;
          profile?: {
            displayName?: string;
            avatar?: string;
          };
        };
        role: string;
        inGameName: string;
        joinedAt: string;
        leftAt?: string;
        isActive?: boolean;
      }>;
      isActive: boolean;
    }>;
    staff: Array<{
      user: {
        _id: string;
        username: string;
        profile?: {
          displayName?: string;
          avatar?: string;
        };
      };
      role: string;
      joinedAt: string;
      leftAt?: string;
      isActive?: boolean;
    }>;
  };
  followers?: string[];
  following?: string[];
  createdAt: string;
}

interface Post {
  _id: string;
  content: string | {
    text: string;
    media?: Array<{
      type: 'image' | 'video';
      url: string;
      publicId: string;
    }>;
  };
  author: {
    _id: string;
    username: string;
    profilePicture?: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  };
  likes: string[];
  comments: any[];
  createdAt: string;
  tags?: string[];
  media?: Array<{
    type: 'image' | 'video';
    url: string;
    publicId: string;
  }>;
}

const TeamProfile: React.FC = () => {
  const { id: teamId } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [team, setTeam] = useState<TeamUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'rosters' | 'staff' | 'about' | 'invites'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Modal states
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [pendingInvites, setPendingInvites] = useState<{
    rosterInvites: any[];
    staffInvites: any[];
  }>({ rosterInvites: [], staffInvites: [] });

  const isOwnProfile = currentUser?._id === teamId;

  useEffect(() => {
    if (teamId) {
      fetchTeamProfile();
      fetchTeamPosts();
      if (isOwnProfile) {
        fetchPendingInvites();
      }
    }
  }, [teamId, isOwnProfile]);

  const fetchTeamProfile = async () => {
    try {
      // Add cache-busting parameter to ensure fresh data
      const response = await axios.get(`/api/users/${teamId}?t=${Date.now()}`);
      const teamData = response.data.data?.user;
      
      if (!teamData) {
        console.error('No team data found in response');
        setLoading(false);
        return;
      }
      
      setTeam(teamData);
      
      // Check if current user is following this team
      if (currentUser && teamData.followers) {
        setIsFollowing(teamData.followers.includes(currentUser._id));
      }
      
      setFollowersCount(teamData.followers?.length || 0);
      setFollowingCount(teamData.following?.length || 0);
    } catch (error) {
      console.error('Error fetching team profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamPosts = async () => {
    try {
      // Add cache-busting parameter to ensure fresh data
      const response = await axios.get(`/api/users/${teamId}/posts?t=${Date.now()}`);
      setPosts(response.data.data?.posts || []);
    } catch (error: any) {
      console.error('Error fetching team posts:', error);
    }
  };

  const fetchPendingInvites = async () => {
    try {
      const response = await axios.get(`/api/users/${teamId}/pending-invites`);
      setPendingInvites(response.data.data);
    } catch (error) {
      console.error('Error fetching pending invites:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) return;

    try {
      if (isFollowing) {
        await axios.delete(`/api/users/${teamId}/follow`);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await axios.post(`/api/users/${teamId}/follow`);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await axios.post(`/api/posts/${postId}/like`);
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          const isLiked = post.likes.includes(currentUser?._id || '');
          return {
            ...post,
            likes: isLiked 
              ? post.likes.filter(id => id !== currentUser?._id)
              : [...post.likes, currentUser?._id || '']
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleRemovePlayer = async (game: string, playerId: string) => {
    try {
      await axios.delete(`/api/users/${teamId}/roster/${game}/${playerId}`);
      // Refresh team data
      fetchTeamProfile();
    } catch (error) {
      console.error('Error removing player:', error);
    }
  };

  const handleRemoveStaff = async (memberId: string) => {
    try {
      const response = await axios.delete(`/api/users/${teamId}/staff/${memberId}`);
      
      if (response.data.success) {
        // Show success message
        alert('Staff member removed successfully!');
        // Refresh team data
        fetchTeamProfile();
      }
    } catch (error: any) {
      console.error('Error removing staff member:', error);
      const errorMessage = error.response?.data?.message || 'Failed to remove staff member';
      alert(errorMessage);
    }
  };

  const handleAddPlayerSuccess = () => {
    fetchTeamProfile();
    fetchPendingInvites();
  };

  const handleAddStaffSuccess = () => {
    fetchTeamProfile();
    fetchPendingInvites();
  };

  const handleCancelInvite = async (inviteId: string, type: 'roster' | 'staff') => {
    try {
      const endpoint = type === 'roster' ? `/api/users/roster-invite/${inviteId}` : `/api/users/staff-invite/${inviteId}`;
      const response = await axios.delete(endpoint);
      
      if (response.data.success) {
        // Show success message (you can add a toast notification here)
        console.log(`${type} invite cancelled successfully`);
        
        // Refresh pending invites
        fetchPendingInvites();
      }
    } catch (error: any) {
      console.error(`Error cancelling ${type} invite:`, error);
      
      // Show error message to user
      const errorMessage = error.response?.data?.message || `Failed to cancel ${type} invite`;
      alert(errorMessage); // You can replace this with a proper toast notification
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDisplayName = (team: TeamUser) => {
    return team.profile?.displayName || team.username;
  };

  const getProfilePicture = (team: TeamUser) => {
    return team.profilePicture || team.profile?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjYwIiBmaWxsPSIjMzczNzNBIi8+CjxwYXRoIGQ9Ik02MCAzMEM2Ni4yNzQxIDMwIDcxLjQgMzUuMTI1OSA3MS40IDQxLjRDNzEuNCA0Ny42NzQxIDY2LjI3NDEgNTIuOCA2MCA1Mi44QzUzLjcyNTkgNTIuOCA0OC42IDQ3LjY3NDEgNDguNiA0MS40QzQ4LjYgMzUuMTI1OSA1My43MjU5IDMwIDYwIDMwWiIgZmlsbD0iIzZCNkI2QiIvPgo8cGF0aCBkPSJNODQgOTBDODQgNzguOTU0MyA3My4wNDU3IDY4IDYwIDY4QzQ2Ljk1NDMgNjggMzYgNzguOTU0MyAzNiA5MEg4NFoiIGZpbGw9IiM2QjZCNkIiLz4KPC9zdmc+Cg==';
  };

  const getGameIcon = (game: string) => {
    switch (game) {
      case 'BGMI': return '🎮';
      case 'Valorant': return '🔫';
      case 'Free Fire': return '🔥';
      case 'Call of Duty Mobile': return '🎯';
      default: return '🎮';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-64 bg-secondary-800 rounded-lg mb-6"></div>
            <div className="h-8 bg-secondary-800 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-secondary-800 rounded w-1/2 mb-6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gradient-dark pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Team not found</h1>
            <p className="text-secondary-400">The team you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark pt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Team Header */}
        <div className="card mb-6">
          <div className="relative h-64 bg-gradient-to-br from-secondary-800 to-secondary-900 rounded-t-lg">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            
            {/* Team Avatar */}
            <div className="absolute bottom-4 left-6">
              <div className="relative">
                <img
                  src={getProfilePicture(team)}
                  alt={getDisplayName(team)}
                  className="w-24 h-24 rounded-full border-4 border-white/20 object-cover"
                />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-4 right-6 flex space-x-3">
              {isOwnProfile ? (
                <Link
                  to={`/edit-profile/${teamId}`}
                  className="flex items-center space-x-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Profile</span>
                </Link>
              ) : (
                <>
                  <button
                    onClick={handleFollow}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isFollowing
                        ? 'bg-secondary-700 text-white'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isFollowing ? 'fill-current' : ''}`} />
                    <span>{isFollowing ? 'Following' : 'Follow'}</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-secondary-700 text-white px-4 py-2 rounded-lg hover:bg-secondary-600 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span>Message</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Team Info */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{getDisplayName(team)}</h1>
                <p className="text-secondary-400 mb-2">Professional Gaming Team</p>
                {team.profile?.location && (
                  <div className="flex items-center text-secondary-400">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{team.profile.location}</span>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <div className="text-white font-semibold">{followersCount}</div>
                    <div className="text-secondary-400">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">{followingCount}</div>
                    <div className="text-secondary-400">Following</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">{team.teamInfo?.teamSize || 0}</div>
                    <div className="text-secondary-400">Members</div>
                  </div>
                </div>
              </div>
            </div>

            {team.profile?.bio && (
              <p className="text-secondary-300 mb-4">{team.profile.bio}</p>
            )}

            {/* Team Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-secondary-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-500 mb-1">
                  {team.teamInfo?.rosters?.length || 0}
                </div>
                <div className="text-sm text-secondary-400">Game Rosters</div>
              </div>
              <div className="bg-secondary-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-500 mb-1">
                  {team.teamInfo?.staff?.length || 0}
                </div>
                <div className="text-sm text-secondary-400">Staff Members</div>
              </div>
              <div className="bg-secondary-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-500 mb-1">
                  {team.teamInfo?.members?.length || 0}
                </div>
                <div className="text-sm text-secondary-400">Total Members</div>
              </div>
              <div className="bg-secondary-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary-500 mb-1">
                  {team.teamInfo?.teamType || 'Casual'}
                </div>
                <div className="text-sm text-secondary-400">Team Type</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card mb-6">
          <div className="flex space-x-1 p-4">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-secondary-300 hover:text-white hover:bg-secondary-700/50'
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('rosters')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'rosters'
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-secondary-300 hover:text-white hover:bg-secondary-700/50'
              }`}
            >
              Rosters
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'staff'
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-secondary-300 hover:text-white hover:bg-secondary-700/50'
              }`}
            >
              Staff
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('invites')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'invites'
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-secondary-300 hover:text-white hover:bg-secondary-700/50'
                }`}
              >
                Pending Invites
              </button>
            )}
            <button
              onClick={() => setActiveTab('about')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'about'
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'text-secondary-300 hover:text-white hover:bg-secondary-700/50'
              }`}
            >
              About
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post._id} className="card">
                <div className="flex items-start space-x-3 p-4">
                  <img
                    src={getProfilePicture(team)}
                    alt={getDisplayName(team)}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-white">{getDisplayName(team)}</span>
                      <span className="text-secondary-400">•</span>
                      <span className="text-secondary-400">{formatDate(post.createdAt)}</span>
                    </div>
                    <p className="text-white mb-3">
                      {typeof post.content === 'string' ? post.content : post.content.text}
                    </p>
                    {post.media && post.media.length > 0 && (
                      <div className="mb-3">
                        {post.media.map((media, index) => (
                          <div key={index} className="mb-2">
                            {media.type === 'image' ? (
                              <img src={media.url} alt="" className="rounded-lg max-w-full" />
                            ) : (
                              <video src={media.url} controls className="rounded-lg max-w-full" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLike(post._id)}
                        className={`flex items-center space-x-1 text-sm transition-colors ${
                          post.likes.includes(currentUser?._id || '')
                            ? 'text-primary-500'
                            : 'text-secondary-400 hover:text-white'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${post.likes.includes(currentUser?._id || '') ? 'fill-current' : ''}`} />
                        <span>{post.likes.length}</span>
                      </button>
                      <button className="flex items-center space-x-1 text-sm text-secondary-400 hover:text-white">
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.comments.length}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'rosters' && (
          <div className="space-y-6">
            {team.teamInfo?.rosters?.map((roster) => (
              <div key={roster.game} className="card">
                <div className="flex items-center justify-between p-4 border-b border-secondary-800">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getGameIcon(roster.game)}</span>
                    <h3 className="text-xl font-semibold text-white">{roster.game} Roster</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      roster.isActive 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {roster.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {isOwnProfile && (
                    <button 
                      onClick={() => {
                        setSelectedGame(roster.game);
                        setShowAddPlayerModal(true);
                      }}
                      className="flex items-center space-x-2 bg-primary-500 text-white px-3 py-1 rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Add Player</span>
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roster.players.map((player) => (
                                           <div key={player.user._id} className="bg-secondary-800 rounded-lg p-4 border-2 border-transparent">
                       <div className="flex items-center space-x-3 mb-3">
                         <div className="relative">
                           <img
                             src={player.user.profile?.avatar || getProfilePicture(team)}
                             alt={player.user.profile?.displayName || player.user.username}
                             className="w-12 h-12 rounded-full object-cover"
                           />
                         </div>
                          <div>
                            <div className="font-semibold text-white">
                              {player.user.profile?.displayName || player.user.username}
                            </div>
                            <div className="text-sm text-secondary-400">
                              {player.inGameName || 'No IGN'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                                                     <div className="flex items-center space-x-2">
                             <span className={`px-2 py-1 rounded text-xs ${
                               player.role === 'Captain' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                               player.role === 'Coach' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                               'bg-secondary-700 text-secondary-300'
                             }`}>
                               {player.role}
                             </span>
                           </div>
                                                     <div className="flex items-center space-x-2">
                             <div className="text-xs text-secondary-400">
                               <div>Joined: {formatDate(player.joinedAt)}</div>
                             </div>
                             {isOwnProfile && (
                               <button
                                 onClick={() => handleRemovePlayer(roster.game, player.user._id)}
                                 className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                                 title="Remove player"
                               >
                                 <Trash2 className="h-3 w-3" />
                               </button>
                             )}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between p-4 border-b border-secondary-800">
                <h3 className="text-xl font-semibold text-white">Team Staff</h3>
                {isOwnProfile && (
                  <button 
                    onClick={() => setShowAddStaffModal(true)}
                    className="flex items-center space-x-2 bg-primary-500 text-white px-3 py-1 rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Add Staff</span>
                  </button>
                )}
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {team.teamInfo?.staff?.map((staffMember) => (
                                         <div key={staffMember.user._id} className="bg-secondary-800 rounded-lg p-4 border-2 border-transparent">
                       <div className="flex items-center space-x-3 mb-3">
                         <div className="relative">
                           <img
                             src={staffMember.user.profile?.avatar || getProfilePicture(team)}
                             alt={staffMember.user.profile?.displayName || staffMember.user.username}
                             className="w-12 h-12 rounded-full object-cover"
                           />
                         </div>
                        <div>
                          <div className="font-semibold text-white">
                            {staffMember.user.profile?.displayName || staffMember.user.username}
                          </div>
                          <div className="text-sm text-secondary-400">
                            {staffMember.role}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-secondary-400">
                          Joined {formatDate(staffMember.joinedAt)}
                        </span>
                        {isOwnProfile && (
                          <button
                            onClick={() => handleRemoveStaff(staffMember.user._id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                            title="Remove staff member"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invites' && isOwnProfile && (
          <div className="space-y-6">
            {/* Roster Invites */}
            <div className="card">
              <div className="flex items-center justify-between p-4 border-b border-secondary-800">
                <h3 className="text-xl font-semibold text-white">Pending Roster Invites</h3>
                <span className="text-sm text-secondary-400">
                  {pendingInvites.rosterInvites.length} invites
                </span>
              </div>
              <div className="p-4">
                {pendingInvites.rosterInvites.length > 0 ? (
                  <div className="space-y-4">
                    {pendingInvites.rosterInvites.map((invite) => (
                      <div key={invite._id} className="bg-secondary-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img
                              src={invite.player.profile?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzNzM3M0EiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTYuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM2QjZCNkIiLz4KPHBhdGggZD0iTTI4IDMwQzI4IDI2LjY4NjMgMjQuNDE4MyAyNCAyMCAyNEMxNS41ODE3IDI0IDEyIDI2LjY4NjMgMTIgMzBIMjhaIiBmaWxsPSIjNkI2QjZCIi8+Cjwvc3ZnPgo='}
                              alt={invite.player.profile?.displayName || invite.player.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-semibold text-white">
                                {invite.player.profile?.displayName || invite.player.username}
                              </div>
                              <div className="text-sm text-secondary-400">
                                {invite.game} - {invite.role}
                              </div>
                              <div className="text-xs text-secondary-500">
                                Invited {formatDate(invite.createdAt)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelInvite(invite._id, 'roster')}
                            className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-secondary-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-secondary-700">
                      <UserCheck className="h-8 w-8 text-secondary-500" />
                    </div>
                    <h4 className="font-bold text-white mb-2">No pending roster invites</h4>
                    <p className="text-sm text-secondary-400">All roster invites have been responded to</p>
                  </div>
                )}
              </div>
            </div>

            {/* Staff Invites */}
            <div className="card">
              <div className="flex items-center justify-between p-4 border-b border-secondary-800">
                <h3 className="text-xl font-semibold text-white">Pending Staff Invites</h3>
                <span className="text-sm text-secondary-400">
                  {pendingInvites.staffInvites.length} invites
                </span>
              </div>
              <div className="p-4">
                {pendingInvites.staffInvites.length > 0 ? (
                  <div className="space-y-4">
                    {pendingInvites.staffInvites.map((invite) => (
                      <div key={invite._id} className="bg-secondary-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img
                              src={invite.player.profile?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzNzM3M0EiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTYuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM2QjZCNkIiLz4KPHBhdGggZD0iTTI4IDMwQzI4IDI2LjY4NjMgMjQuNDE4MyAyNCAyMCAyNEMxNS41ODE3IDI0IDEyIDI2LjY4NjMgMTIgMzBIMjhaIiBmaWxsPSIjNkI2QjZCIi8+Cjwvc3ZnPgo='}
                              alt={invite.player.profile?.displayName || invite.player.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div>
                              <div className="font-semibold text-white">
                                {invite.player.profile?.displayName || invite.player.username}
                              </div>
                              <div className="text-sm text-secondary-400">
                                {invite.role}
                              </div>
                              <div className="text-xs text-secondary-500">
                                Invited {formatDate(invite.createdAt)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelInvite(invite._id, 'staff')}
                            className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-secondary-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-secondary-700">
                      <UserCheck className="h-8 w-8 text-secondary-500" />
                    </div>
                    <h4 className="font-bold text-white mb-2">No pending staff invites</h4>
                    <p className="text-sm text-secondary-400">All staff invites have been responded to</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="card">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">About {getDisplayName(team)}</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-white mb-2">Team Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-secondary-400">Team Type:</span>
                      <span className="text-white ml-2 capitalize">{team.teamInfo?.teamType || 'Casual'}</span>
                    </div>
                    <div>
                      <span className="text-secondary-400">Team Size:</span>
                      <span className="text-white ml-2">{team.teamInfo?.teamSize || 0} members</span>
                    </div>
                    <div>
                      <span className="text-secondary-400">Founded:</span>
                      <span className="text-white ml-2">{formatDate(team.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-secondary-400">Location:</span>
                      <span className="text-white ml-2">{team.profile?.location || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                {team.teamInfo?.requirements && (
                  <div>
                    <h4 className="text-lg font-medium text-white mb-2">Requirements</h4>
                    <p className="text-secondary-300">{team.teamInfo.requirements}</p>
                  </div>
                )}

                {team.teamInfo?.recruitingFor && team.teamInfo.recruitingFor.length > 0 && (
                  <div>
                    <h4 className="text-lg font-medium text-white mb-2">Currently Recruiting For</h4>
                    <div className="flex flex-wrap gap-2">
                      {team.teamInfo.recruitingFor.map((position, index) => (
                        <span key={index} className="px-3 py-1 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg text-sm">
                          {position}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {team.profile?.socialLinks && (
                  <div>
                    <h4 className="text-lg font-medium text-white mb-2">Social Links</h4>
                    <div className="flex space-x-4">
                      {team.profile.socialLinks.discord && (
                        <a href={team.profile.socialLinks.discord} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300">
                          Discord
                        </a>
                      )}
                      {team.profile.socialLinks.steam && (
                        <a href={team.profile.socialLinks.steam} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300">
                          Steam
                        </a>
                      )}
                      {team.profile.socialLinks.twitch && (
                        <a href={team.profile.socialLinks.twitch} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300">
                          Twitch
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Player Modal */}
      <AddPlayerModal
        isOpen={showAddPlayerModal}
        onClose={() => setShowAddPlayerModal(false)}
        teamId={teamId || ''}
        type="roster"
        game={selectedGame}
        onSuccess={handleAddPlayerSuccess}
      />

      {/* Add Staff Modal */}
      <AddPlayerModal
        isOpen={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        teamId={teamId || ''}
        type="staff"
        onSuccess={handleAddStaffSuccess}
      />
    </div>
  );
};

export default TeamProfile;
