const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Test socket connection stability
async function testSocketStability() {
  console.log('🧪 Testing Socket Connection Stability...\n');

  // Create a test token (you'll need to replace this with a real user token)
  const testToken = 'your-test-token-here'; // Replace with actual token
  
  if (testToken === 'your-test-token-here') {
    console.log('❌ Please replace testToken with a real JWT token');
    console.log('   You can get one by logging in through the frontend and checking localStorage');
    return;
  }

  const socket = io('http://localhost:5000', {
    auth: { token: testToken },
    transports: ['websocket', 'polling'],
    timeout: 30000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  let connectionCount = 0;
  let disconnectCount = 0;
  let errorCount = 0;

  socket.on('connect', () => {
    connectionCount++;
    console.log(`✅ Connected (${connectionCount}) - Socket ID: ${socket.id}`);
  });

  socket.on('disconnect', (reason) => {
    disconnectCount++;
    console.log(`❌ Disconnected (${disconnectCount}) - Reason: ${reason}`);
  });

  socket.on('connect_error', (error) => {
    errorCount++;
    console.log(`🚨 Connection Error (${errorCount}):`, error.message);
  });

  socket.on('error', (error) => {
    console.log('🚨 Socket Error:', error);
  });

  socket.on('pong', () => {
    console.log('🏓 Pong received');
  });

  // Test ping every 5 seconds
  setInterval(() => {
    if (socket.connected) {
      console.log('🏓 Sending ping...');
      socket.emit('ping');
    }
  }, 5000);

  // Test random room joining
  setTimeout(() => {
    if (socket.connected) {
      console.log('🎮 Testing random room join...');
      socket.emit('join-random-room', 'test-room-123');
    }
  }, 2000);

  // Test user room joining
  setTimeout(() => {
    if (socket.connected) {
      console.log('👤 Testing user room join...');
      socket.emit('join-user-room', 'test-user-id');
    }
  }, 3000);

  // Run test for 30 seconds
  setTimeout(() => {
    console.log('\n📊 Test Results:');
    console.log(`   Connections: ${connectionCount}`);
    console.log(`   Disconnections: ${disconnectCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Current Status: ${socket.connected ? 'Connected' : 'Disconnected'}`);
    
    socket.disconnect();
    process.exit(0);
  }, 30000);

  console.log('⏱️  Test running for 30 seconds...');
  console.log('   Watch for connection stability issues\n');
}

// Run the test
testSocketStability().catch(console.error);
