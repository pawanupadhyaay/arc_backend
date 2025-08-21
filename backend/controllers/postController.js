const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadMultipleFiles } = require('../utils/cloudinary');

// Create new post
const createPost = async (req, res) => {
  try {
    const { text, postType, tags, visibility, recruitmentInfo, achievementInfo } = req.body;
    const authorId = req.user._id;

    // Handle media uploads
    let mediaData = [];
    if (req.files && req.files.length > 0) {
      try {
        // Check if Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
          return res.status(500).json({
            success: false,
            message: 'Media upload is not configured. Please setup Cloudinary credentials in .env file.',
            error: 'Cloudinary configuration missing'
          });
        }
        
        const uploadResults = await uploadMultipleFiles(req.files, 'gaming-social/posts');
        mediaData = uploadResults.map(result => ({
          type: result.type,
          url: result.url,
          publicId: result.publicId
        }));
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload media files',
          error: uploadError.message
        });
      }
    }

    // Create post data
    const postData = {
      author: authorId,
      content: {
        text,
        media: mediaData
      },
      postType: postType || 'general',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      visibility: visibility || 'public'
    };

    // Add recruitment info if it's a recruitment post
    if (postType === 'recruitment' && recruitmentInfo) {
      postData.recruitmentInfo = {
        gameTitle: recruitmentInfo.gameTitle,
        positions: recruitmentInfo.positions ? recruitmentInfo.positions.split(',').map(pos => pos.trim()) : [],
        requirements: recruitmentInfo.requirements,
        contactInfo: recruitmentInfo.contactInfo,
        deadline: recruitmentInfo.deadline ? new Date(recruitmentInfo.deadline) : null,
        isActive: true
      };
    }

    // Add achievement info if it's an achievement post
    if (postType === 'achievement' && achievementInfo) {
      postData.achievementInfo = {
        gameTitle: achievementInfo.gameTitle,
        achievementType: achievementInfo.achievementType,
        description: achievementInfo.description,
        date: achievementInfo.date ? new Date(achievementInfo.date) : new Date()
      };
    }

    const post = await Post.create(postData);
    
    // Populate author info
    await post.populate('author', 'username profile.displayName profile.avatar userType');

    // Add post to user's posts array
    await User.findByIdAndUpdate(authorId, {
      $push: { posts: post._id }
    });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: {
        post
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message
    });
  }
};

// Get all posts (feed)
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { postType, author, tags, visibility } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (postType) filter.postType = postType;
    if (author) filter.author = author;
    if (tags) filter.tags = { $in: tags.split(',') };
    if (visibility) filter.visibility = visibility;

    // If user is not authenticated, only show public posts
    if (!req.user) {
      filter.visibility = 'public';
    } else {
      // If user is authenticated, show public posts and their own posts
      if (!visibility) {
        filter.$or = [
          { visibility: 'public' },
          { author: req.user._id },
          { 
            visibility: 'followers',
            author: { $in: req.user.following }
          }
        ];
      }
    }

    const posts = await Post.find(filter)
      .populate('author', 'username profile.displayName profile.avatar userType')
      .populate('likes.user', 'username profile.displayName profile.avatar')
      .populate('comments.user', 'username profile.displayName profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        posts,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: posts.length,
          totalPosts: total
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
};

// Get single post by ID
const getPost = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId)
      .populate('author', 'username profile.displayName profile.avatar userType')
      .populate('likes.user', 'username profile.displayName profile.avatar')
      .populate('comments.user', 'username profile.displayName profile.avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check visibility permissions
    if (post.visibility === 'private' && post.author._id.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this post'
      });
    }

    if (post.visibility === 'followers' && 
        !req.user?.following.includes(post.author._id) && 
        post.author._id.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this post'
      });
    }

    // Increment view count
    post.views += 1;
    await post.save();

    res.status(200).json({
      success: true,
      data: {
        post
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};

// Like/Unlike post
const toggleLike = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user already liked the post
    const likeIndex = post.likes.findIndex(like => like.user.toString() === userId.toString());

    if (likeIndex > -1) {
      // Unlike the post
      post.likes.splice(likeIndex, 1);
    } else {
      // Like the post
      post.likes.push({ user: userId });

      // Create notification for post author (if not liking own post)
      if (post.author.toString() !== userId.toString()) {
        await Notification.createNotification({
          recipient: post.author,
          sender: userId,
          type: 'like',
          title: 'New Like',
          message: `${req.user.profile.displayName} liked your post`,
          data: {
            postId: post._id
          }
        });
      }
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: likeIndex > -1 ? 'Post unliked' : 'Post liked',
      data: {
        likeCount: post.likes.length,
        isLiked: likeIndex === -1
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like',
      error: error.message
    });
  }
};

// Add comment to post
const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Add comment
    const comment = {
      user: userId,
      text: text.trim(),
      likes: [],
      createdAt: new Date()
    };

    post.comments.push(comment);
    await post.save();

    // Populate the new comment
    await post.populate('comments.user', 'username profile.displayName profile.avatar');

    // Create notification for post author (if not commenting on own post)
    if (post.author.toString() !== userId.toString()) {
      await Notification.createNotification({
        recipient: post.author,
        sender: userId,
        type: 'comment',
        title: 'New Comment',
        message: `${req.user.profile.displayName} commented on your post`,
        data: {
          postId: post._id
        }
      });
    }

    const newComment = post.comments[post.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comment: newComment,
        commentCount: post.comments.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
};

// Update post
const updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { text, tags, visibility, recruitmentInfo } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own posts'
      });
    }

    // Update fields
    if (text !== undefined) post.content.text = text;
    if (tags !== undefined) post.tags = tags.split(',').map(tag => tag.trim());
    if (visibility !== undefined) post.visibility = visibility;

    // Update recruitment info if provided
    if (post.postType === 'recruitment' && recruitmentInfo) {
      post.recruitmentInfo = {
        ...post.recruitmentInfo,
        ...recruitmentInfo,
        positions: recruitmentInfo.positions ? recruitmentInfo.positions.split(',').map(pos => pos.trim()) : post.recruitmentInfo.positions
      };
    }

    await post.save();
    await post.populate('author', 'username profile.displayName profile.avatar userType');

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      data: {
        post
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: error.message
    });
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts'
      });
    }

    // Mark as inactive instead of actually deleting
    post.isActive = false;
    await post.save();

    // Remove from user's posts array
    await User.findByIdAndUpdate(userId, {
      $pull: { posts: postId }
    });

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
  }
};

// Report post
const reportPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user is trying to report their own post
    if (post.author.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report your own post'
      });
    }

    // Check if user has already reported this post
    const existingReport = post.reports?.find(report => report.user.toString() === userId.toString());
    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this post'
      });
    }

    // Add report to post
    if (!post.reports) post.reports = [];
    post.reports.push({
      user: userId,
      reason: req.body.reason || 'Inappropriate content',
      reportedAt: new Date()
    });

    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post reported successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to report post',
      error: error.message
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPost,
  toggleLike,
  addComment,
  updatePost,
  deletePost,
  reportPost
};
