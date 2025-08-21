import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Navbar from './components/Navbar';

// Lazy load components for better performance
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CreatePost = React.lazy(() => import('./pages/CreatePost'));
const Profile = React.lazy(() => import('./pages/Profile'));
const TeamProfile = React.lazy(() => import('./pages/TeamProfile'));
const EditProfile = React.lazy(() => import('./pages/EditProfile'));
const Messages = React.lazy(() => import('./pages/Messages'));
const Search = React.lazy(() => import('./pages/Search'));
const Tournaments = React.lazy(() => import('./pages/Tournaments'));
const Settings = React.lazy(() => import('./pages/Settings'));

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-black-950 via-gray-900 to-gray-800 flex items-center justify-center">
    <div className="text-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-primary-500 rounded-full animate-spin border-t-transparent"></div>
      </div>
      <h2 className="mt-6 text-2xl font-bold gradient-text">Loading...</h2>
      <p className="mt-2 text-gray-400">Preparing your gaming experience</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-black-950 via-gray-900 to-gray-800">
            <Navbar />
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<Dashboard />} />
                <Route path="/create-post" element={<CreatePost />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/team/:id" element={<TeamProfile />} />
                <Route path="/edit-profile/:id" element={<EditProfile />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/search" element={<Search />} />
                <Route path="/tournaments" element={<Tournaments />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
