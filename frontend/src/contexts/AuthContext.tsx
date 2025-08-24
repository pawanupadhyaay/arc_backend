import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import axios from 'axios';

interface User {
  _id: string;
  username: string;
  email: string;
  userType: 'player' | 'team';
  profile?: {
    displayName: string;
    bio?: string;
    location?: string;
    website?: string;
    avatar?: string;
    gamingPreferences?: string[];
    socialLinks?: {
      discord?: string;
      steam?: string;
      twitch?: string;
    };
  };
  profilePicture?: string;
  role?: 'player' | 'team';
  followers: string[];
  following: string[];
  createdAt: string;
}

// Helper function to transform backend user data to frontend format
const transformUserData = (userData: any): User => {
  return {
    ...userData,
    profilePicture: userData.profile?.avatar || userData.profilePicture,
    role: userData.userType || userData.role,
    followers: userData.followers || [],
    following: userData.following || []
  };
};

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUser: (userData: User) => void;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  userType: 'player' | 'team';
  displayName: string;
  bio?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authCheckRef = useRef<boolean>(false);
  const requestInterceptorRef = useRef<number | null>(null);
  const responseInterceptorRef = useRef<number | null>(null);

  // Set up axios defaults
  axios.defaults.baseURL = 'http://localhost:5000';

  // Add axios interceptors for authentication
  useEffect(() => {
    // Request interceptor to add token
    requestInterceptorRef.current = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    responseInterceptorRef.current = axios.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Clear token and user data on authentication error
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptors
    return () => {
      if (requestInterceptorRef.current !== null) {
        axios.interceptors.request.eject(requestInterceptorRef.current);
      }
      if (responseInterceptorRef.current !== null) {
        axios.interceptors.response.eject(responseInterceptorRef.current);
      }
    };
  }, []);

  // Check for stored token on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !authCheckRef.current) {
      authCheckRef.current = true;
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/me');
      setUser(transformUserData(response.data.data.user));
    } catch (error: any) {
      console.error('Auth check failed:', error);
      // Clear invalid token
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
      authCheckRef.current = false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data.data;
      
      // Clear any existing token first
      localStorage.removeItem('token');
      
      // Set new token and user
      localStorage.setItem('token', token);
      setUser(transformUserData(user));
      
      // Update axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/register', userData);
      const { token, user } = response.data.data;
      
      // Clear any existing token first
      localStorage.removeItem('token');
      
      // Set new token and user
      localStorage.setItem('token', token);
      setUser(transformUserData(user));
      
      // Update axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Cleanup any active random connections first
      try {
        await axios.post('/api/random-connections/cleanup');
      } catch (cleanupError) {
        console.error('Random connection cleanup failed:', cleanupError);
        // Continue with logout even if cleanup fails
      }

      // Call logout endpoint to invalidate token on server
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Clear local data regardless of server response
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(transformUserData(response.data.data.user));
    } catch (error: any) {
      console.error('Failed to refresh user:', error);
      // Don't clear token here, let the interceptor handle it
    }
  };

  const updateUser = (userData: User) => {
    setUser(transformUserData(userData));
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    refreshUser,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
