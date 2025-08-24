const http = require('http');

function testServer() {
  console.log('Testing server connection...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Server responded with status: ${res.statusCode}`);
    console.log(`   Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`   Response: ${data}`);
    });
  });

  req.on('error', (error) => {
    console.log('❌ Connection error:', error.message);
    console.log('   Code:', error.code);
  });

  req.on('timeout', () => {
    console.log('❌ Request timed out');
    req.destroy();
  });

  req.end();
}

testServer();
