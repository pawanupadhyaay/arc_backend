import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  SkipForward,
  Send
} from 'lucide-react';

interface Partner {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  videoEnabled: boolean;
}

interface Message {
  sender: string;
  message: string;
  timestamp: Date;
  isOwn: boolean;
}

interface MatchInterfaceProps {
  roomId: string;
  partner: Partner;
  selectedGame: string;
  videoEnabled: boolean;
  onDisconnect: () => void;
  onNextMatch: () => void;
}

interface RandomConnectionMessageData {
  sender: string;
  message: string;
  timestamp: string;
}

interface WebRTCSignalData {
  signal: {
    type: 'offer' | 'answer' | 'ice-candidate';
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
  fromUserId: string;
  roomId: string;
}

const MatchInterface: React.FC<MatchInterfaceProps> = ({
  roomId,
  partner,
  selectedGame,
  videoEnabled,
  onDisconnect,
  onNextMatch
}) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(videoEnabled);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState('');
  const [hasCreatedOffer, setHasCreatedOffer] = useState(false);
  const [hasReceivedOffer, setHasReceivedOffer] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const { socket } = useSocket();
  const { user } = useAuth();

  // Helper function to get user initials
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const games: { [key: string]: string } = {
    bgmi: 'BGMI',
    valorant: 'Valorant',
    freefire: 'Free Fire',
    csgo: 'CS:GO',
    fortnite: 'Fortnite',
    apex: 'Apex Legends',
    lol: 'League of Legends',
    dota2: 'Dota 2'
  };

  useEffect(() => {
    if (!socket) return;

    // Join the random room
    socket.emit('join-random-room', roomId);

    // Listen for messages
    socket.on('random-connection-message', (data: RandomConnectionMessageData) => {
      const newMsg: Message = {
        sender: data.sender,
        message: data.message,
        timestamp: new Date(data.timestamp),
        isOwn: data.sender === user?._id
      };
      setMessages(prev => [...prev, newMsg]);
    });

    // Listen for WebRTC signals
    socket.on('webrtc-signal', (data: WebRTCSignalData) => {
      console.log('Received WebRTC signal:', data);
      // Only handle signals from our partner
      if (data.fromUserId === partner.userId) {
        handleWebRTCSignal(data);
      } else {
        console.log('Ignoring WebRTC signal from non-partner user:', data.fromUserId);
      }
    });

    // Listen for partner disconnected
    socket.on('partner-disconnected', (data: { roomId: string; disconnectedUserId: string; reason?: string }) => {
      if (data.roomId === roomId) {
        const reason = data.reason || 'disconnected';
        setError(`Partner ${reason}`);
        // Auto-disconnect after 3 seconds
        setTimeout(() => {
          onDisconnect();
        }, 3000);
      }
    });

    // Listen for room joined confirmation
    socket.on('room-joined', (data: { roomId: string }) => {
      console.log('Joined room:', data.roomId);
    });

    // Listen for when another user joins the room
    socket.on('user-joined-room', (data: { roomId: string; userId: string }) => {
      console.log('Another user joined room:', data.userId);
      // If we're still connecting and someone else joined, try to establish connection
      if (isConnecting && data.userId !== user?._id) {
        console.log('Partner joined, attempting to establish connection...');
        // Wait a bit more for the partner to fully join, then create offer
        setTimeout(() => {
          if (peerConnectionRef.current && isConnecting && !hasCreatedOffer && !hasReceivedOffer) {
            console.log('Creating offer after partner joined');
            createOffer();
          }
        }, 2000);
      }
    });

    return () => {
      socket.off('random-connection-message');
      socket.off('webrtc-signal');
      socket.off('partner-disconnected');
      socket.off('room-joined');
      socket.off('user-joined-room');
      socket.emit('leave-random-room', roomId);
    };
  }, [socket, roomId, user?._id, isConnecting, hasCreatedOffer, hasReceivedOffer]);

