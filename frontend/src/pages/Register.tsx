import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Gamepad2, User, Users, Sparkles, ArrowRight, Shield, CheckCircle } from 'lucide-react';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'player' as 'player' | 'team',
    displayName: '',
    bio: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        userType: formData.userType,
        displayName: formData.displayName,
        bio: formData.bio
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="max-w-2xl w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-primary-500 rounded-xl flex items-center justify-center shadow-glow animate-bounce">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full animate-pulse shadow-glow"></div>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold gradient-text mb-2">
            Join GameConnect
          </h2>
          <p className="text-lg text-white mb-2">
            Create your account and start your gaming journey
          </p>
          <p className="text-sm text-secondary-400">
            Connect with players, build teams, and achieve greatness
          </p>
        </div>

        {/* Registration Form */}
        <div className="card-glass">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}

            {/* User Type Selection */}
            <div>
              <label className="form-label">Account Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: 'player' })}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center space-x-3 ${
                    formData.userType === 'player'
                      ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                      : 'border-secondary-800 bg-secondary-900/50 text-secondary-400 hover:border-primary-500/50'
                  }`}
                >
                  <User className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-bold">Player</div>
                    <div className="text-xs">Individual gamer</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: 'team' })}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center space-x-3 ${
                    formData.userType === 'team'
                      ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                      : 'border-secondary-800 bg-secondary-900/50 text-secondary-400 hover:border-primary-500/50'
                  }`}
                >
                  <Users className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-bold">Team</div>
                    <div className="text-xs">Gaming team</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="username" className="form-label">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Choose a username"
                />
              </div>
              <div>
                <label htmlFor="displayName" className="form-label">Display Name</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  required
                  className="input-field"
                  placeholder="Your display name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="bio" className="form-label">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                className="input-field resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="form-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="input-field pr-12"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-primary-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="input-field pr-12"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-primary-500 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="cyber-button w-full flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="loading-spinner w-5 h-5"></div>
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-secondary-400">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-500 hover:text-primary-400 font-bold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-primary-500/30">
              <Users className="h-6 w-6 text-primary-500" />
            </div>
            <h3 className="font-bold text-white mb-2">Connect</h3>
            <p className="text-sm text-secondary-400">Find teammates and build your gaming community</p>
          </div>
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-primary-500/30">
              <Gamepad2 className="h-6 w-6 text-primary-500" />
            </div>
            <h3 className="font-bold text-white mb-2">Play</h3>
            <p className="text-sm text-secondary-400">Join tournaments and compete with the best</p>
          </div>
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-primary-500/30">
              <Sparkles className="h-6 w-6 text-primary-500" />
            </div>
            <h3 className="font-bold text-white mb-2">Achieve</h3>
            <p className="text-sm text-secondary-400">Track your progress and celebrate victories</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
