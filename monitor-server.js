const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ServerMonitor {
  constructor() {
    this.serverProcess = null;
    this.restartCount = 0;
    this.maxRestarts = 10;
    this.restartDelay = 5000; // 5 seconds
    this.logFile = path.join(__dirname, 'server-crashes.log');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    
    // Also write to log file
    fs.appendFileSync(this.logFile, logMessage);
  }

  startServer() {
    this.log(`🚀 Starting server (attempt ${this.restartCount + 1}/${this.maxRestarts})`);
    
    this.serverProcess = spawn('node', ['server.js'], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname
    });

    this.serverProcess.on('error', (error) => {
      this.log(`❌ Server process error: ${error.message}`);
      this.handleServerExit();
    });

    this.serverProcess.on('close', (code) => {
      this.log(`⚠️ Server process exited with code ${code}`);
      this.handleServerExit();
    });

    this.serverProcess.on('exit', (code) => {
      this.log(`⚠️ Server process exited with code ${code}`);
      this.handleServerExit();
    });
  }

  handleServerExit() {
    this.restartCount++;
    
    if (this.restartCount >= this.maxRestarts) {
      this.log(`❌ Maximum restart attempts (${this.maxRestarts}) reached. Stopping monitor.`);
      process.exit(1);
    }

    this.log(`🔄 Restarting server in ${this.restartDelay / 1000} seconds...`);
    
    setTimeout(() => {
      this.startServer();
    }, this.restartDelay);
  }

  stop() {
    this.log('🛑 Stopping server monitor...');
    if (this.serverProcess) {
      this.serverProcess.kill('SIGINT');
    }
  }
}

// Create monitor instance
const monitor = new ServerMonitor();

// Handle process termination
process.on('SIGINT', () => {
  monitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  monitor.stop();
  process.exit(0);
});

// Start monitoring
monitor.log('📊 Server monitor started');
monitor.startServer();