  useEffect(() => {
    initializeMedia();
    
    // Set a timeout to stop connecting if it takes too long
    const connectionTimeout = setTimeout(() => {
      if (isConnecting) {
        console.log('Connection timeout - stopping connecting state');
        setIsConnecting(false);
        setError('Connection timeout. Please try again or use the retry button.');
      }
    }, 15000); // 15 seconds timeout

    return () => {
      clearTimeout(connectionTimeout);
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Effect to handle remote stream changes
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log('Setting remote video stream');
      remoteVideoRef.current.srcObject = remoteStream;
      
      // Try to play the video
      const playPromise = remoteVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Remote video started playing successfully');
          })
          .catch(e => {
            console.log('Video play error:', e);
            // Try to reload the video element
            setTimeout(() => {
              if (remoteVideoRef.current && remoteStream) {
                remoteVideoRef.current.srcObject = null;
                setTimeout(() => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                    remoteVideoRef.current.play().catch(e2 => console.log('Retry play error:', e2));
                  }
                }, 100);
              }
            }, 1000);
          });
      }
    }
  }, [remoteStream]);

  const initializeMedia = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      // Set initial video state based on videoEnabled prop
      if (!videoEnabled) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          setIsVideoOn(false);
        }
      }

      // Ensure audio is working properly
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        console.log('Audio track initialized:', audioTrack.label);
        console.log('Audio track enabled:', audioTrack.enabled);
        setIsMicOn(audioTrack.enabled);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC
      initializeWebRTC(stream);
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      
      // Try to get audio only if video fails
      if (error.name === 'NotAllowedError') {
        setError('Camera/microphone access denied. Please allow permissions and refresh.');
      } else if (error.name === 'NotFoundError') {
        setError('No camera or microphone found. Please check your devices.');
      } else {
        setError('Failed to access camera/microphone: ' + error.message);
      }
      
      setIsConnecting(false);
    }
  };

  const initializeWebRTC = (stream: MediaStream) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    console.log('WebRTC peer connection created');

    // Add local stream tracks
    stream.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track.kind, track.enabled);
      peerConnection.addTrack(track, stream);
    });
    
    // Log all senders to verify tracks are added
    setTimeout(() => {
      const senders = peerConnection.getSenders();
      console.log('Peer connection senders:', senders.map(s => ({
        track: s.track?.kind,
        enabled: s.track?.enabled
      })));
    }, 1000);

    // Handle incoming streams
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream:', event.streams[0]);
      console.log('Remote stream tracks:', event.streams[0].getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      console.log('Number of streams:', event.streams.length);
      
      if (event.streams && event.streams.length > 0) {
        const stream = event.streams[0];
        console.log('Setting remote stream with tracks:', stream.getTracks().length);
        setRemoteStream(stream);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          // Ensure the video plays
          remoteVideoRef.current.play().catch(e => console.log('Video play error:', e));
        }
        setIsConnecting(false);
      } else {
        console.warn('No streams in track event');
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        console.log('WebRTC connection established successfully!');
        setIsConnecting(false);
      } else if (peerConnection.connectionState === 'failed') {
        console.log('WebRTC connection failed');
        setError('Connection failed. Please try again.');
        setIsConnecting(false);
        
        // Retry connection after 5 seconds
        setTimeout(() => {
          if (isConnecting) {
            console.log('Retrying connection...');
            createOffer();
          }
        }, 5000);
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'connected') {
        console.log('ICE connection established!');
        setIsConnecting(false);
      } else if (peerConnection.iceConnectionState === 'failed') {
        console.log('ICE connection failed');
        setError('ICE connection failed. Please try again.');
        setIsConnecting(false);
      }
    };

    // Handle ICE gathering state changes
    peerConnection.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', peerConnection.iceGatheringState);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('Sending ICE candidate');
        socket.emit('webrtc-signal', {
          roomId,
          signal: { type: 'ice-candidate', candidate: event.candidate },
          targetUserId: partner.userId
        });
      } else if (!event.candidate) {
        console.log('ICE gathering complete');
      }
    };

    // Create and send offer after a short delay to ensure both users are ready
    // Use a random delay to avoid both users creating offers at the same time
    const randomDelay = Math.random() * 2000 + 1000; // 1-3 seconds
    console.log(`Will create offer in ${randomDelay}ms`);
    
    setTimeout(() => {
      if (isConnecting && !hasCreatedOffer && !hasReceivedOffer) {
        console.log('Creating initial offer...');
        createOffer();
      }
    }, randomDelay);
  };

  const createOffer = async () => {
    if (!peerConnectionRef.current || hasCreatedOffer) return;

    try {
      console.log('Creating WebRTC offer...');
      setHasCreatedOffer(true);
      
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      if (socket) {
        console.log('Sending offer to partner:', partner.userId);
        socket.emit('webrtc-signal', {
          roomId,
          signal: { type: 'offer', sdp: offer },
          targetUserId: partner.userId
        });
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      setError('Failed to create connection offer');
      setHasCreatedOffer(false);
    }
  };

  const handleWebRTCSignal = async (data: WebRTCSignalData) => {
    if (!peerConnectionRef.current) {
      console.log('No peer connection available, initializing...');
      return;
    }

    try {
      const { signal } = data;
      console.log('Processing signal:', signal.type);

      if (signal.type === 'offer' && signal.sdp) {
        console.log('Setting remote description (offer)');
        setHasReceivedOffer(true);
        
        // Check if we already have a remote description
        if (peerConnectionRef.current.remoteDescription) {
          console.log('Already have remote description, ignoring offer');
          return;
        }
        
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        console.log('Remote description set successfully');
        
        console.log('Creating answer');
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        console.log('Local description set successfully');

        if (socket) {
          console.log('Sending answer to partner:', partner.userId);
          socket.emit('webrtc-signal', {
            roomId,
            signal: { type: 'answer' as const, sdp: answer },
            targetUserId: partner.userId
          });
        }
      } else if (signal.type === 'answer' && signal.sdp) {
        console.log('Setting remote description (answer)');
        
        // Check if we already have a remote description
        if (peerConnectionRef.current.remoteDescription) {
          console.log('Already have remote description, ignoring answer');
          return;
        }
        
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        console.log('Remote description (answer) set successfully');
      } else if (signal.type === 'ice-candidate' && signal.candidate) {
        console.log('Adding ICE candidate');
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
          console.log('ICE candidate added successfully');
        } catch (iceError) {
          console.warn('Failed to add ICE candidate:', iceError);
          // This is often not critical, so we don't set an error
        }
      }
    } catch (error) {
      console.error('Error handling WebRTC signal:', error);
      setError('Connection error: ' + (error as Error).message);
      
      // If we fail to handle an offer, try to create our own offer
      if (data.signal.type === 'offer') {
        console.log('Failed to handle offer, creating our own offer...');
        setHasReceivedOffer(false);
        setTimeout(() => {
          if (isConnecting && peerConnectionRef.current && !hasCreatedOffer) {
            createOffer();
          }
        }, 2000);
      }
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const newState = !audioTrack.enabled;
        audioTrack.enabled = newState;
        setIsMicOn(newState);
        console.log('Microphone toggled:', newState ? 'ON' : 'OFF');
        
        // Update WebRTC connection if it exists
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const audioSender = senders.find(sender => sender.track?.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(audioTrack);
          }
        }
      } else {
        console.error('No audio track found');
      }
    } else {
      console.error('No local stream available');
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const newState = !videoTrack.enabled;
        videoTrack.enabled = newState;
        setIsVideoOn(newState);
        console.log('Video toggled:', newState ? 'ON' : 'OFF');
        
        // Update WebRTC connection if it exists
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const videoSender = senders.find(sender => sender.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(videoTrack);
          }
        }
      } else {
        console.error('No video track found');
      }
    } else {
      console.error('No local stream available');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !socket) return;

    try {
      await axios.post('/api/random-connections/send-message', {
        roomId,
        message: newMessage.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Add message to local state
      const newMsg: Message = {
        sender: user?._id || '',
        message: newMessage.trim(),
        timestamp: new Date(),
        isOwn: true
      };
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={partner.avatar || '/default-avatar.png'} 
                alt={partner.displayName}
                className="w-12 h-12 rounded-full border-2 border-blue-400"
              />
              <div>
                <h2 className="text-xl font-semibold text-white">{partner.displayName}</h2>
                <p className="text-gray-300">@{partner.username} • {games[selectedGame]}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onNextMatch}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Next Match"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={onDisconnect}
                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Disconnect"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Video Area */}
          <div className="flex-1 relative">
            {error && (
              <div className="absolute top-4 left-4 right-4 z-10 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {isConnecting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                  <p className="text-white mb-2">Connecting...</p>
                  <p className="text-gray-300 text-sm mb-4">Waiting for partner to join</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        console.log('Manual retry triggered');
                        setHasCreatedOffer(false);
                        setHasReceivedOffer(false);
                        if (peerConnectionRef.current) {
                          createOffer();
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Retry Connection
                    </button>
                    <button
                      onClick={() => {
                        console.log('Force new offer triggered');
                        setHasCreatedOffer(false);
                        setHasReceivedOffer(false);
                        if (peerConnectionRef.current) {
                          // Force a new offer
                          peerConnectionRef.current.restartIce();
                          setTimeout(() => {
                            createOffer();
                          }, 1000);
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Force New Offer
                    </button>
                    <button
                      onClick={() => {
                        console.log('Reinitialize connection triggered');
                        // Clean up and reinitialize
                        if (peerConnectionRef.current) {
                          peerConnectionRef.current.close();
                        }
                        setHasCreatedOffer(false);
                        setHasReceivedOffer(false);
                        setRemoteStream(null);
                        setIsConnecting(true);
                        // Reinitialize after a short delay
                        setTimeout(() => {
                          if (localStream) {
                            initializeWebRTC(localStream);
                          }
                        }, 1000);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Reinitialize Connection
                    </button>
                    <button
                      onClick={() => {
                        console.log('=== DEBUG INFO ===');
                        console.log('Local stream:', localStream);
                        console.log('Remote stream:', remoteStream);
                        console.log('Peer connection:', peerConnectionRef.current);
                        if (peerConnectionRef.current) {
                          console.log('Connection state:', peerConnectionRef.current.connectionState);
                          console.log('ICE state:', peerConnectionRef.current.iceConnectionState);
                          console.log('Senders:', peerConnectionRef.current.getSenders());
                          console.log('Receivers:', peerConnectionRef.current.getReceivers());
                        }
                        console.log('Has created offer:', hasCreatedOffer);
                        console.log('Has received offer:', hasReceivedOffer);
                        console.log('Is connecting:', isConnecting);
                        console.log('Partner:', partner);
                        console.log('==================');
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Debug Info
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Remote Video */}
            <div className="w-full h-full bg-black">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={false}
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => console.log('Remote video metadata loaded')}
                  onCanPlay={() => console.log('Remote video can play')}
                  onError={(e) => console.error('Remote video error:', e)}
                  onLoadStart={() => console.log('Remote video load started')}
                  onLoadedData={() => console.log('Remote video data loaded')}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    {partner.avatar ? (
                      <img 
                        src={partner.avatar} 
                        alt={partner.displayName}
                        className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-blue-400"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-blue-400">
                        {getInitials(partner.displayName)}
                      </div>
                    )}
                    <p className="text-white text-xl font-semibold">{partner.displayName}</p>
                    <p className="text-gray-400 text-sm">
                      {isConnecting ? 'Connecting...' : 'Video is off'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-white/20">
              {localStream && isVideoOn ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-700">
                  {user?.profile?.avatar ? (
                    <img 
                      src={user.profile.avatar} 
                      alt="Your Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                        {getInitials(user?.profile?.displayName || user?.username || 'You')}
                      </div>
                      <p className="text-white text-xs">You</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
              <button
                onClick={toggleMic}
                className={`p-4 rounded-full transition-colors ${
                  isMicOn ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-red-600 text-white hover:bg-red-700'
                }`}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-colors ${
                  isVideoOn ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-red-600 text-white hover:bg-red-700'
                }`}
                title={isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
              >
                {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>

              <button
                onClick={onNextMatch}
                className="p-4 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                title="Next Match"
              >
                <SkipForward className="w-6 h-6" />
              </button>

              <button
                onClick={onDisconnect}
                className="p-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>

            {/* Status Indicators */}
            <div className="absolute top-4 left-4 flex items-center space-x-2">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                isMicOn ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {isMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                <span>{isMicOn ? 'Mic ON' : 'Mic OFF'}</span>
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                isVideoOn ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {isVideoOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                <span>{isVideoOn ? 'Video ON' : 'Video OFF'}</span>
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                remoteStream ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
              }`}>
                <span>{remoteStream ? 'Remote ON' : 'Remote OFF'}</span>
              </div>
              {peerConnectionRef.current && (
                <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300">
                  <span>PC: {peerConnectionRef.current.connectionState}</span>
                </div>
              )}
              {peerConnectionRef.current && (
                <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300">
                  <span>ICE: {peerConnectionRef.current.iceConnectionState}</span>
                </div>
              )}
            </div>
          </div>

          {/* Chat Sidebar - Always Visible */}
          <div className="w-80 bg-white/10 backdrop-blur-lg border-l border-white/10 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Chat</h3>
            </div>

            {/* Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs p-3 rounded-lg ${
                    msg.isOwn 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-white'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 p-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchInterface;
