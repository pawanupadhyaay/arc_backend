const axios = require('axios');

async function testConnection() {
  console.log('Testing server connection...');
  
  try {
    const response = await axios.get('http://localhost:5000/api/users/profile', {
      timeout: 5000
    });
    console.log('✅ Server responded with status:', response.status);
  } catch (error) {
    console.log('❌ Error details:');
    console.log('  Message:', error.message);
    console.log('  Code:', error.code);
    console.log('  Status:', error.response?.status);
    console.log('  StatusText:', error.response?.statusText);
    
    if (error.response?.status === 401) {
      console.log('✅ Server is running (401 expected for unauthorized access)');
    }
  }
}

testConnection();
