const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Restarting backend server...');

// Kill any existing node processes on port 5000
const killProcess = spawn('npx', ['kill-port', '5000'], { 
  stdio: 'inherit',
  shell: true 
});

killProcess.on('close', (code) => {
  console.log(`✅ Killed processes on port 5000 (code: ${code})`);
  
  // Wait a moment for processes to fully terminate
  setTimeout(() => {
    console.log('🚀 Starting server...');
    
    // Start the server
    const server = spawn('node', ['server.js'], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname
    });

    server.on('error', (error) => {
      console.error('❌ Failed to start server:', error);
    });

    server.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      server.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down server...');
      server.kill('SIGTERM');
      process.exit(0);
    });

  }, 2000);
});

killProcess.on('error', (error) => {
  console.error('❌ Error killing processes:', error);
  console.log('🚀 Starting server anyway...');
  
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });
});
