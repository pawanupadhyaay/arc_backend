import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, 
  Image, 
  X,
  Send
} from 'lucide-react';
import axios from 'axios';

const CreatePost: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<File[]>([]);
  const [mediaPreview, setMediaPreview] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length + media.length > 5) {
      setError('Maximum 5 media files allowed');
      return;
    }

    setMedia([...media, ...validFiles]);
    
    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
    setMediaPreview(mediaPreview.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Please write some content');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const postData = new FormData();
      postData.append('text', content);
      postData.append('postType', 'general');
      
      media.forEach(file => {
        postData.append('media', file);
      });

      await axios.post('/api/posts', postData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error creating post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Simple Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-secondary-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-300" />
        </button>
        <h1 className="text-xl font-semibold text-white">Create Post</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-error-500/20 border border-error-500/30 text-error-300 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* User Info */}
        <div className="flex items-center space-x-3">
          <img
                            src={user?.profilePicture || user?.profile?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzNzM3M0EiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTcuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM2QjZCNkIiLz4KPHBhdGggZD0iTTI4IDMwQzI4IDI2LjY4NjMgMjQuNDE4MyAyNCAyMCAyNEMxNS41ODE3IDI0IDEyIDI2LjY4NjMgMTIgMzBIMjhaIiBmaWxsPSIjNkI2QjZCIi8+Cjwvc3ZnPgo='}
            alt="Your profile"
            className="w-10 h-10 rounded-lg object-cover"
          />
          <div>
            <p className="font-medium text-white">{user?.username || 'User'}</p>
            <p className="text-sm text-gray-400">Share your thoughts</p>
          </div>
        </div>

        {/* Content */}
        <div className="card">
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="What's happening in your gaming world?"
            rows={6}
            className="w-full bg-transparent border-none text-white placeholder-gray-400 resize-none focus:outline-none text-base"
            maxLength={1000}
          />
          
          <div className="flex justify-between items-center pt-3 border-t border-secondary-800">
            <span className="text-sm text-gray-400">
              {content.length}/1000
            </span>
            <div className="flex items-center space-x-2">
              <label className="p-2 hover:bg-secondary-800 rounded-lg cursor-pointer transition-colors">
                <Image className="h-5 w-5 text-gray-400" />
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleMediaUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Media Preview */}
        {mediaPreview.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {mediaPreview.map((preview, index) => (
              <div key={index} className="relative">
                <img
                  src={preview}
                  alt="Media preview"
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Post</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
