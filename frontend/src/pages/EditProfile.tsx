import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Camera, Save, X } from 'lucide-react';
import axios from 'axios';

interface EditProfileData {
  displayName: string;
  bio: string;
  location: string;
  website: string;
}

const EditProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<EditProfileData>({
    displayName: '',
    bio: '',
    location: '',
    website: ''
  });
  
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      // Check if user is editing their own profile
      if (user._id !== id) {
        navigate('/');
        return;
      }
      
      // Load current profile data
      setFormData({
        displayName: user.profile?.displayName || '',
        bio: user.profile?.bio || '',
        location: user.profile?.location || '',
        website: user.profile?.website || ''
      });
      
      if (user.profilePicture) {
        setAvatarPreview(user.profilePicture);
      }
    }
  }, [authLoading, user, id, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      setAvatar(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatar(null);
    setAvatarPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key as keyof EditProfileData]);
      });
      
      // Add avatar if selected
      if (avatar) {
        formDataToSend.append('avatar', avatar);
      }

      const response = await axios.put('/api/auth/profile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update local user data
      if (response.data.success) {
        navigate(`/profile/${user?._id}`);
        refreshUser(); // Refresh user data after successful update
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-dark-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-dark-700 rounded"></div>
            <div className="h-10 bg-dark-700 rounded"></div>
            <div className="h-10 bg-dark-700 rounded"></div>
            <div className="h-20 bg-dark-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-300" />
        </button>
        <h1 className="text-2xl font-bold gradient-text-neon">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <div className="card">
          <h3 className="font-medium text-gray-200 mb-4">Profile Picture</h3>
          
          <div className="flex items-center space-x-6">
            <div className="relative">
              <img
                src={avatarPreview || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjMzczNzNBIi8+CjxwYXRoIGQ9Ik01MCAyNUM1NS4yMjg0IDI1IDU5LjUgMjkuMjc3NiA1OS41IDM0LjVDNTkuNSAzOS43MjI0IDU1LjIyODQgNDQgNTAgNDRDNDQuNzc3NiA0NCA0MC41IDM5LjcyMjQgNDAuNSAzNC41QzQwLjUgMjkuMjc3NiA0NC43Nzc2IDI1IDUwIDI1WiIgZmlsbD0iIzZCNkI2QiIvPgo8cGF0aCBkPSJNNzAgNzVDNzAgNjUuODA5NSA2MS4xOTA1IDU3IDUwIDU3QzM4LjgwOTUgNTcgMzAgNjUuODA5NSAzMCA3NUg3MFoiIGZpbGw9IiM2QjZCNkIiLz4KPC9zdmc+Cg=='}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-dark-600 shadow-soft"
              />
              {avatarPreview && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="absolute -top-2 -right-2 p-1 bg-error-500 text-white rounded-full hover:bg-error-600 shadow-glow"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex-1">
              <label className="flex items-center space-x-2 px-4 py-2 border border-dark-600 rounded-lg cursor-pointer hover:bg-dark-700/50 transition-colors w-fit">
                <Camera className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Change Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-400 mt-2">
                JPG, PNG or GIF. Max size 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="card space-y-4">
          <h3 className="font-medium text-gray-200">Profile Information</h3>
          
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Enter your display name"
              maxLength={50}
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="input-field resize-none"
              placeholder="Tell us about yourself..."
              maxLength={500}
            />
            <p className="text-sm text-gray-400 mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Enter your location"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-1">
              Website
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className="input-field"
              placeholder="https://your-website.com"
              maxLength={200}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error-500/20 border border-error-500/30 rounded-lg p-4">
            <p className="text-error-300 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="cyber-button flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;
