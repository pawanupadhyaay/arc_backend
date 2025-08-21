# Environment Variables Setup

Create a `.env` file in the backend directory with the following variables:

## Server Configuration
```
PORT=5000
NODE_ENV=development
```

## MongoDB Configuration
```
MONGODB_URI=mongodb://localhost:27017/gaming-social-platform
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/gaming-social-platform
```

## JWT Configuration
```
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-here-make-it-long-and-random
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

## Cloudinary Configuration
```
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## Rate Limiting
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## File Upload Configuration
```
MAX_FILE_SIZE=10485760
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp
ALLOWED_VIDEO_TYPES=video/mp4,video/avi,video/mov,video/wmv
```

## CORS Configuration
```
CORS_ORIGIN=http://localhost:3000
# For production: https://yourdomain.com
```

## Optional: Redis Configuration (for session storage if needed later)
```
# REDIS_URL=redis://localhost:6379
```

## Optional: Email Configuration (for password reset, etc.)
```
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
```

## Steps to Setup:

1. **Create `.env` file**: In the backend directory, create a file named `.env`
2. **Copy the variables**: Copy all the variables above into your `.env` file
3. **Update values**: Replace the placeholder values with your actual credentials:
   - Get MongoDB URI from your MongoDB setup
   - Generate strong JWT secrets (you can use online generators)
   - Get Cloudinary credentials from your Cloudinary dashboard
   - Update CORS origin to match your frontend URL

## Important Notes:
- Never commit the `.env` file to version control
- Keep your JWT secrets secure and random
- For production, use strong, unique secrets
- The `.env` file is already in `.gitignore` to prevent accidental commits
