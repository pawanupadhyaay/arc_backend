import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search as SearchIcon, Users, Filter, X, Crown, Star, MapPin, Calendar } from 'lucide-react';
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
    achievements?: string[];
    socialLinks?: {
      discord?: string;
      steam?: string;
      twitch?: string;
    };
  };
  followers?: string[];
  following?: string[];
  createdAt: string;
}



const Search: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    role: '',
    location: '',
    sortBy: 'relevance'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        performSearch();
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, filters]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // Search for users only - as requested by user
      const userResponse = await axios.get(`/api/users?search=${encodeURIComponent(searchQuery)}`);
      setSearchResults(userResponse.data.data?.users || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await axios.post(`/api/users/${userId}/follow`);
      // Update the user in search results to show they're now followed
      setSearchResults(prev => prev.map(user => {
        if (user._id === userId) {
          return {
            ...user,
            followers: [...(user.followers || []), currentUser?._id || '']
          };
        }
        return user;
      }));
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      await axios.delete(`/api/users/${userId}/follow`);
      // Update the user in search results to show they're now unfollowed
      setSearchResults(prev => prev.map(user => {
        if (user._id === userId) {
          return {
            ...user,
            followers: (user.followers || []).filter(id => id !== currentUser?._id)
          };
        }
        return user;
      }));
    } catch (error) {
      console.error('Unfollow error:', error);
    }
  };

  const isFollowing = (targetUser: User) => {
    return targetUser.followers?.includes(currentUser?._id || '') || false;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDisplayName = (user: User) => {
    return user.profile?.displayName || user.username;
  };

  const getProfilePicture = (user: User) => {
    return user.profilePicture || user.profile?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzNzM3M0EiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTcuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM2QjZCNkIiLz4KPHBhdGggZD0iTTI4IDMwQzI4IDI2LjY4NjMgMjQuNDE4MyAyNCAyMCAyNEMxNS41ODE3IDI0IDEyIDI2LjY4NjMgMTIgMzBIMjhaIiBmaWxsPSIjNkI2QjZCIi8+Cjwvc3ZnPgo=';
  };

  return (
    <div className="min-h-screen bg-gradient-dark pt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Discover</h1>
          <p className="text-secondary-400">Find players, teams, and gaming content</p>
        </div>

        {/* Search Bar */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for players, teams, or content..."
                className="input-field w-full px-4 py-3"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center p-3 rounded-lg transition-all duration-200 min-w-[48px] h-[48px] ${
                showFilters 
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-sm' 
                  : 'bg-secondary-800/50 text-secondary-300 hover:bg-secondary-700/50 hover:text-white'
              }`}
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-secondary-700/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={filters.role}
                  onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  className="input-field py-2.5"
                >
                  <option value="">All Roles</option>
                  <option value="player">Players</option>
                  <option value="team">Teams</option>
                </select>
                
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Location..."
                  className="input-field py-2.5"
                />
                
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="input-field py-2.5"
                >
                  <option value="relevance">Most Relevant</option>
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>
          )}
        </div>



        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-secondary-400">Searching...</p>
          </div>
        )}

        {/* Search Results */}
        {!loading && searchQuery && (
          <div className="space-y-4">
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div key={user._id} className="card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={getProfilePicture(user)}
                        alt={getDisplayName(user)}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-secondary-700"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-white">{getDisplayName(user)}</h3>
                          {user.role === 'team' && <Crown className="h-4 w-4 text-accent-500" />}
                        </div>
                        <p className="text-sm text-secondary-400 capitalize">{user.role || user.userType}</p>
                        {user.profile?.bio && (
                          <p className="text-sm text-secondary-300 mt-1">{user.profile.bio}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-secondary-400">
                          {user.profile?.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{user.profile.location}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Joined {formatDate(user.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-center">
                        <div className="font-bold text-primary-500">{user.followers?.length || 0}</div>
                        <div className="text-xs text-secondary-400">Followers</div>
                      </div>
                      {user._id !== currentUser?._id && (
                        <button
                          onClick={() => isFollowing(user) ? handleUnfollow(user._id) : handleFollow(user._id)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            isFollowing(user)
                              ? 'bg-secondary-800/50 text-secondary-300 hover:bg-secondary-700/50'
                              : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700'
                          }`}
                        >
                          {isFollowing(user) ? 'Unfollow' : 'Follow'}
                        </button>
                      )}
                      <Link
                        to={`/profile/${user._id}`}
                        className="px-4 py-2 bg-secondary-800/50 text-white rounded-lg hover:bg-secondary-700/50 transition-colors"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="card text-center py-12">
                <Users className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No users found</h3>
                <p className="text-secondary-400">Try adjusting your search terms or filters</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !searchQuery && (
          <div className="card text-center py-16">
            <div className="mb-8">
              <SearchIcon className="h-20 w-20 text-secondary-400 mx-auto mb-6 opacity-60" />
              <h2 className="text-3xl font-bold text-white mb-4">Start Discovering</h2>
              <p className="text-secondary-400 text-lg max-w-md mx-auto">
                Search for players, teams, or gaming content to connect with the community
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex items-center space-x-3 text-secondary-300 hover:text-white transition-colors duration-200 cursor-pointer group">
                <div className="p-2 rounded-lg bg-secondary-800/50 group-hover:bg-primary-500/20 transition-colors duration-200">
                  <Users className="h-5 w-5" />
                </div>
                <span className="font-medium">Find Players</span>
              </div>
              <div className="flex items-center space-x-3 text-secondary-300 hover:text-white transition-colors duration-200 cursor-pointer group">
                <div className="p-2 rounded-lg bg-secondary-800/50 group-hover:bg-primary-500/20 transition-colors duration-200">
                  <Crown className="h-5 w-5" />
                </div>
                <span className="font-medium">Join Teams</span>
              </div>
              <div className="flex items-center space-x-3 text-secondary-300 hover:text-white transition-colors duration-200 cursor-pointer group">
                <div className="p-2 rounded-lg bg-secondary-800/50 group-hover:bg-primary-500/20 transition-colors duration-200">
                  <Star className="h-5 w-5" />
                </div>
                <span className="font-medium">Discover Content</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
