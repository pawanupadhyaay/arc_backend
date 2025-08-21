import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, TrendingUp, Users, Trophy, Sparkles, Target, Star, Zap, Crown, Flame, Gamepad2, Award } from 'lucide-react';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import axios from 'axios';

interface Post {
  _id: string;
  content: {
    text: string;
    media: Array<{
      type: 'image' | 'video';
      url: string;
      publicId: string;
    }>;
  };
  author: {
    _id: string;
    username: string;
    profilePicture?: string;
    role: 'player' | 'team';
  };
  postType: 'general' | 'recruitment' | 'achievement' | 'looking-for-team';
  likes: Array<{
    user: string;
    likedAt: string;
  }>;
  comments: Array<{
    user: {
      _id: string;
      username: string;
      profilePicture?: string;
    };
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      fetchPosts();
      fetchSuggestions();
    }
  }, [authLoading]);

  const fetchPosts = async () => {
    try {
      const response = await axios.get('/api/posts');
      setPosts(response.data?.data?.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await axios.get('/api/users?limit=4');
      const users = response.data?.data?.users || [];
      // Filter out current user and already followed users
      const filteredUsers = users.filter((suggestedUser: any) => 
        suggestedUser._id !== user?._id && 
        !user?.following?.includes(suggestedUser._id)
      );
      setSuggestions(filteredUsers.slice(0, 4));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const filteredPosts = (posts || []).filter(post => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'following') {
      // Filter posts from users that the current user is following
      return user?.following?.includes(post.author._id) || false;
    }
    return true;
  });

  const filterOptions = [
    { key: 'all', label: 'All Posts', icon: TrendingUp, color: 'primary' },
    { key: 'following', label: 'Following', icon: Users, color: 'primary' }
  ];

  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark pt-24">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-secondary-800 rounded-2xl w-1/4 shimmer"></div>
                         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
               <div className="lg:col-span-3">
                 <div className="h-80 bg-secondary-800 rounded-2xl shimmer"></div>
               </div>
               <div className="lg:col-span-6">
                 <div className="h-16 bg-secondary-800 rounded-2xl mb-6 shimmer"></div>
                 <div className="space-y-6">
                   <div className="h-64 bg-secondary-800 rounded-2xl shimmer"></div>
                   <div className="h-64 bg-secondary-800 rounded-2xl shimmer"></div>
                 </div>
               </div>
               <div className="lg:col-span-3">
                 <div className="h-64 bg-secondary-800 rounded-2xl shimmer"></div>
               </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark pt-24">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
                 

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
                     {/* Left Sidebar */}
           <div className="lg:col-span-3">
             <div className="sticky top-28 space-y-4">
              {/* Your Gaming Stats Card */}
                             <div className="bg-gradient-to-br from-secondary-950 to-secondary-900 border border-primary-500/20 rounded-3xl p-4 shadow-large">
                <h4 className="font-bold text-white text-lg mb-6 text-center">Your Gaming Stats</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-400">Posts Created:</span>
                    <span className="font-bold text-white">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-400">Total Likes:</span>
                    <span className="font-bold text-white">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-400">Followers:</span>
                    <span className="font-bold text-white">{user?.followers?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-400">Following:</span>
                    <span className="font-bold text-white">{user?.following?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-3xl p-6 shadow-large">
                <h4 className="font-bold text-white text-lg mb-6 text-center">Recent Activity</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-success-500/10 to-success-600/10 rounded-2xl border border-success-500/20">
                    <div className="w-8 h-8 bg-gradient-to-r from-success-500 to-success-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">❤️</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-white">New like on your post</span>
                      <div className="text-xs text-secondary-400">2 minutes ago</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-primary-500/10 to-primary-600/10 rounded-2xl border border-primary-500/20">
                    <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-white">New follower</span>
                      <div className="text-xs text-secondary-400">15 minutes ago</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-accent-500/10 to-accent-600/10 rounded-2xl border border-accent-500/20">
                    <div className="w-8 h-8 bg-gradient-to-r from-accent-500 to-accent-600 rounded-full flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-white">Tournament registration</span>
                      <div className="text-xs text-secondary-400">1 hour ago</div>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-4 bg-gradient-to-r from-primary-500/20 to-primary-600/20 text-primary-400 font-semibold py-2 px-4 rounded-xl border border-primary-500/30 hover:from-primary-500/30 hover:to-primary-600/30 transition-all duration-300">
                  View All Activity
                </button>
              </div>

              {/* Feed Stats Card */}
              <div className="bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-3xl p-6 shadow-large">
                <h4 className="font-bold text-white text-lg mb-6 text-center">Feed Stats</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-400">Total Posts:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">6</span>
                      <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">6</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary-400">Your Posts:</span>
                    <span className="font-bold text-white">0</span>
                  </div>
                </div>
              </div>


            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-6">
            {/* Filter Tabs */}
            <div className="bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-3xl p-4 shadow-large mb-6">
              <div className="flex gap-2">
                {filterOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      onClick={() => setActiveFilter(option.key)}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-300 font-semibold group flex-1 ${
                        activeFilter === option.key
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow transform scale-105'
                          : 'text-secondary-400 hover:text-white hover:bg-gradient-to-r hover:from-secondary-800 hover:to-secondary-900 hover:shadow-soft'
                      }`}
                    >
                      <Icon className={`h-4 w-4 group-hover:scale-110 transition-transform duration-300 ${
                        activeFilter === option.key ? 'animate-pulse' : ''
                      }`} />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>



            {/* Posts */}
            {loading ? (
              <div className="space-y-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-3xl p-6 shadow-large animate-pulse">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-secondary-800 rounded-2xl shimmer"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-secondary-800 rounded w-1/3 mb-2 shimmer"></div>
                        <div className="h-3 bg-secondary-800 rounded w-1/4 shimmer"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-secondary-800 rounded shimmer"></div>
                      <div className="h-4 bg-secondary-800 rounded w-3/4 shimmer"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-8">
                {filteredPosts.map((post) => (
                  <PostCard key={post._id} post={post} onUpdate={fetchPosts} />
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-3xl p-12 shadow-large text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-secondary-800 to-secondary-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-secondary-700">
                  <Sparkles className="h-12 w-12 text-secondary-500" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">No posts found</h3>
                                 <p className="text-secondary-400 mb-8 text-lg">
                   {activeFilter === 'all' 
                     ? 'Be the first to create an epic post!' 
                     : 'No posts from followed users available.'
                   }
                 </p>
                <button 
                  onClick={() => setIsCreatePostModalOpen(true)}
                  className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold py-4 px-8 rounded-2xl shadow-glow hover:shadow-glow-strong transition-all duration-300 group hover:scale-105"
                >
                  <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                  <span>Create Post</span>
                  <Zap size={16} className="group-hover:animate-pulse" />
                </button>
              </div>
            )}
          </div>

                     {/* Right Sidebar */}
           <div className="lg:col-span-3">
             <div className="sticky top-28 space-y-4">
                             {/* Suggestions */}
               <div className="bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-3xl p-4 shadow-large">
                 <h4 className="font-bold text-white mb-6 flex items-center space-x-3">
                   <Users className="h-6 w-6 text-accent-500" />
                   <span>Suggestions</span>
                 </h4>
                 {suggestionsLoading ? (
                   <div className="space-y-4">
                     {[1, 2, 3, 4].map((i) => (
                       <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                         <div className="w-8 h-8 bg-secondary-800 rounded-full shimmer"></div>
                         <div className="flex-1">
                           <div className="h-3 bg-secondary-800 rounded w-2/3 mb-1 shimmer"></div>
                           <div className="h-2 bg-secondary-800 rounded w-1/2 shimmer"></div>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : suggestions.length > 0 ? (
                   <div className="space-y-4">
                     {suggestions.map((suggestedUser) => (
                       <div key={suggestedUser._id} className="flex items-center justify-between p-3 hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10 rounded-2xl transition-all duration-300 group cursor-pointer">
                         <Link to={`/profile/${suggestedUser._id}`} className="flex items-center space-x-3 flex-1">
                           <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                             <span className="text-white text-xs font-bold">
                               {suggestedUser.username?.charAt(0).toUpperCase()}
                             </span>
                           </div>
                           <div>
                             <span className="text-sm font-bold text-white">{suggestedUser.username}</span>
                             <div className="text-xs text-secondary-400 capitalize">{suggestedUser.userType || 'player'}</div>
                           </div>
                         </Link>
                         <button 
                           onClick={async () => {
                             try {
                               await axios.post(`/api/users/${suggestedUser._id}/follow`);
                               fetchSuggestions(); // Refresh suggestions
                             } catch (error) {
                               console.error('Error following user:', error);
                             }
                           }}
                           className="text-primary-400 hover:text-primary-300 transition-colors duration-300"
                         >
                           <Users className="h-4 w-4" />
                         </button>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="text-center py-8">
                     <div className="w-16 h-16 bg-secondary-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-secondary-700">
                       <Users className="h-8 w-8 text-secondary-500" />
                     </div>
                     <h4 className="font-bold text-white mb-2">No suggestions</h4>
                     <p className="text-sm text-secondary-400">You're following everyone!</p>
                   </div>
                 )}
               </div>

              {/* Featured Events */}
              <div className="bg-gradient-to-br from-secondary-950 to-secondary-900 border border-secondary-800/50 rounded-3xl p-6 shadow-large">
                <h4 className="font-bold text-white mb-6 flex items-center space-x-3">
                  <Trophy className="h-6 w-6 text-accent-500" />
                  <span>Featured Events</span>
                </h4>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-secondary-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-secondary-700">
                    <Trophy className="h-8 w-8 text-secondary-500" />
                  </div>
                  <h4 className="font-bold text-white mb-2">No events yet</h4>
                  <p className="text-sm text-secondary-400">Tournaments coming soon!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        onPostCreated={fetchPosts}
      />

      {/* Floating Action Button */}
      <button
        onClick={() => setIsCreatePostModalOpen(true)}
        className="floating-action-button"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
};

export default Dashboard;
