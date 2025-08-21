import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Settings as SettingsIcon, 
  Save, 
  ArrowLeft,
  Camera,
  MapPin,
  Mail,
  Gamepad2,
  Shield,
  Bell,
  Palette,
  Trash2
} from 'lucide-react';
import axios from 'axios';

interface ProfileFormData {
  displayName: string;
  bio: string;
  location: string;
  gamingPreferences: string[];
  socialLinks: {
    discord: string;
    steam: string;
    twitch: string;
  };
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: '',
    bio: '',
    location: '',
    gamingPreferences: [],
    socialLinks: {
      discord: '',
      steam: '',
      twitch: ''
    }
  });

  const [newGamingPreference, setNewGamingPreference] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.profile?.displayName || '',
        bio: user.profile?.bio || '',
        location: user.profile?.location || '',
        gamingPreferences: user.profile?.gamingPreferences || [],
        socialLinks: {
          discord: user.profile?.socialLinks?.discord || '',
          steam: user.profile?.socialLinks?.steam || '',
          twitch: user.profile?.socialLinks?.twitch || ''
        }
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialLinkChange = (platform: keyof ProfileFormData['socialLinks'], value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const addGamingPreference = () => {
    if (newGamingPreference.trim() && !formData.gamingPreferences.includes(newGamingPreference.trim())) {
      setFormData(prev => ({
        ...prev,
        gamingPreferences: [...prev.gamingPreferences, newGamingPreference.trim()]
      }));
      setNewGamingPreference('');
    }
  };

  const removeGamingPreference = (preference: string) => {
    setFormData(prev => ({
      ...prev,
      gamingPreferences: prev.gamingPreferences.filter(p => p !== preference)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await axios.put('/api/auth/profile', {
        displayName: formData.displayName,
        bio: formData.bio,
        location: formData.location,
        gamingPreferences: formData.gamingPreferences,
        socialLinks: formData.socialLinks
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        // Update the user context with new data
        if (updateUser) {
          updateUser(response.data.data.user);
        }
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update profile. Please try again.' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-12 bg-secondary-800 rounded-xl mb-6 shimmer"></div>
            <div className="space-y-4">
              <div className="h-32 bg-secondary-800 rounded-xl shimmer"></div>
              <div className="h-32 bg-secondary-800 rounded-xl shimmer"></div>
              <div className="h-32 bg-secondary-800 rounded-xl shimmer"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark pt-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
                                 <SettingsIcon className="h-8 w-8 text-primary-500" />
                <span>Settings</span>
              </h1>
              <p className="text-secondary-400 mt-1">Manage your profile and preferences</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === 'success' 
              ? 'bg-success-500/10 border border-success-500/20 text-success-400'
              : 'bg-error-500/10 border border-error-500/20 text-error-400'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Information */}
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <User className="h-5 w-5 text-primary-500" />
              <span>Profile Information</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary-800 border border-secondary-700 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your display name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-secondary-800 border border-secondary-700 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your location"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-secondary-300 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-secondary-800 border border-secondary-700 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>

          {/* Gaming Preferences */}
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Gamepad2 className="h-5 w-5 text-primary-500" />
              <span>Gaming Preferences</span>
            </h3>
            
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newGamingPreference}
                  onChange={(e) => setNewGamingPreference(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGamingPreference())}
                  className="flex-1 px-4 py-2 bg-secondary-800 border border-secondary-700 rounded-lg text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Add a gaming preference (e.g., FPS, RPG, Strategy)"
                />
                <button
                  type="button"
                  onClick={addGamingPreference}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Add
                </button>
              </div>
              
              {formData.gamingPreferences.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.gamingPreferences.map((preference, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-2 px-3 py-1 bg-primary-500/20 text-primary-400 rounded-lg border border-primary-500/30"
                    >
                      <span>{preference}</span>
                      <button
                        type="button"
                        onClick={() => removeGamingPreference(preference)}
                        className="text-primary-400 hover:text-primary-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Social Links */}
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Mail className="h-5 w-5 text-primary-500" />
              <span>Social Links</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">
                  Discord
                </label>
                <input
                  type="text"
                  value={formData.socialLinks.discord}
                  onChange={(e) => handleSocialLinkChange('discord', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary-800 border border-secondary-700 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Discord username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">
                  Steam
                </label>
                <input
                  type="text"
                  value={formData.socialLinks.steam}
                  onChange={(e) => handleSocialLinkChange('steam', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary-800 border border-secondary-700 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Steam profile URL"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-300 mb-2">
                  Twitch
                </label>
                <input
                  type="text"
                  value={formData.socialLinks.twitch}
                  onChange={(e) => handleSocialLinkChange('twitch', e.target.value)}
                  className="w-full px-4 py-3 bg-secondary-800 border border-secondary-700 rounded-xl text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Twitch channel"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
