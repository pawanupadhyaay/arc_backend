import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Trophy, 
  Search, 
  Filter, 
  Plus, 
  Users, 
  Calendar, 
  DollarSign,
  Gamepad2,
  Crown,
  Star
} from 'lucide-react';
import axios from 'axios';
import CreateTournamentModal from '../components/CreateTournamentModal';
import TournamentManagementModal from '../components/TournamentManagementModal';

interface Tournament {
  _id: string;
  name: string;
  description: string;
  game: string;
  format: string;
  mode?: string;
  status: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  prizePool: number;
  entryFee: number;
  totalSlots: number;
  teamsPerGroup: number;
  numberOfGroups: number;
  prizePoolType: string;
  participants: any[];
  teams: any[];
  host: {
    _id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  };
  createdAt: string;
}

const Tournaments: React.FC = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [tournamentFilter, setTournamentFilter] = useState('All Tournaments');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    fetchTournaments();
  }, [activeFilter, searchQuery]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (activeFilter !== 'all') params.append('filter', activeFilter);

      const response = await axios.get(`/api/tournaments?${params}`);
      setTournaments(response.data.data.tournaments || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTournamentCreated = () => {
    fetchTournaments();
  };

  const handleManageTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowManagementModal(true);
  };

  const handleTournamentUpdated = () => {
    fetchTournaments();
  };

  const joinTournament = async (tournamentId: string) => {
    try {
      console.log('Attempting to join tournament:', {
        tournamentId,
        user: user,
        userType: user?.role
      });
      
      await axios.post(`/api/tournaments/${tournamentId}/join`);
      // Refresh tournaments to update the UI
      fetchTournaments();
      // Show success message (you can add a toast notification here)
      alert('Successfully joined tournament!');
    } catch (error: any) {
      console.error('Error joining tournament:', error);
      alert(error.response?.data?.message || 'Failed to join tournament');
    }
  };

  const leaveTournament = async (tournamentId: string) => {
    try {
      await axios.post(`/api/tournaments/${tournamentId}/leave`);
      // Refresh tournaments to update the UI
      fetchTournaments();
      // Show success message (you can add a toast notification here)
      alert('Successfully left tournament!');
    } catch (error: any) {
      console.error('Error leaving tournament:', error);
      alert(error.response?.data?.message || 'Failed to leave tournament');
    }
  };

  const openRegistration = async (tournamentId: string) => {
    try {
      await axios.put(`/api/tournaments/${tournamentId}`, { status: 'Registration Open' });
      fetchTournaments();
      alert('Registration opened successfully!');
    } catch (error: any) {
      console.error('Error opening registration:', error);
      alert(error.response?.data?.message || 'Failed to open registration');
    }
  };

  const getTotalParticipants = (tournament: Tournament) => {
    return tournament.participants.length + tournament.teams.length;
  };

  const isParticipating = (tournament: Tournament) => {
    if (!user) return false;
    return tournament.participants.some(p => p._id === user._id) || 
           tournament.teams.some(t => t._id === user._id);
  };

  const isHost = (tournament: Tournament) => {
    if (!user) return false;
    return tournament.host._id === user._id;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Registration Open': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Ongoing': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Completed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-secondary-800/50 text-secondary-300 border-secondary-700/50';
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getActionButton = (tournament: Tournament) => {
    if (isHost(tournament)) {
      if (tournament.status === 'Upcoming') {
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => openRegistration(tournament._id)}
              className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
            >
              Open Registration
            </button>
            <button
              onClick={() => handleManageTournament(tournament)}
              className="px-4 py-2 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg hover:bg-primary-500/30 transition-colors"
            >
              Manage
            </button>
          </div>
        );
      }
      return (
        <button
          onClick={() => handleManageTournament(tournament)}
          className="px-4 py-2 bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg hover:bg-primary-500/30 transition-colors"
        >
          Manage
        </button>
      );
    }

    if (isParticipating(tournament)) {
      return (
        <button 
          onClick={() => leaveTournament(tournament._id)}
          className="px-4 py-2 bg-secondary-800/50 text-secondary-300 rounded-lg hover:bg-secondary-700/50 transition-colors"
        >
          Leave Tournament
        </button>
      );
    }

    if (tournament.status !== 'Registration Open') {
      return (
        <button className="px-4 py-2 bg-secondary-800/50 text-secondary-300 rounded-lg cursor-not-allowed">
          Registration Closed
        </button>
      );
    }

    // Check if player is trying to join team-only tournaments
    if (user?.role === 'player' && (tournament.format === 'Squad' || tournament.format === '5v5')) {
      return (
        <button className="px-4 py-2 bg-accent-500/20 text-accent-400 border border-accent-500/30 rounded-lg cursor-not-allowed">
          Team Only
        </button>
      );
    }

    return (
      <button 
        onClick={() => joinTournament(tournament._id)}
        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
      >
        Join Tournament
      </button>
    );
  };

  const filterOptions = [
    { key: 'all', label: 'All', count: tournaments.length },
    { key: 'available', label: 'Available', count: tournaments.filter(t => !isParticipating(t) && !isHost(t)).length },
    { key: 'participating', label: 'Participating', count: tournaments.filter(isParticipating).length },
    { key: 'hosted', label: 'Hosted', count: tournaments.filter(isHost).length }
  ];

  return (
    <div className="min-h-screen bg-gradient-dark pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Trophy className="h-8 w-8 text-primary-500" />
              <h1 className="text-3xl font-bold text-white">Tournaments</h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Create Tournament</span>
            </button>
          </div>
          <p className="text-secondary-400">Compete in epic tournaments and win amazing prizes.</p>
          
          {/* User Status */}
          <div className="mt-4 text-sm text-secondary-400">
            Login Status: Logged In | User Type: {user?.role || 'player'} | Gaming IDs: None
          </div>
        </div>

        {/* Search and Filter */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tournaments..."
                className="input-field w-full pl-12 pr-4 py-3"
              />
            </div>
            <select
              value={tournamentFilter}
              onChange={(e) => setTournamentFilter(e.target.value)}
              className="input-field py-3"
            >
              <option>All Tournaments</option>
              <option>BGMI</option>
              <option>Valorant</option>
              <option>Free Fire</option>
              <option>Call of Duty Mobile</option>
            </select>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1">
            {filterOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setActiveFilter(option.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === option.key
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-secondary-300 hover:text-white hover:bg-secondary-700/50'
                }`}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </div>

        {/* Tournaments Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-secondary-400">Loading tournaments...</p>
          </div>
        ) : tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <div key={tournament._id} className="card overflow-hidden">
                {/* Tournament Image */}
                <div className="relative h-48 bg-gradient-to-br from-secondary-800 to-secondary-900">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  
                  {/* Status Tags */}
                  <div className="absolute top-3 left-3">
                    <span className={`${tournament.prizePoolType === 'with_prize' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'} border px-2 py-1 rounded text-xs`}>
                      {tournament.prizePoolType === 'with_prize' ? 'Prize Pool' : 'Fun Tournament'}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`${getStatusColor(tournament.status)} px-2 py-1 rounded text-xs`}>
                      {tournament.status}
                    </span>
                  </div>

                  {/* Game Icon */}
                  <div className="absolute bottom-3 left-3 text-2xl">
                    {getGameIcon(tournament.game)}
                  </div>
                </div>

                {/* Tournament Info */}
                <div className="p-4">
                  <h3 className="font-bold text-white text-lg mb-2">{tournament.name}</h3>
                  <p className="text-secondary-400 text-sm mb-3">
                    {tournament.game} {tournament.mode ? `• ${tournament.mode}` : ''} • {tournament.format}
                  </p>

                  {/* Prize Pool */}
                  <div className="text-2xl font-bold text-primary-500 mb-3">
                    {tournament.prizePoolType === 'with_prize' ? `₹${tournament.prizePool.toLocaleString()}` : 'Free Entry'}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-secondary-400 mb-4">
                                         <span>{getTotalParticipants(tournament)}/{tournament.totalSlots} participants</span>
                    <span>Starts {formatDate(tournament.startDate)}</span>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-center">
                    {getActionButton(tournament)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Trophy className="h-16 w-16 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No tournaments found</h3>
            <p className="text-secondary-400">Try adjusting your search terms or filters</p>
          </div>
        )}

        {/* Create Tournament Modal */}
        <CreateTournamentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onTournamentCreated={handleTournamentCreated}
        />

        {/* Tournament Management Modal */}
        <TournamentManagementModal
          isOpen={showManagementModal}
          onClose={() => {
            setShowManagementModal(false);
            setSelectedTournament(null);
          }}
          tournament={selectedTournament}
          onTournamentUpdated={handleTournamentUpdated}
        />
      </div>
    </div>
  );
};

export default Tournaments;
