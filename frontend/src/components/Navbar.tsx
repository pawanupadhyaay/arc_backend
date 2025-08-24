import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Gamepad2, 
  Home, 
  Search, 
  MessageCircle, 
  User, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Crown,
  Settings,
  Trophy,
  Users
} from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-navbar backdrop-blur-xl border-b border-primary-500/20 shadow-navbar">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Section */}
          <Link to="/" className="flex items-center space-x-4 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-glow group-hover:shadow-glow-strong transition-all duration-300 group-hover:scale-110">
                <Gamepad2 className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-accent-500 to-primary-500 rounded-full animate-pulse shadow-glow"></div>
            </div>
                  <div className="hidden sm:block">
        <h2 className="text-2xl font-bold gradient-text-static">ARC</h2>
        <p className="text-xs text-secondary-400 font-medium">Elite Gaming Community</p>
      </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            <Link 
              to="/" 
              className={`flex flex-col items-center space-y-1 px-6 py-3 rounded-2xl transition-all duration-300 group ${
                isActive('/') 
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow' 
                  : 'text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10'
              }`}
            >
              <Home className={`h-5 w-5 group-hover:scale-110 transition-transform duration-300 ${isActive('/') ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-semibold">Home</span>
            </Link>
            
            <Link 
              to="/search" 
              className={`flex flex-col items-center space-y-1 px-6 py-3 rounded-2xl transition-all duration-300 group ${
                isActive('/search') 
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow' 
                  : 'text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10'
              }`}
            >
              <Search className={`h-5 w-5 group-hover:scale-110 transition-transform duration-300 ${isActive('/search') ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-semibold">Discover</span>
            </Link>
            
                         <Link 
               to="/messages" 
               className={`flex flex-col items-center space-y-1 px-6 py-3 rounded-2xl transition-all duration-300 group ${
                 isActive('/messages') 
                   ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow' 
                   : 'text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10'
               }`}
             >
               <MessageCircle className={`h-5 w-5 group-hover:scale-110 transition-transform duration-300 ${isActive('/messages') ? 'animate-pulse' : ''}`} />
               <span className="text-xs font-semibold">Messages</span>
             </Link>
             
             <Link 
               to="/tournaments" 
               className={`flex flex-col items-center space-y-1 px-6 py-3 rounded-2xl transition-all duration-300 group ${
                 isActive('/tournaments') 
                   ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow' 
                   : 'text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10'
               }`}
             >
               <Trophy className={`h-5 w-5 group-hover:scale-110 transition-transform duration-300 ${isActive('/tournaments') ? 'animate-pulse' : ''}`} />
               <span className="text-xs font-semibold">Tournaments</span>
             </Link>
             
             <Link 
               to="/random-connect" 
               className={`flex flex-col items-center space-y-1 px-6 py-3 rounded-2xl transition-all duration-300 group ${
                 isActive('/random-connect') 
                   ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow' 
                   : 'text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10'
               }`}
             >
               <Users className={`h-5 w-5 group-hover:scale-110 transition-transform duration-300 ${isActive('/random-connect') ? 'animate-pulse' : ''}`} />
               <span className="text-xs font-semibold">Random Connect</span>
             </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <NotificationDropdown />

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center space-x-4 p-3 hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10 rounded-2xl transition-all duration-300 group"
              >
                <div className="relative">
                  <img
                    src={user.profilePicture || user.profile?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzNzM3M0EiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTcuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM2QjZCNkIiLz4KPHBhdGggZD0iTTI4IDMwQzI4IDI2LjY4NjMgMjQuNDE4MyAyNCAyMCAyNEMxNS41ODE3IDI0IDEyIDI2LjY4NjMgMTIgMzBIMjhaIiBmaWxsPSIjNkI2QjZCIi8+Cjwvc3ZnPgo='}
                    alt="Profile"
                    className="w-10 h-10 rounded-2xl object-cover border-2 border-primary-500/30 group-hover:border-primary-500/60 transition-all duration-300 shadow-soft group-hover:shadow-glow"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-success-500 to-primary-500 rounded-full border-2 border-secondary-950 shadow-glow animate-pulse"></div>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-white font-bold text-sm">{user.username}</p>
                  <div className="flex items-center space-x-2">
                    <Crown className="h-3 w-3 text-accent-500" />
                    <p className="text-secondary-400 text-xs capitalize">{user.role || user.userType}</p>
                  </div>
                </div>
              </button>

              {/* Profile Dropdown */}
              {isMobileMenuOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-gradient-to-br from-secondary-950 to-secondary-900 backdrop-blur-xl rounded-2xl shadow-large border border-primary-500/20 z-50">
                  <div className="p-6">
                    <div className="flex items-center space-x-4 mb-6 pb-4 border-b border-primary-500/20">
                      <img
                        src={user.profilePicture || user.profile?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiMzNzM3M0EiLz4KPHBhdGggZD0iTTI0IDEyQzI2LjYyNjQgMTIgMjggMTMuMzczNiAyOCAxNkMyOCAxOC42MjY0IDI2LjYyNjQgMjAgMjQgMjBDMjEuMzczNiAyMCAyMCAxOC42MjY0IDIwIDE2QzIwIDEzLjM3MzYgMjEuMzczNiAxMiAyNCAxMloiIGZpbGw9IiM2QjZCNkIiLz4KPHBhdGggZD0iTTMzLjYgMzZDMzMuNiAzMS41ODI3IDI5LjMwMTYgMjggMjQgMjhDMTguNjk4NCAyOCAxNC40IDMxLjU4MjcgMTQuNCAzNkgzMy42WiIgZmlsbD0iIzZCNkI2QiIvPgo8L3N2Zz4K'}
                        alt="Profile"
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-primary-500/30 shadow-glow"
                      />
                      <div>
                        <p className="text-white font-bold">{user.username}</p>
                        <p className="text-secondary-400 text-sm capitalize">{user.role || user.userType}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-2 h-2 bg-gradient-to-r from-success-500 to-primary-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-secondary-400">Online</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Link
                        to={user.role === 'team' || user.userType === 'team' ? `/team/${user._id}` : `/profile/${user._id}`}
                        className="flex items-center space-x-3 p-3 text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10 rounded-xl transition-all duration-300 group"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-medium">{user.role === 'team' || user.userType === 'team' ? 'Team Profile' : 'Profile'}</span>
                      </Link>
                      

                      
                      <Link
                        to="/random-connect"
                        className="flex items-center space-x-3 p-3 text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10 rounded-xl transition-all duration-300 group"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Users className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-medium">Random Connect</span>
                      </Link>
                      
                      <Link
                        to="/settings"
                        className="flex items-center space-x-3 p-3 text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10 rounded-xl transition-all duration-300 group"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Settings className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-medium">Settings</span>
                      </Link>
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 p-3 text-error-500 hover:text-error-400 hover:bg-gradient-to-r hover:from-error-500/10 hover:to-error-600/10 rounded-xl transition-all duration-300 w-full text-left group"
                      >
                        <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-3 hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10 rounded-2xl transition-all duration-300"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-gradient-to-br from-secondary-950 to-secondary-900 backdrop-blur-xl border-t border-primary-500/20">
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Link
                  to="/"
                  className={`flex flex-col items-center space-y-2 p-4 rounded-2xl transition-all duration-300 group ${
                    isActive('/') 
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow' 
                      : 'text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Home className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-semibold text-sm">Home</span>
                </Link>
                <Link
                  to="/search"
                  className={`flex flex-col items-center space-y-2 p-4 rounded-2xl transition-all duration-300 group ${
                    isActive('/search') 
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow' 
                      : 'text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Search className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-semibold text-sm">Discover</span>
                </Link>
                <Link
                  to="/messages"
                  className={`flex flex-col items-center space-y-2 p-4 rounded-2xl transition-all duration-300 group ${
                    isActive('/messages') 
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow' 
                      : 'text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-semibold text-sm">Messages</span>
                </Link>
                <Link
                  to="/tournaments"
                  className={`flex flex-col items-center space-y-2 p-4 rounded-2xl transition-all duration-300 group ${
                    isActive('/tournaments') 
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow' 
                      : 'text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Trophy className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-semibold text-sm">Tournaments</span>
                </Link>
                <Link
                  to="/random-connect"
                  className={`flex flex-col items-center space-y-2 p-4 rounded-2xl transition-all duration-300 group ${
                    isActive('/random-connect') 
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow' 
                      : 'text-secondary-300 hover:text-white hover:bg-gradient-to-r hover:from-primary-500/10 hover:to-accent-500/10'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Users className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                  <span className="font-semibold text-sm">Random Connect</span>
                </Link>
              </div>
              
              <div className="flex items-center justify-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent"></div>
              </div>
              
                    <div className="text-center">
        <p className="text-secondary-400 text-sm">ARC Gaming Experience</p>
      </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
