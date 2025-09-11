const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');

// Upload image to cloudinary
const uploadImage = async (file, folder = 'gaming-social') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height
          });
        }
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

// Upload video to cloudinary
const uploadVideo = async (file, folder = 'gaming-social') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'video',
        eager: [
          { 
            width: 1280, 
            height: 720, 
            crop: 'fill',
            gravity: 'auto',
            quality: 'auto'
          }
        ],
        eager_async: true,
        eager_notification_url: null
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration,
            width: result.width,
            height: result.height
          });
        }
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

// Upload avatar (smaller size)
const uploadAvatar = async (file, folder = 'gaming-social/avatars') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id
          });
        }
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

// Delete file from cloudinary
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

// Upload multiple files
const uploadMultipleFiles = async (files, folder = 'gaming-social') => {
  const uploadPromises = files.map(file => {
    if (file.mimetype.startsWith('image/')) {
      return uploadImage(file, folder);
    } else if (file.mimetype.startsWith('video/')) {
      return uploadVideo(file, folder);
    } else {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }
  });

  try {
    const results = await Promise.all(uploadPromises);
    return results.map((result, index) => ({
      type: files[index].mimetype.startsWith('image/') ? 'image' : 'video',
      ...result
    }));
  } catch (error) {
    throw new Error(`Failed to upload files: ${error.message}`);
  }
};

module.exports = {
  uploadImage,
  uploadVideo,
  uploadAvatar,
  deleteFile,
  uploadMultipleFiles
};
