import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: any | null;
  isConnected: boolean;
  joinUserRoom: (userId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const socketRef = useRef<any | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const joinUserRoom = (userId: string) => {
    if (socket && isConnected && userId) {
      socket.emit('join-user-room', userId);
      console.log('Joined user room for notifications:', userId);
    }
  };

  const cleanupSocket = () => {
    if (socketRef.current) {
      // Remove all event listeners
      socketRef.current.removeAllListeners();
      
      // Disconnect socket
      if (socketRef.current.connected) {
        socketRef.current.disconnect();
      }
      
      socketRef.current = null;
    }
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setSocket(null);
    setIsConnected(false);
  };

  const createSocketConnection = () => {
    if (!user) return;

    try {
      // Clean up existing connection first
      cleanupSocket();

      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping socket connection');
        return;
      }

      const newSocket = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      socketRef.current = newSocket;

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Connected to server');
        
        // Join user room for notifications
        if (user._id) {
          newSocket.emit('join-user-room', user._id);
        }
      });

      newSocket.on('disconnect', (reason: string) => {
        setIsConnected(false);
        console.log('Disconnected from server:', reason);
        
        // Attempt to reconnect if not a manual disconnect
        if (reason !== 'io client disconnect' && user) {
          console.log('Attempting to reconnect...');
          reconnectTimeoutRef.current = setTimeout(() => {
            createSocketConnection();
          }, 3000);
        }
      });

      newSocket.on('connect_error', (error: Error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        
        // Retry connection after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          createSocketConnection();
        }, 5000);
      });

      // Listen for real-time notifications
      newSocket.on('new-notification', (notification: any) => {
        console.log('Received real-time notification:', notification);
        // You can add a global notification state here if needed
        // For now, the notification dropdown will fetch on next poll
      });

      // Handle other socket events
      newSocket.on('new-message', (message: any) => {
        console.log('Received new message:', message);
      });

      newSocket.on('user-typing', (user: any) => {
        console.log('User typing:', user);
      });

      newSocket.on('user-stopped-typing', (user: any) => {
        console.log('User stopped typing:', user);
      });

      newSocket.on('user-status-change', (data: any) => {
        console.log('User status change:', data);
      });

      setSocket(newSocket);

    } catch (error) {
      console.error('Error creating socket connection:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (user && user._id) {
      createSocketConnection();
    } else {
      cleanupSocket();
    }

    // Cleanup on unmount or user change
    return () => {
      cleanupSocket();
    };
  }, [user?._id]); // Only recreate connection when user ID changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSocket();
    };
  }, []);

  const value = {
    socket,
    isConnected,
    joinUserRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
