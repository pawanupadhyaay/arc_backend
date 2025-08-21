import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Sparkles,
  Clock,
  Image,
  Video,
  Trash2,
  Edit,
  Bookmark,
  Flag,
  UserMinus
} from 'lucide-react';
import axios from 'axios';

interface Post {
  _id: string;
  content: {
    text: string;
    media: Array<{
      type: 'image' | 'video';
      url: string;
      publicId: string;
    }>;
  };
  author: {
    _id: string;
    username: string;
    profilePicture?: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
    userType?: 'player' | 'team';
    role?: 'player' | 'team';
  };
  postType: 'general' | 'recruitment' | 'achievement' | 'looking-for-team';
  likes: Array<{
    user: string;
    likedAt: string;
  }>;
  comments: Array<{
    user: {
      _id: string;
      username: string;
      profilePicture?: string;
      profile?: {
        displayName?: string;
        avatar?: string;
      };
    };
    text: string;
    createdAt: string;
  }>;
  createdAt: string;
}

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onUpdate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(post.likes.some(like => like.user === user?._id));
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content.text);
  const [isSaving, setIsSaving] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Helper function to get display name
  const getDisplayName = (author: any) => {
    return author.profile?.displayName || author.username;
  };

  // Helper function to get profile picture
  const getProfilePicture = (author: any) => {
    return author.profile?.avatar || author.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzNzM3M0EiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTcuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM2QjZCNkIiLz4KPHBhdGggZD0iTTI4IDMwQzI4IDI2LjY4NjMgMjQuNDE4MyAyNCAyMCAyNEMxNS41ODE3IDI0IDEyIDI2LjY4NjMgMTIgMzBIMjhaIiBmaWxsPSIjNkI2QjZCIi8+Cjwvc3ZnPgo=';
  };

  const handleEditPost = () => {
    setIsEditing(true);
    setEditContent(post.content.text);
    setShowOptions(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    
    setIsSaving(true);
    try {
      await axios.put(`/api/posts/${post._id}`, { text: editContent });
      onUpdate(); // Refresh posts
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating post:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(post.content.text);
  };

  const handleReportPost = async () => {
    if (!window.confirm('Are you sure you want to report this post?')) return;
    
    try {
      await axios.post(`/api/posts/${post._id}/report`);
      alert('Post reported successfully');
      setShowOptions(false);
    } catch (error) {
      console.error('Error reporting post:', error);
    }
  };

  const handleUnfollowUser = async () => {
    if (!window.confirm(`Are you sure you want to unfollow ${getDisplayName(post.author)}?`)) return;
    
    try {
      await axios.delete(`/api/users/${post.author._id}/follow`);
      alert(`Unfollowed ${getDisplayName(post.author)}`);
      setShowOptions(false);
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const handleOptionsClick = () => {
    console.log('Options clicked, current state:', showOptions);
    setShowOptions(!showOptions);
  };



  const handleLike = async () => {
    try {
      if (isLiked) {
        await axios.delete(`/api/posts/${post._id}/like`);
        setLikeCount(prev => prev - 1);
      } else {
        await axios.post(`/api/posts/${post._id}/like`);
        setLikeCount(prev => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await axios.post(`/api/posts/${post._id}/comment`, { text: newComment });
      setNewComment('');
      onUpdate(); // Refresh posts to show new comment
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    setIsDeleting(true);
    try {
      await axios.delete(`/api/posts/${post._id}`);
      onUpdate(); // Refresh posts
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setIsDeleting(false);
      setShowOptions(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="gaming-card">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link to={`/profile/${post.author._id}`} className="group">
            <div className="relative">
              <img
                src={getProfilePicture(post.author)}
                alt={getDisplayName(post.author)}
                className="w-12 h-12 rounded-xl object-cover border-2 border-secondary-800 shadow-soft group-hover:shadow-glow transition-all duration-300"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary-500 rounded-full border-2 border-secondary-950 shadow-glow"></div>
            </div>
          </Link>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-1">
              <Link 
                to={`/profile/${post.author._id}`}
                className="font-bold text-white hover:text-primary-500 transition-colors"
              >
                {getDisplayName(post.author)}
              </Link>
            </div>
            <div className="flex items-center space-x-2 text-sm text-secondary-400">
              <Clock className="h-4 w-4" />
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative" ref={optionsRef}>
            <button 
              onClick={handleOptionsClick}
              className="p-2 hover:bg-secondary-900 rounded-xl transition-all duration-300"
            >
              <MoreHorizontal className="h-5 w-5 text-secondary-400" />
            </button>
            
                         {/* Options Dropdown */}
             {showOptions && (
               <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50">
                 {user?._id === post.author._id ? (
                   <>
                     <button
                       onClick={handleEditPost}
                       className="w-full flex items-center space-x-3 px-4 py-3 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors rounded-xl"
                     >
                       <Edit className="h-4 w-4" />
                       <span>Edit Post</span>
                     </button>
                     <button
                       onClick={handleDeletePost}
                       disabled={isDeleting}
                       className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors rounded-xl disabled:opacity-50"
                     >
                       <Trash2 className="h-4 w-4" />
                       <span>{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
                     </button>
                   </>
                 ) : (
                   <>
                     <button
                       onClick={handleUnfollowUser}
                       className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors rounded-xl"
                     >
                       <UserMinus className="h-4 w-4" />
                       <span>Unfollow</span>
                     </button>
                     <button
                       onClick={handleReportPost}
                       className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors rounded-xl"
                     >
                       <Flag className="h-4 w-4" />
                       <span>Report</span>
                     </button>
                   </>
                 )}
               </div>
             )}
          </div>
        </div>
      </div>

             {/* Post Content */}
       <div className="mb-6">
         {isEditing ? (
           <div className="space-y-4">
             <textarea
               value={editContent}
               onChange={(e) => setEditContent(e.target.value)}
               className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white resize-none"
               rows={4}
               placeholder="Edit your post..."
             />
             <div className="flex space-x-3">
               <button
                 onClick={handleSaveEdit}
                 disabled={isSaving || !editContent.trim()}
                 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
               >
                 {isSaving ? 'Saving...' : 'Save'}
               </button>
               <button
                 onClick={handleCancelEdit}
                 className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
               >
                 Cancel
               </button>
             </div>
           </div>
         ) : (
           <p className="text-white whitespace-pre-wrap leading-relaxed">{post.content.text}</p>
         )}
        
        {/* Media */}
        {post.content.media && post.content.media.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4">
            {post.content.media.map((media, index) => (
              <div key={index} className="relative group">
                {media.type === 'image' ? (
                  <img
                    src={media.url}
                    alt="Post media"
                    className="rounded-xl max-h-96 object-cover w-full shadow-soft group-hover:shadow-medium transition-all duration-300"
                  />
                ) : (
                  <video
                    src={media.url}
                    controls
                    className="rounded-xl max-h-96 object-cover w-full shadow-soft group-hover:shadow-medium transition-all duration-300"
                  />
                )}
                <div className="absolute top-3 right-3 bg-secondary-950/80 backdrop-blur-sm rounded-lg px-2 py-1 border border-secondary-800">
                  {media.type === 'image' ? (
                    <Image className="h-4 w-4 text-secondary-300" />
                  ) : (
                    <Video className="h-4 w-4 text-secondary-300" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-secondary-800">
        <div className="flex items-center space-x-6">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-2 transition-all duration-300 hover:scale-110 ${
              isLiked ? 'text-primary-500' : 'text-secondary-400 hover:text-primary-500'
            }`}
          >
            <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
            <span className="font-bold">{likeCount}</span>
          </button>
          
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 text-secondary-400 hover:text-primary-500 transition-all duration-300 hover:scale-110"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="font-bold">{post.comments.length}</span>
          </button>
          
          <button className="flex items-center space-x-2 text-secondary-400 hover:text-primary-500 transition-all duration-300 hover:scale-110">
            <Share2 className="h-6 w-6" />
            <span className="font-bold">Share</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-6 pt-6 border-t border-secondary-800">
          {/* Add Comment */}
          <form onSubmit={handleComment} className="mb-6">
            <div className="flex space-x-4">
              <img
                src={user?.profilePicture || user?.profile?.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMzNzM3M0EiLz4KPHBhdGggZD0iTTIwIDEwQzIyLjIwOTEgMTAgMjQgMTEuNzkwOSAyNCAxNEMyNCAxNi4yMDkxIDIyLjIwOTEgMTggMjAgMThDMTcuNzkwOSAxOCAxNiAxNi4yMDkxIDE2IDE0QzE2IDExLjc5MDkgMTcuNzkwOSAxMCAyMCAxMFoiIGZpbGw9IiM2QjZCNkIiLz4KPHBhdGggZD0iTTI4IDMwQzI4IDI2LjY4NjMgMjQuNDE4MyAyNCAyMCAyNEMxNS41ODE3IDI0IDEyIDI2LjY4NjMgMTIgMzBIMjhaIiBmaWlsPSIjNkI2QjZCIi8+Cjwvc3ZnPgo='}
                alt="Your profile"
                className="w-10 h-10 rounded-xl object-cover border-2 border-secondary-800 shadow-soft"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="input-field text-sm"
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="btn-small flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner w-4 h-4"></div>
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Post</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {post.comments.length > 0 ? (
              post.comments.map((comment, index) => (
                <div key={index} className="flex space-x-4">
                  <img
                    src={getProfilePicture(comment.user)}
                    alt={getDisplayName(comment.user)}
                    className="w-10 h-10 rounded-xl object-cover border-2 border-secondary-800 shadow-soft"
                  />
                  <div className="flex-1">
                    <div className="bg-secondary-900/50 rounded-xl p-4 border border-secondary-800">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-bold text-sm text-white">{getDisplayName(comment.user)}</span>
                        <span className="text-xs text-secondary-400 flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(comment.createdAt)}</span>
                        </span>
                      </div>
                      <p className="text-sm text-secondary-300 leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-secondary-400">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-secondary-500" />
                <p className="text-sm">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
