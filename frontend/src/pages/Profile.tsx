import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  MapPin, 
  Calendar, 
  Mail, 
  Gamepad2, 
  Trophy, 
  Users, 
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
  Zap
} from 'lucide-react';
import axios from 'axios';

interface User {
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
    dateOfBirth?: string;
    gamingPreferences?: string[];
    socialLinks?: {
      discord?: string;
      steam?: string;
      twitch?: string;
    };
  };
  playerInfo?: {
    games?: Array<{
      name: string;
      rank: string;
      experience: string;
    }>;
    achievements?: Array<{
      title: string;
      description: string;
      date: string;
    }>;
    lookingForTeam?: boolean;
    preferredRoles?: string[];
    skillLevel?: string;
    joinedTeams?: Array<{
      team: {
        _id: string;
        username: string;
        profile?: {
          displayName?: string;
          avatar?: string;
        };
      };
      game: string;
      role: string;
      inGameName?: string;
      joinedAt: string;
      leftAt?: string;
      isActive: boolean;
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

const Profile: React.FC = () => {
  const { id: userId } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
     const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'teams'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [leavingTeam, setLeavingTeam] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isOwnProfile = currentUser?._id === userId;

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      fetchUserPosts();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      console.log('Fetching user profile for:', userId);
      
      // Add cache-busting parameter to ensure fresh data
      const response = await axios.get(`/api/users/${userId}?t=${Date.now()}`);
      const userData = response.data.data?.user;
      
      console.log('User data received:', userData);
      console.log('Joined teams data:', userData?.playerInfo?.joinedTeams);
      
      if (!userData) {
        console.error('No user data found in response');
        setLoading(false);
        return;
      }
      
      // If this is a team profile, redirect to team profile page
      if (userData.userType === 'team' || userData.role === 'team') {
        navigate(`/team/${userId}`);
        return;
      }
      
      console.log('Setting user data:', userData);
      setUser(userData);
      
      // Check if current user is following this user
      if (currentUser && userData.followers) {
        setIsFollowing(userData.followers.includes(currentUser._id));
      }
      
      setFollowersCount(userData.followers?.length || 0);
      setFollowingCount(userData.following?.length || 0);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      console.log('Fetching posts for user:', userId);
      const response = await axios.get(`/api/users/${userId}/posts`);
      console.log('Posts response:', response.data);
      setPosts(response.data.data?.posts || []);
    } catch (error: any) {
      console.error('Error fetching user posts:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) return;

    try {
      if (isFollowing) {
        console.log('Unfollowing user:', userId);
        const response = await axios.delete(`/api/users/${userId}/follow`);
        console.log('Unfollow response:', response.data);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        console.log('Following user:', userId);
        const response = await axios.post(`/api/users/${userId}/follow`);
        console.log('Follow response:', response.data);
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error);
      console.error('Error details:', error.response?.data);
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

  const handleLeaveTeam = async (teamId: string, game: string) => {
    if (!window.confirm('Are you sure you want to leave this team?')) {
      return;
    }

    try {
      setLeavingTeam(teamId);
      console.log('Leaving team:', { teamId, game });
      
      let response;
      // For staff members, use a different endpoint or handle differently
      if (game === 'Staff') {
        // Staff members can leave team using the same endpoint
        console.log('Staff member leaving team');
        response = await axios.delete(`/api/users/${teamId}/roster/Staff/leave`);
      } else {
        // Regular roster players
        console.log('Roster player leaving team');
        response = await axios.delete(`/api/users/${teamId}/roster/${game}/leave`);
      }
      
      console.log('Leave team response:', response.data);
      console.log('Team left successfully, refreshing user data...');
      
      // Force a complete refresh of the user data
      setLoading(true);
      await fetchUserProfile();
      
      console.log('User data refreshed');
      
      // Show success message
      setMessage({ type: 'success', text: 'Successfully left the team!' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error leaving team:', error);
      console.error('Error response:', error.response?.data);
      setMessage({ 
        type: 'error', 
        text: `Failed to leave team: ${error.response?.data?.message || error.message}` 
      });
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setLeavingTeam(null);
    }
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDisplayName = (user: User) => {
    return user.profile?.displayName || user.username;
  };

  const getProfilePicture = (user: User) => {
    return user.profilePicture || user.profile?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjYwIiBmaWxsPSIjMzczNzNBIi8+CjxwYXRoIGQ9Ik02MCAzMEM2Ni4yNzQxIDMwIDcxLjQgMzUuMTI1OSA3MS40IDQxLjRDNzEuNCA0Ny42NzQxIDY2LjI3NDEgNTIuOCA2MCA1Mi44QzUzLjcyNTkgNTIuOCA0OC42IDQ3LjY3NDEgNDguNiA0MS40QzQ4LjYgMzUuMTI1OSA1My43MjU5IDMwIDYwIDMwWiIgZmlsbD0iIzZCNkI2QiIvPgo8cGF0aCBkPSJNODQgOTBDODQgNzguOTU0MyA3My4wNDU3IDY4IDYwIDY4QzQ2Ljk1NDMgNjggMzYgNzguOTU0MyAzNiA5MEg4NFoiIGZpbGw9IiM2QjZCNkIiLz4KPC9zdmc+Cg==';
  };

  const getTeamProfilePicture = (team: any) => {
    return team.profile?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjYwIiBmaWxsPSIjMzczNzNBIi8+CjxwYXRoIGQ9Ik02MCAzMEM2Ni4yNzQxIDMwIDcxLjQgMzUuMTI1OSA3MS40IDQxLjRDNzEuNCA0Ny42NzQxIDY2LjI3NDEgNTIuOCA2MCA1Mi44QzUzLjcyNTkgNTIuOCA0OC42IDQ3LjY3NDEgNDguNiA0MS40QzQ4LjYgMzUuMTI1OSA1My43MjU5IDMwIDYwIDMwWiIgZmlsbD0iIzZCNkI2QiIvPgo8cGF0aCBkPSJNODQgOTBDODQgNzguOTU0MyA3My4wNDU3IDY4IDYwIDY4QzQ2Ljk1NDMgNjggMzYgNzguOTU0MyAzNiA5MEg4NFoiIGZpbGw9IiM2QjZCNkIiLz4KPC9zdmc+Cg==';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-64 bg-secondary-800 rounded-xl mb-6 shimmer"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="h-12 bg-secondary-800 rounded-xl mb-4 shimmer"></div>
                <div className="space-y-4">
                  <div className="h-32 bg-secondary-800 rounded-xl shimmer"></div>
                  <div className="h-32 bg-secondary-800 rounded-xl shimmer"></div>
                </div>
              </div>
              <div className="h-64 bg-secondary-800 rounded-xl shimmer"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-dark pt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Profile Not Found</h1>
            <p className="text-secondary-400">The user you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark pt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border-2 ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-400 border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{message.text}</span>
              <button 
                onClick={() => setMessage(null)}
                className="text-secondary-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        {/* Profile Header */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="relative">
              <img
                src={getProfilePicture(user)}
                alt={getDisplayName(user)}
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-primary-500/30 shadow-glow"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-success-500 to-primary-500 rounded-full border-2 border-secondary-950 shadow-glow animate-pulse"></div>
            </div>
            
            <div className="flex-1">
                             <div className="flex items-center space-x-3 mb-2">
                 <h1 className="text-2xl md:text-3xl font-bold text-white">{getDisplayName(user)}</h1>
                 {user.userType === 'team' && <Crown className="h-6 w-6 text-accent-500" />}
               </div>
              
                             <p className="text-secondary-400 capitalize mb-3">{user.userType || user.role}</p>
              
              {user.profile?.bio && (
                <p className="text-secondary-300 mb-4">{user.profile.bio}</p>
              )}
              
              <div className="flex flex-wrap items-center space-x-6 text-sm text-secondary-400 mb-4">
                {user.profile?.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{user.profile.location}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(user.createdAt)}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="font-bold text-xl text-primary-500">{followersCount}</div>
                  <div className="text-xs text-secondary-400">Followers</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-xl text-primary-500">{followingCount}</div>
                  <div className="text-xs text-secondary-400">Following</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-xl text-primary-500">{posts.length}</div>
                  <div className="text-xs text-secondary-400">Posts</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              {isOwnProfile ? (
                <Link
                  to="/settings"
                  className="btn-primary flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              ) : (
                <>
                  <button
                    onClick={handleFollow}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      isFollowing
                        ? 'bg-secondary-800/50 text-secondary-300 hover:bg-secondary-700/50'
                        : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-glow hover:shadow-glow-strong'
                    }`}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                  <Link
                    to={`/messages?user=${userId}`}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Message</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'posts'
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm'
                : 'text-secondary-400 hover:text-white hover:bg-secondary-800/50'
            }`}
          >
            <Gamepad2 className="h-4 w-4" />
            <span>Posts</span>
            {posts.length > 0 && (
              <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                {posts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'about'
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm'
                : 'text-secondary-400 hover:text-white hover:bg-secondary-800/50'
            }`}
          >
            <User className="h-4 w-4" />
            <span>About</span>
          </button>
          {user?.userType === 'player' && (
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'teams'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm'
                  : 'text-secondary-400 hover:text-white hover:bg-secondary-800/50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Teams</span>
              {user.playerInfo?.joinedTeams && user.playerInfo.joinedTeams.length > 0 && (
                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                  {user.playerInfo.joinedTeams.length}
                </span>
              )}
            </button>
          )}
          
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'posts' && (
              <div className="space-y-4">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <div key={post._id} className="card">
                      <div className="flex items-start space-x-4">
                                                 <img
                           src={post.author.profile?.avatar || post.author.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzNzM3M0EiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTcuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM2QjZCNkIiLz4KPHBhdGggZD0iTTI4IDMwQzI4IDI2LjY4NjMgMjQuNDE4MyAyNCAyMCAyNEMxNS41ODE3IDI0IDEyIDI2LjY4NjMgMTIgMzBIMjhaIiBmaWxsPSIjNkI2QjZCIi8+Cjwvc3ZnPgo='}
                           alt={post.author.profile?.displayName || post.author.username}
                           className="w-10 h-10 rounded-lg object-cover border-2 border-secondary-700"
                         />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                                                         <h4 className="font-semibold text-white">{post.author.profile?.displayName || post.author.username}</h4>
                            <span className="text-xs text-secondary-400">{formatDate(post.createdAt)}</span>
                          </div>
                                                     <p className="text-secondary-300 mb-3">
                             {typeof post.content === 'string' 
                               ? post.content 
                               : (post.content as any)?.text || ''
                             }
                           </p>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {post.tags.map((tag, index) => (
                                <span key={index} className="badge badge-secondary">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center space-x-4">
                            <button
                              onClick={() => handleLike(post._id)}
                              className={`flex items-center space-x-1 text-sm transition-colors ${
                                post.likes.includes(currentUser?._id || '')
                                  ? 'text-primary-500'
                                  : 'text-secondary-400 hover:text-primary-500'
                              }`}
                            >
                              <Heart className={`h-4 w-4 ${
                                post.likes.includes(currentUser?._id || '') ? 'fill-current' : ''
                              }`} />
                              <span>{post.likes.length}</span>
                            </button>
                            <div className="flex items-center space-x-1 text-sm text-secondary-400">
                              <MessageCircle className="h-4 w-4" />
                              <span>{post.comments.length}</span>
                            </div>
                            <button className="flex items-center space-x-1 text-sm text-secondary-400 hover:text-primary-500 transition-colors">
                              <Share2 className="h-4 w-4" />
                              <span>Share</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="card text-center py-12">
                    <Gamepad2 className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
                    <p className="text-secondary-400 mb-4">
                      {isOwnProfile ? 'Start sharing your gaming experiences!' : 'This user hasn\'t posted anything yet.'}
                    </p>
                    {isOwnProfile && (
                      <Link to="/create-post" className="btn-primary">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Post
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="card">
                <h3 className="text-xl font-bold text-white mb-4">About</h3>
                <div className="space-y-4">
                  {user.profile?.bio && (
                    <div>
                      <h4 className="font-semibold text-white mb-2">Bio</h4>
                      <p className="text-secondary-300">{user.profile.bio}</p>
                    </div>
                  )}
                  
                  {user.profile?.gamingPreferences && user.profile.gamingPreferences.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-2">Gaming Preferences</h4>
                      <div className="flex flex-wrap gap-2">
                        {user.profile.gamingPreferences.map((pref, index) => (
                          <span key={index} className="badge badge-primary">{pref}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {user.profile?.socialLinks && (
                    <div>
                      <h4 className="font-semibold text-white mb-2">Social Links</h4>
                      <div className="space-y-2">
                        {user.profile.socialLinks.discord && (
                          <div className="flex items-center space-x-2 text-secondary-300">
                            <span>Discord:</span>
                            <span className="text-primary-400">{user.profile.socialLinks.discord}</span>
                          </div>
                        )}
                        {user.profile.socialLinks.steam && (
                          <div className="flex items-center space-x-2 text-secondary-300">
                            <span>Steam:</span>
                            <span className="text-primary-400">{user.profile.socialLinks.steam}</span>
                          </div>
                        )}
                        {user.profile.socialLinks.twitch && (
                          <div className="flex items-center space-x-2 text-secondary-300">
                            <span>Twitch:</span>
                            <span className="text-primary-400">{user.profile.socialLinks.twitch}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="card">
                <h3 className="text-xl font-bold text-white mb-4">Team History</h3>
                
                                 {user.playerInfo?.joinedTeams && user.playerInfo.joinedTeams.length > 0 ? (
                   <div className="space-y-4">
                     {(() => { console.log('Joined teams data:', user.playerInfo.joinedTeams); return null; })()}
                     {user.playerInfo.joinedTeams.map((teamRef, index) => (
                      <div key={index} className={`bg-gradient-to-r from-secondary-800 to-secondary-900 rounded-xl p-6 border-2 shadow-lg hover:shadow-xl transition-all duration-300 ${
                        teamRef.isActive 
                          ? 'border-primary-500/50 shadow-primary-500/20' 
                          : 'border-secondary-700/50'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <img
                                src={teamRef.team.profile?.avatar || getTeamProfilePicture(teamRef.team)}
                                alt={teamRef.team.profile?.displayName || teamRef.team.username}
                                className="w-16 h-16 rounded-xl object-cover border-2 border-secondary-700 shadow-lg"
                              />
                              {teamRef.isActive && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-secondary-900 animate-pulse"></div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white text-lg flex items-center space-x-2">
                                <span>{teamRef.team.profile?.displayName || teamRef.team.username}</span>
                                {teamRef.isActive ? (
                                  <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium">Active</span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-lg text-xs font-medium">Left</span>
                                )}
                              </div>
                              <div className="text-sm text-secondary-400">
                                @{teamRef.team.username}
                              </div>
                            </div>
                          </div>
                                                     {teamRef.isActive && isOwnProfile && (
                             <button
                               onClick={() => {
                                 console.log('Leave team clicked:', { teamId: teamRef.team._id, game: teamRef.game, teamRef });
                                 handleLeaveTeam(teamRef.team._id, teamRef.game);
                               }}
                               disabled={leavingTeam === teamRef.team._id}
                               className={`px-4 py-2 border rounded-lg transition-colors font-medium ${
                                 leavingTeam === teamRef.team._id
                                   ? 'bg-red-500/10 text-red-300 border-red-500/20 cursor-not-allowed'
                                   : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                               }`}
                             >
                               {leavingTeam === teamRef.team._id ? 'Leaving...' : 'Leave Team'}
                             </button>
                           )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-secondary-700/50 rounded-lg p-3">
                            <div className="text-xs text-secondary-400 mb-1">Game</div>
                            <div className="text-white font-medium">{teamRef.game}</div>
                          </div>
                          <div className="bg-secondary-700/50 rounded-lg p-3">
                            <div className="text-xs text-secondary-400 mb-1">Role</div>
                            <div className="text-white font-medium">{teamRef.role}</div>
                          </div>
                          {teamRef.inGameName && (
                            <div className="bg-secondary-700/50 rounded-lg p-3">
                              <div className="text-xs text-secondary-400 mb-1">In-Game Name</div>
                              <div className="text-white font-medium">{teamRef.inGameName}</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-secondary-400 mb-4">
                          <div>
                            <span className="font-medium">Joined:</span> {formatDate(teamRef.joinedAt)}
                          </div>
                          {teamRef.leftAt && (
                            <div>
                              <span className="font-medium">Left:</span> {formatDate(teamRef.leftAt)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <Link
                            to={`/profile/${teamRef.team.username}`}
                            className="inline-flex items-center space-x-2 bg-primary-500/20 text-primary-400 border border-primary-500/30 px-4 py-2 rounded-lg hover:bg-primary-500/30 transition-colors font-medium"
                          >
                            <Users className="h-4 w-4" />
                            <span>View Team Profile</span>
                          </Link>
                          
                          {teamRef.isActive && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-green-400 text-sm font-medium">Currently Active</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-secondary-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-secondary-700">
                      <Users className="h-10 w-10 text-secondary-500" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-3">No Teams Joined</h4>
                    <p className="text-secondary-400 mb-6 max-w-md mx-auto">
                      {isOwnProfile 
                        ? "You haven't joined any teams yet. Start your gaming journey by joining a team!"
                        : "This player hasn't joined any teams yet."
                      }
                    </p>
                    {isOwnProfile && (
                      <div className="flex items-center justify-center space-x-4">
                        <Link
                          to="/search"
                          className="inline-flex items-center space-x-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors font-medium"
                        >
                          <Users className="h-4 w-4" />
                          <span>Find Teams</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="card">
              <h4 className="font-semibold text-white mb-4 flex items-center space-x-2">
                <Zap className="h-5 w-5 text-accent-500" />
                <span>Quick Stats</span>
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Posts</span>
                  <span className="font-semibold text-white">{posts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Followers</span>
                  <span className="font-semibold text-white">{followersCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-400">Following</span>
                  <span className="font-semibold text-white">{followingCount}</span>
                </div>
                
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
              <h4 className="font-semibold text-white mb-4">Recent Activity</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span className="text-secondary-300">Posted new content</span>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
