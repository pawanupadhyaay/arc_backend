import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  X as XIcon,
  Clock,
  Gamepad2,
  Users,
  MessageSquare
} from 'lucide-react';
import axios from 'axios';

interface RosterInvite {
  _id: string;
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
  message?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface RosterInvitesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteProcessed: () => void;
}

const RosterInvitesModal: React.FC<RosterInvitesModalProps> = ({
  isOpen,
  onClose,
  onInviteProcessed
}) => {
  const [invites, setInvites] = useState<RosterInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchInvites();
    }
  }, [isOpen]);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/roster-invites');
      setInvites(response.data.data.invites);
    } catch (error) {
      console.error('Error fetching roster invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      setProcessingInvite(inviteId);
      await axios.post(`/api/users/roster-invites/${inviteId}/accept`);
      
      // Update local state
      setInvites(prev => prev.map(invite => 
        invite._id === inviteId 
          ? { ...invite, status: 'accepted' as const }
          : invite
      ));
      
      onInviteProcessed();
    } catch (error) {
      console.error('Error accepting invite:', error);
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      setProcessingInvite(inviteId);
      await axios.post(`/api/users/roster-invites/${inviteId}/decline`);
      
      // Update local state
      setInvites(prev => prev.map(invite => 
        invite._id === inviteId 
          ? { ...invite, status: 'declined' as const }
          : invite
      ));
      
      onInviteProcessed();
    } catch (error) {
      console.error('Error declining invite:', error);
    } finally {
      setProcessingInvite(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-secondary-900 border border-secondary-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-800">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-primary-500" />
            <div>
              <h2 className="text-xl font-semibold text-white">Roster Invites</h2>
              <p className="text-sm text-gray-400">Manage your team invitations</p>
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-400">Loading invites...</span>
            </div>
          ) : invites.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Roster Invites</h3>
              <p className="text-gray-400">You don't have any pending roster invitations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => (
                <div key={invite._id} className="bg-secondary-800 rounded-lg p-4 border border-secondary-700">
                  {/* Team Info */}
                  <div className="flex items-center space-x-3 mb-3">
                    <img
                      src={invite.team.profile?.avatar || '/default-avatar.png'}
                      alt={invite.team.profile?.displayName || invite.team.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-white">
                        {invite.team.profile?.displayName || invite.team.username}
                      </div>
                      <div className="text-sm text-gray-400">
                        @{invite.team.username}
                      </div>
                    </div>
                  </div>

                  {/* Invite Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getGameIcon(invite.game)}</span>
                      <span className="font-medium text-white">{invite.game} Roster</span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-400">
                        Role: <span className="text-white">{invite.role}</span>
                      </span>
                      {invite.inGameName && (
                        <span className="text-gray-400">
                          IGN: <span className="text-white">{invite.inGameName}</span>
                        </span>
                      )}
                    </div>

                    {invite.message && (
                      <div className="bg-secondary-700 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <MessageSquare className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-400">Message:</span>
                        </div>
                        <p className="text-white text-sm">{invite.message}</p>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>Invited {formatDate(invite.createdAt)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {invite.status === 'pending' ? (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleAcceptInvite(invite._id)}
                        disabled={processingInvite === invite._id}
                        className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        {processingInvite === invite._id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Accepting...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            <span>Accept</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeclineInvite(invite._id)}
                        disabled={processingInvite === invite._id}
                        className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        {processingInvite === invite._id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Declining...</span>
                          </>
                        ) : (
                          <>
                            <XIcon className="h-4 w-4" />
                            <span>Decline</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium ${
                      invite.status === 'accepted' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {invite.status === 'accepted' ? '✓ Accepted' : '✗ Declined'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RosterInvitesModal;
