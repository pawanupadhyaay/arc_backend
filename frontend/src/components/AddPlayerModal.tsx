import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  UserPlus, 
  Users,
  Gamepad2,
  Crown,
  User,
  UserCheck,
  Briefcase
} from 'lucide-react';
import axios from 'axios';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  type: 'roster' | 'staff';
  game?: string;
  onSuccess: () => void;
}

interface User {
  _id: string;
  username: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
  userType: string;
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  teamId,
  type,
  game,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [role, setRole] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const rosterRoles = ['Captain', 'Player', 'Substitute', 'Coach', 'Manager'];
  const staffRoles = ['Owner', 'Manager', 'Coach', 'Analyst', 'Content Creator'];

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      const response = await axios.get(`/api/users?search=${searchQuery}&userType=${type === 'roster' ? 'player' : ''}`);
      setSearchResults(response.data.data.users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (type === 'roster') {
        await axios.post(`/api/users/${teamId}/roster/${game}/add-player`, {
          playerId: selectedUser._id,
          role,
          inGameName,
          message
        });
      } else {
        await axios.post(`/api/users/${teamId}/staff/add`, {
          memberId: selectedUser._id,
          role,
          message
        });
      }

      setSuccess(`${type === 'roster' ? 'Player' : 'Staff member'} invitation sent successfully!`);
      onSuccess();
      
      // Reset form
      setSelectedUser(null);
      setRole('');
      setInGameName('');
      setMessage('');
      setSearchQuery('');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to send ${type === 'roster' ? 'player' : 'staff member'} invitation`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-secondary-900 border border-secondary-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-800">
          <div className="flex items-center space-x-3">
            <UserPlus className="h-6 w-6 text-primary-500" />
            <div>
              <h2 className="text-xl font-semibold text-white">
                {type === 'roster' ? 'Add Player to Roster' : 'Invite Staff Member'}
              </h2>
              <p className="text-sm text-gray-400">
                {type === 'roster' ? `Send an invitation to join your ${game} roster` : 'Send an invitation to join your team staff'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="bg-error-500/20 border border-error-500/30 text-error-300 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg text-sm mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Search Users */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search {type === 'roster' ? 'Players' : 'Users'}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary-800 border border-secondary-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  placeholder={`Search ${type === 'roster' ? 'players' : 'users'} by username...`}
                />
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto bg-secondary-800 rounded-lg border border-secondary-700">
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className={`w-full p-3 text-left hover:bg-secondary-700 transition-colors ${
                        selectedUser?._id === user._id ? 'bg-primary-500/20 border border-primary-500/30' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={user.profile?.avatar || '/default-avatar.png'}
                          alt={user.profile?.displayName || user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-medium text-white">
                            {user.profile?.displayName || user.username}
                          </div>
                          <div className="text-sm text-gray-400">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected User */}
            {selectedUser && (
              <div className="bg-secondary-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedUser.profile?.avatar || '/default-avatar.png'}
                    alt={selectedUser.profile?.displayName || selectedUser.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-white">
                      {selectedUser.profile?.displayName || selectedUser.username}
                    </div>
                    <div className="text-sm text-gray-400">
                      @{selectedUser.username}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                required
              >
                <option value="">Select a role</option>
                {(type === 'roster' ? rosterRoles : staffRoles).map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption}
                  </option>
                ))}
              </select>
            </div>

            {/* In-Game Name (for roster only) */}
            {type === 'roster' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  In-Game Name
                </label>
                <input
                  type="text"
                  value={inGameName}
                  onChange={(e) => setInGameName(e.target.value)}
                  className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  placeholder="Player's in-game name"
                />
              </div>
            )}

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                placeholder={`Add a personal message to the ${type === 'roster' ? 'roster' : 'staff'} invite...`}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-secondary-800">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-lg bg-secondary-700 text-white font-semibold hover:bg-secondary-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedUser || !role}
                className="px-6 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 text-white font-semibold transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{type === 'roster' ? 'Adding...' : 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>{type === 'roster' ? 'Add Player' : 'Send Staff Invite'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddPlayerModal;
