const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USERS = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' }
];

let currentToken = null;
let currentUser = null;

// Helper function to make authenticated requests
const makeAuthRequest = async (method, endpoint, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken && { 'Authorization': `Bearer ${currentToken}` })
      },
      ...(data && { data })
    };
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Request failed: ${method} ${endpoint}`, error.response?.data || error.message);
    throw error;
  }
};

// Test login
const testLogin = async (user) => {
  try {
    console.log(`\n🔐 Testing login for ${user.email}...`);
    const response = await axios.post(`${BASE_URL}/api/auth/login`, user);
    currentToken = response.data.data.token;
    currentUser = response.data.data.user;
    console.log(`✅ Login successful for ${currentUser.username}`);
    return true;
  } catch (error) {
    console.error(`❌ Login failed for ${user.email}:`, error.response?.data?.message || error.message);
    return false;
  }
};

// Test logout
const testLogout = async () => {
  try {
    console.log('\n🚪 Testing logout...');
    await makeAuthRequest('POST', '/api/auth/logout');
    currentToken = null;
    currentUser = null;
    console.log('✅ Logout successful');
    return true;
  } catch (error) {
    console.error('❌ Logout failed:', error.response?.data?.message || error.message);
    return false;
  }
};

// Test get user profile
const testGetProfile = async () => {
  try {
    console.log('\n👤 Testing get profile...');
    const response = await makeAuthRequest('GET', '/api/auth/me');
    console.log(`✅ Profile retrieved for ${response.data.user.username}`);
    return true;
  } catch (error) {
    console.error('❌ Get profile failed:', error.response?.data?.message || error.message);
    return false;
  }
};

// Test get posts
const testGetPosts = async () => {
  try {
    console.log('\n📝 Testing get posts...');
    const response = await makeAuthRequest('GET', '/api/posts');
    console.log(`✅ Retrieved ${response.data.data?.length || 0} posts`);
    return true;
  } catch (error) {
    console.error('❌ Get posts failed:', error.response?.data?.message || error.message);
    return false;
  }
};

// Test get users
const testGetUsers = async () => {
  try {
    console.log('\n👥 Testing get users...');
    const response = await makeAuthRequest('GET', '/api/users');
    console.log(`✅ Retrieved ${response.data.data?.length || 0} users`);
    return true;
  } catch (error) {
    console.error('❌ Get users failed:', error.response?.data?.message || error.message);
    return false;
  }
};

// Test get tournaments
const testGetTournaments = async () => {
  try {
    console.log('\n🏆 Testing get tournaments...');
    const response = await makeAuthRequest('GET', '/api/tournaments');
    console.log(`✅ Retrieved ${response.data.data?.length || 0} tournaments`);
    return true;
  } catch (error) {
    console.error('❌ Get tournaments failed:', error.response?.data?.message || error.message);
    return false;
  }
};

// Test get notifications
const testGetNotifications = async () => {
  try {
    console.log('\n🔔 Testing get notifications...');
    const response = await makeAuthRequest('GET', '/api/notifications');
    console.log(`✅ Retrieved ${response.data.data?.length || 0} notifications`);
    return true;
  } catch (error) {
    console.error('❌ Get notifications failed:', error.response?.data?.message || error.message);
    return false;
  }
};

// Test get messages
const testGetMessages = async () => {
  try {
    console.log('\n💬 Testing get messages...');
    const response = await makeAuthRequest('GET', '/api/messages');
    console.log(`✅ Retrieved ${response.data.data?.length || 0} messages`);
    return true;
  } catch (error) {
    console.error('❌ Get messages failed:', error.response?.data?.message || error.message);
    return false;
  }
};

// Test health endpoint
const testHealth = async () => {
  try {
    console.log('\n🏥 Testing health endpoint...');
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check passed');
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.response?.data?.message || error.message);
    return false;
  }
};

// Main test function
const runStabilityTest = async () => {
  console.log('🚀 Starting server stability test...');
  
  // Test health first
  await testHealth();
  
  let testCount = 0;
  let successCount = 0;
  
  // Run multiple cycles of user switching and feature testing
  for (let cycle = 1; cycle <= 5; cycle++) {
    console.log(`\n🔄 Starting test cycle ${cycle}/5`);
    
    for (const user of TEST_USERS) {
      try {
        // Login
        const loginSuccess = await testLogin(user);
        if (!loginSuccess) continue;
        
        // Test all features
        const tests = [
          testGetProfile,
          testGetPosts,
          testGetUsers,
          testGetTournaments,
          testGetNotifications,
          testGetMessages
        ];
        
        for (const test of tests) {
          testCount++;
          try {
            await test();
            successCount++;
          } catch (error) {
            console.error(`Test failed: ${test.name}`);
          }
          
          // Small delay between tests
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Logout
        await testLogout();
        
        // Small delay between users
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error in user cycle for ${user.email}:`, error.message);
      }
    }
    
    console.log(`\n✅ Completed cycle ${cycle}/5`);
    console.log(`📊 Success rate: ${successCount}/${testCount} (${((successCount/testCount)*100).toFixed(1)}%)`);
    
    // Delay between cycles
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎉 Stability test completed!');
  console.log(`📈 Final success rate: ${successCount}/${testCount} (${((successCount/testCount)*100).toFixed(1)}%)`);
  
  if (successCount === testCount) {
    console.log('✅ All tests passed! Server is stable.');
  } else {
    console.log('⚠️ Some tests failed. Check server logs for issues.');
  }
};

// Run the test
if (require.main === module) {
  runStabilityTest().catch(console.error);
}

module.exports = { runStabilityTest };
