import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Phone } from 'lucide-react';
import MatchInterface from '../components/MatchInterface';

interface Game {
  id: string;
  name: string;
  icon: string;
}

interface ConnectionMatchedData {
  roomId: string;
  partner: {
    userId: string;
    username: string;
    displayName: string;
    avatar: string;
    videoEnabled: boolean;
  };
  selectedGame: string;
}

interface PartnerDisconnectedData {
  roomId: string;
  disconnectedUserId: string;
}

const games: Game[] = [
  { id: 'bgmi', name: 'BGMI', icon: '🎮' },
  { id: 'valorant', name: 'Valorant', icon: '🔫' },
  { id: 'freefire', name: 'Free Fire', icon: '🔥' },
  { id: 'csgo', name: 'CS:GO', icon: '⚡' },
  { id: 'fortnite', name: 'Fortnite', icon: '🏗️' },
  { id: 'apex', name: 'Apex Legends', icon: '🚀' },
  { id: 'lol', name: 'League of Legends', icon: '⚔️' },
  { id: 'dota2', name: 'Dota 2', icon: '🗡️' }
];

const RandomConnect: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [isInQueue, setIsInQueue] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [currentConnection, setCurrentConnection] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket) return;

    // Listen for connection matched event
    socket.on('connection-matched', (data: ConnectionMatchedData) => {
      setIsInQueue(false);
      setIsConnecting(false);
      setCurrentConnection(data);
      setPartner(data.partner);
      setError('');
    });

    // Listen for partner disconnected
    socket.on('partner-disconnected', (data: PartnerDisconnectedData & { reason?: string }) => {
      setCurrentConnection(null);
      setPartner(null);
      const reason = data.reason || 'disconnected';
      setError(`Partner ${reason}`);
    });

    return () => {
      socket.off('connection-matched');
      socket.off('partner-disconnected');
    };
  }, [socket]);

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const response = await axios.get('/api/random-connections/current-connection', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.data.success && response.data.connection) {
          const connection = response.data.connection;
          const otherParticipant = connection.participants.find((p: any) => p.userId !== user?._id);
          
          if (otherParticipant) {
            setCurrentConnection({
              roomId: connection.roomId,
              selectedGame: connection.selectedGame
            });
            setPartner({
              userId: otherParticipant.userId,
              username: otherParticipant.username,
              displayName: otherParticipant.displayName,
              avatar: otherParticipant.avatar,
              videoEnabled: otherParticipant.videoEnabled
            });
            setSelectedGame(connection.selectedGame);
          }
        }
      } catch (error) {
        // No existing connection, which is fine
      }
    };

    if (user) {
      checkExistingConnection();
    }
  }, [user]);

  const handleStartConnecting = async () => {
    if (!selectedGame) {
      setError('Please select a game');
      return;
    }

    if (!user) {
      setError('Please login to use Random Connect');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const response = await axios.post('/api/random-connections/join-queue', {
        selectedGame,
        videoEnabled
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success) {
        setIsInQueue(true);
        // Join socket room for the game
        socket?.emit('join-random-queue', { selectedGame, videoEnabled });
      }
    } catch (error: any) {
      setIsConnecting(false);
      setError(error.response?.data?.message || 'Failed to join queue');
    }
  };

  const handleLeaveQueue = async () => {
    try {
      await axios.delete('/api/random-connections/leave-queue', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setIsInQueue(false);
      setIsConnecting(false);
      setError('');
      
      // Leave socket room
      socket?.emit('leave-random-queue', { selectedGame });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to leave queue');
    }
  };

  const handleDisconnect = async () => {
    if (!currentConnection?.roomId) return;

    try {
      await axios.post('/api/random-connections/disconnect', {
        roomId: currentConnection.roomId
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setCurrentConnection(null);
      setPartner(null);
      setError('');
      
      // Leave socket room
      socket?.emit('leave-random-room', currentConnection.roomId);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to disconnect');
    }
  };

  const handleNextMatch = async () => {
    await handleDisconnect();
    // Automatically start looking for next match
    setTimeout(() => {
      handleStartConnecting();
    }, 1000);
  };

  if (currentConnection && partner) {
    return (
      <MatchInterface
        roomId={currentConnection.roomId}
        partner={partner}
        selectedGame={selectedGame}
        videoEnabled={videoEnabled}
        onDisconnect={handleDisconnect}
        onNextMatch={handleNextMatch}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Random Connect
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Connect with random players for gaming sessions, practice, or casual conversations. 
              Choose your game and start connecting instantly!
            </p>
          </div>

          {/* Main Content */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {!isInQueue ? (
              <>
                {/* Game Selection */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-white mb-4">
                    Select Your Game
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {games.map((game) => (
                      <button
                        key={game.id}
                        onClick={() => setSelectedGame(game.id)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                          selectedGame === game.id
                            ? 'border-blue-400 bg-blue-500/20 text-white'
                            : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="text-3xl mb-2">{game.icon}</div>
                        <div className="font-medium">{game.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Preference */}
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-white mb-4">
                    Video Settings
                  </h2>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={videoEnabled}
                        onChange={(e) => setVideoEnabled(e.target.checked)}
                        className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-white">
                        {videoEnabled ? 'Start connecting with video' : 'Start connecting without video'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Start Button */}
                <div className="text-center">
                  <button
                    onClick={handleStartConnecting}
                    disabled={isConnecting || !selectedGame}
                    className={`px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 ${
                      isConnecting || !selectedGame
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
                    }`}
                  >
                    {isConnecting ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-5 h-5" />
                        <span>Start Connecting</span>
                      </div>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Queue Status */
              <div className="text-center">
                <div className="mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    Looking for a partner...
                  </h2>
                  <p className="text-gray-300 mb-6">
                    Searching for someone playing {games.find(g => g.id === selectedGame)?.name}
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-blue-400">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
                
                <button
                  onClick={handleLeaveQueue}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cancel Search
                </button>
              </div>
            )}
          </div>

          {/* Features Info */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 text-center">
              <div className="text-3xl mb-3">🎮</div>
              <h3 className="text-lg font-semibold text-white mb-2">Game Matching</h3>
              <p className="text-gray-300">Connect with players who love the same games as you</p>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 text-center">
              <div className="text-3xl mb-3">📹</div>
              <h3 className="text-lg font-semibold text-white mb-2">Video Chat</h3>
              <p className="text-gray-300">Face-to-face conversations with crystal clear video quality</p>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 text-center">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="text-lg font-semibold text-white mb-2">Text Chat</h3>
              <p className="text-gray-300">Send messages and share gaming tips in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomConnect;
