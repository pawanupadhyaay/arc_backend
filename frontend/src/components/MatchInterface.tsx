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
  const [isConnectionSuccessful, setIsConnectionSuccessful] = useState(false);

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

    // Listen for video state changes from partner
    socket.on('video-state-change', (data: { fromUserId: string; videoEnabled: boolean }) => {
      console.log('Received video state change from partner:', data);
      if (data.fromUserId === partner.userId) {
        console.log('Partner video state changed to:', data.videoEnabled ? 'ON' : 'OFF');
        
        // Force refresh the remote video element to show/hide partner's video
        if (remoteVideoRef.current && remoteStream) {
          // Temporarily remove and re-add the stream to force refresh
          remoteVideoRef.current.srcObject = null;
          setTimeout(() => {
            if (remoteVideoRef.current && remoteStream) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch(e => console.log('Remote video refresh error:', e));
            }
          }, 100);
        }
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
    
    // Listen for room joined confirmation
    socket.on('room-joined', (data: { roomId: string }) => {
      console.log('Joined room:', data.roomId);
      // When we join the room, if we're the first one, wait for partner
      // If we're the second one, the partner should already be there
      setTimeout(() => {
        if (isConnecting && peerConnectionRef.current && !hasCreatedOffer && !hasReceivedOffer) {
          console.log('Room joined, checking if partner is already there...');
          // Try to create offer after a short delay
          setTimeout(() => {
            if (isConnecting && !hasCreatedOffer && !hasReceivedOffer) {
              console.log('Creating offer after room join delay');
              createOffer();
            }
          }, 1000);
        }
      }, 500);
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
      if (isConnecting && !remoteStream && !isConnectionSuccessful && peerConnectionRef.current?.connectionState !== 'connected') {
        console.log('Connection timeout - stopping connecting state');
        setIsConnecting(false);
        setError('Connection timeout. Please try again or use the retry button.');
      }
    }, 25000); // 25 seconds timeout
    
    // Also set a shorter timeout to force retry if no progress
    const retryTimeout = setTimeout(() => {
      if (isConnecting && peerConnectionRef.current && 
          peerConnectionRef.current.connectionState === 'new' && 
          !hasCreatedOffer && !hasReceivedOffer && !remoteStream && !isConnectionSuccessful) {
        console.log('No progress made, forcing retry...');
        createOffer();
      }
    }, 8000); // 8 seconds timeout
    
    // Set another timeout to force retry if still connecting after 12 seconds
    const forceRetryTimeout = setTimeout(() => {
      if (isConnecting && peerConnectionRef.current && !remoteStream && !isConnectionSuccessful) {
        console.log('Still connecting after 12 seconds, forcing complete retry...');
        setHasCreatedOffer(false);
        setHasReceivedOffer(false);
        createOffer();
      }
    }, 12000); // 12 seconds timeout

    return () => {
      clearTimeout(connectionTimeout);
      clearTimeout(retryTimeout);
      clearTimeout(forceRetryTimeout);
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
      
      // Clear any connection errors since we have a remote stream
      setError('');
      setIsConnecting(false);
      
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

  // Effect to handle local stream changes
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('Setting local video stream');
      localVideoRef.current.srcObject = localStream;
      
      // Try to play the video
      const playPromise = localVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Local video started playing successfully');
          })
          .catch(e => {
            console.log('Local video play error:', e);
          });
      }
    }
  }, [localStream]);

  const initializeMedia = async () => {
    try {
      // First try with video and audio
      let constraints = {
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

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (videoError) {
        console.log('Video failed, trying audio only:', videoError);
        // If video fails, try audio only
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        setIsVideoOn(false);
      }

      setLocalStream(stream);

      // Set initial video state based on videoEnabled prop
      if (!videoEnabled) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          setIsVideoOn(false);
        }
      } else {
        // Ensure video is enabled if videoEnabled is true
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          setIsVideoOn(true);
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
        // Try to play the video immediately
        localVideoRef.current.play().catch(e => console.log('Initial local video play error:', e));
      }

      // Initialize WebRTC
      initializeWebRTC(stream);
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      
      if (error.name === 'NotAllowedError') {
        setError('Camera/microphone access denied. Please allow permissions and refresh.');
      } else if (error.name === 'NotFoundError') {
        setError('No camera or microphone found. Please check your devices.');
      } else if (error.name === 'NotReadableError' || error.message.includes('Device in use')) {
        setError('Camera/microphone is in use by another application. Please close other apps using camera/microphone and try again.');
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
      console.log('Adding track to peer connection:', track.kind, track.enabled, track.readyState);
      const sender = peerConnection.addTrack(track, stream);
      console.log('Track sender created:', sender);
      
      // Ensure track is enabled
      if (track.readyState === 'live') {
        track.enabled = true;
      }
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
        
        // Ensure video tracks are enabled
        stream.getVideoTracks().forEach(track => {
          console.log('Remote video track:', track.kind, track.enabled, track.readyState);
          if (track.readyState === 'live') {
            track.enabled = true;
            // Add event listener for track ended
            track.onended = () => {
              console.log('Remote video track ended');
            };
            track.onmute = () => {
              console.log('Remote video track muted');
            };
            track.onunmute = () => {
              console.log('Remote video track unmuted');
            };
          }
        });
        
        // Ensure audio tracks are enabled
        stream.getAudioTracks().forEach(track => {
          console.log('Remote audio track:', track.kind, track.enabled, track.readyState);
          if (track.readyState === 'live') {
            track.enabled = true;
          }
        });
        
        setRemoteStream(stream);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          // Ensure the video plays
          remoteVideoRef.current.play().catch(e => console.log('Video play error:', e));
        }
        
        // Stop connecting state and clear errors immediately
        setIsConnecting(false);
        setIsConnectionSuccessful(true);
        setError(''); // Clear any errors immediately
        console.log('Connection established successfully!');
        
        // Double-check to clear any remaining errors after a short delay
        setTimeout(() => {
          setError('');
        }, 500);
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
        setError(''); // Clear any errors
      } else if (peerConnection.connectionState === 'connecting') {
        console.log('WebRTC connection is connecting...');
        // Don't set error yet, let it try to connect
      } else if (peerConnection.connectionState === 'failed') {
        console.log('WebRTC connection failed');
        // Only show error if we don't have a remote stream
        if (!remoteStream) {
          setError('Connection failed. Please try again.');
        }
        setIsConnecting(false);
        
        // Retry connection after 5 seconds only if no remote stream
        setTimeout(() => {
          if (isConnecting && !remoteStream) {
            console.log('Retrying connection...');
            setHasCreatedOffer(false);
            setHasReceivedOffer(false);
            createOffer();
          }
        }, 5000);
      } else if (peerConnection.connectionState === 'disconnected') {
        console.log('WebRTC connection disconnected');
        // Only show error if we don't have a remote stream
        if (!remoteStream) {
          setError('Connection lost. Please try again.');
        }
        setIsConnecting(false);
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'connected') {
        console.log('ICE connection established!');
        setIsConnecting(false);
        setError(''); // Clear any errors
      } else if (peerConnection.iceConnectionState === 'checking') {
        console.log('ICE connection checking...');
        // This is normal, let it continue
      } else if (peerConnection.iceConnectionState === 'failed') {
        console.log('ICE connection failed');
        // Only show error if we don't have a remote stream
        if (!remoteStream) {
          setError('ICE connection failed. Please try again.');
        }
        setIsConnecting(false);
        
        // Try to restart ICE only if no remote stream
        setTimeout(() => {
          if (peerConnectionRef.current && isConnecting && !remoteStream) {
            console.log('Restarting ICE...');
            peerConnectionRef.current.restartIce();
            setHasCreatedOffer(false);
            setHasReceivedOffer(false);
            createOffer();
          }
        }, 3000);
      } else if (peerConnection.iceConnectionState === 'disconnected') {
        console.log('ICE connection disconnected');
        // Only show error if we don't have a remote stream
        if (!remoteStream) {
          setError('ICE connection lost. Please try again.');
        }
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
    
    // Also try to create offer when partner joins the room
    // This ensures we don't miss the partner joining event
  };

  const createOffer = async () => {
    if (!peerConnectionRef.current || hasCreatedOffer) return;

    try {
      console.log('Creating WebRTC offer...');
      setHasCreatedOffer(true);
      
      const offer = await peerConnectionRef.current.createOffer();
      console.log('Offer created:', offer);
      
      await peerConnectionRef.current.setLocalDescription(offer);
      console.log('Local description set');

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
        
        // Force refresh the local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        
        // Update WebRTC connection if it exists
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const videoSender = senders.find(sender => sender.track?.kind === 'video');
          if (videoSender) {
            console.log('Replacing video track in WebRTC connection');
            videoSender.replaceTrack(videoTrack).then(() => {
              console.log('Video track replaced successfully');
            }).catch(error => {
              console.error('Error replacing video track:', error);
            });
          } else {
            console.warn('No video sender found in WebRTC connection');
          }
        }
        
        // Also notify the partner about the video state change
        if (socket) {
          socket.emit('video-state-change', {
            roomId,
            videoEnabled: newState,
            targetUserId: partner.userId
          });
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
    // Reset states
    setIsConnecting(false);
    setHasCreatedOffer(false);
    setHasReceivedOffer(false);
    setRemoteStream(null);
    setIsConnectionSuccessful(false);
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-b border-white/20 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img 
                  src={partner.avatar || '/default-avatar.png'} 
                  alt={partner.displayName}
                  className="w-14 h-14 rounded-full border-3 border-blue-400 shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-900"></div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{partner.displayName}</h2>
                <p className="text-gray-300 font-medium">@{partner.username} • {games[selectedGame]}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onNextMatch}
                className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:scale-105"
                title="Next Match"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={onDisconnect}
                className="p-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:scale-105"
                title="Disconnect"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex p-6">
          {/* Video Area */}
          <div className="flex-1 relative rounded-2xl overflow-hidden shadow-2xl">
            {error && !isConnectionSuccessful && (
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
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black relative overflow-hidden rounded-2xl">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={false}
                  className="w-full h-full object-cover rounded-2xl"
                  onLoadedMetadata={() => console.log('Remote video metadata loaded')}
                  onCanPlay={() => console.log('Remote video can play')}
                  onError={(e) => console.error('Remote video error:', e)}
                  onLoadStart={() => console.log('Remote video load started')}
                  onLoadedData={() => console.log('Remote video data loaded')}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl">
                  <div className="text-center p-8">
                    {partner.avatar ? (
                      <div className="relative">
                        <img 
                          src={partner.avatar} 
                          alt={partner.displayName}
                          className="w-40 h-40 rounded-full mx-auto mb-6 border-4 border-blue-400 shadow-2xl"
                        />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-900"></div>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="w-40 h-40 rounded-full mx-auto mb-6 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 flex items-center justify-center text-white text-5xl font-bold border-4 border-blue-400 shadow-2xl">
                          {getInitials(partner.displayName)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-gray-900"></div>
                      </div>
                    )}
                    <h3 className="text-white text-2xl font-bold mb-2">{partner.displayName}</h3>
                    <p className="text-gray-300 text-lg">
                      {isConnecting ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mr-2"></div>
                          Connecting...
                        </span>
                      ) : (
                        'Video is off'
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-6 right-6 w-56 h-40 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden border-4 border-white/30 shadow-2xl">
              {localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                  {user?.profile?.avatar ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={user.profile.avatar} 
                        alt="Your Avatar"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-gradient-to-br from-green-500 via-blue-600 to-purple-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {getInitials(user?.profile?.displayName || user?.username || 'You')}
                      </div>
                      <p className="text-white text-sm font-medium">You</p>
                    </div>
                  )}
                </div>
              )}
              {/* Video status indicator */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded-full">
                <span className="text-white text-xs font-medium">
                  {isVideoOn ? 'Video ON' : 'Video OFF'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-6">
              <button
                onClick={toggleMic}
                className={`p-5 rounded-full transition-all duration-200 shadow-lg hover:scale-110 ${
                  isMicOn 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700' 
                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                }`}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicOn ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-5 rounded-full transition-all duration-200 shadow-lg hover:scale-110 ${
                  isVideoOn 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700' 
                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                }`}
                title={isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
              >
                {isVideoOn ? <Video className="w-7 h-7" /> : <VideoOff className="w-7 h-7" />}
              </button>

              <button
                onClick={onNextMatch}
                className="p-5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:scale-110"
                title="Next Match"
              >
                <SkipForward className="w-7 h-7" />
              </button>

              <button
                onClick={onDisconnect}
                className="p-5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:scale-110"
                title="End Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>

            {/* Status Indicators - Removed for cleaner UI */}
          </div>

          {/* Chat Sidebar - Always Visible */}
          <div className="w-80 bg-gradient-to-b from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-l border-white/20 flex flex-col shadow-2xl">
            {/* Chat Header */}
            <div className="p-6 border-b border-white/20 bg-gradient-to-r from-gray-800/50 to-gray-700/50">
              <h3 className="text-xl font-bold text-white flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                Chat
              </h3>
            </div>

            {/* Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs p-4 rounded-2xl shadow-lg ${
                    msg.isOwn 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                      : 'bg-gradient-to-r from-gray-700 to-gray-800 text-white border border-gray-600'
                  }`}>
                    <p className="text-sm font-medium">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-white/20 bg-gradient-to-r from-gray-800/50 to-gray-700/50">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all duration-200"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:scale-105"
                >
                  <Send className="w-5 h-5" />
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
