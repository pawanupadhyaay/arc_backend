# Server Crash Troubleshooting Guide

## Common Causes of Server Crashes

### 1. Memory Leaks
**Symptoms:**
- Server becomes slower over time
- High memory usage
- Crashes after running for several hours

**Solutions:**
- ✅ Fixed: Added proper cleanup for setInterval
- ✅ Fixed: Added error handling for socket operations
- ✅ Fixed: Added validation for all socket events

### 2. Database Connection Issues
**Symptoms:**
- Connection timeout errors
- MongoDB disconnection errors
- Server crashes when database is unavailable

**Solutions:**
- ✅ Fixed: Added connection pooling in `config/db.js`
- ✅ Fixed: Added retry logic for database connections
- ✅ Fixed: Added proper error handling for database operations

### 3. Socket.IO Memory Issues
**Symptoms:**
- Multiple socket connections for same user
- Socket events not properly cleaned up
- Memory usage increases with active users

**Solutions:**
- ✅ Fixed: Added user tracking to prevent duplicate connections
- ✅ Fixed: Added proper socket cleanup on disconnect
- ✅ Fixed: Added validation for all socket event data

### 4. Unhandled Promise Rejections
**Symptoms:**
- Server crashes without clear error message
- Async operations failing silently

**Solutions:**
- ✅ Fixed: Added global unhandledRejection handler
- ✅ Fixed: Added try-catch blocks around all async operations
- ✅ Fixed: Added proper error logging

## How to Use the Monitor

### Start Server with Monitor
```bash
npm run monitor
```

This will:
- Start the server
- Automatically restart if it crashes
- Log all crashes to `server-crashes.log`
- Stop after 10 consecutive crashes

### Check Crash Logs
```bash
# View recent crashes
tail -f server-crashes.log

# View all crashes
cat server-crashes.log
```

## Manual Debugging Steps

### 1. Check Server Logs
```bash
# Start server and watch logs
npm start

# Or with nodemon for development
npm run dev
```

### 2. Check Database Connection
```bash
# Test MongoDB connection
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('DB Connected'))
  .catch(err => console.error('DB Error:', err));
"
```

### 3. Check Memory Usage
```bash
# Monitor memory usage
node -e "
console.log('Memory Usage:', process.memoryUsage());
console.log('Heap Used:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB');
"
```

### 4. Test Health Endpoint
```bash
# Test server health
curl http://localhost:5000/api/health
```

## Recent Fixes Applied

### 1. Fixed Duplicate Health Check Routes
- Removed duplicate `/api/health` route
- Added memory usage and connected users info

### 2. Improved Error Handling
- Added validation for all socket event data
- Added try-catch blocks around async operations
- Added proper error logging

### 3. Fixed Memory Leaks
- Added proper cleanup for setInterval
- Added socket connection tracking
- Added proper cleanup on server shutdown

### 4. Added Server Monitor
- Automatic restart on crashes
- Crash logging for debugging
- Configurable restart limits

## Environment Variables to Check

Make sure these are properly set in your `.env` file:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/gaming-social-platform
JWT_SECRET=your-secret-key
```

## Performance Monitoring

### Memory Usage
The health endpoint now includes memory usage:
```json
{
  "memoryUsage": {
    "rss": 12345678,
    "heapTotal": 9876543,
    "heapUsed": 5432109,
    "external": 123456
  }
}
```

### Connected Users
Monitor active socket connections:
```json
{
  "connectedUsers": 5
}
```

## Emergency Restart

If the server is completely unresponsive:

```bash
# Kill all Node processes
taskkill /f /im node.exe

# Or on Linux/Mac
pkill -f node

# Start with monitor
npm run monitor
```

## Contact Support

If crashes persist after trying these solutions:
1. Check the `server-crashes.log` file
2. Note the error messages and timestamps
3. Check system resources (CPU, memory, disk space)
4. Verify database connectivity
