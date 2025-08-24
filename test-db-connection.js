const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const connectDB = require('./backend/config/db');

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
  
  try {
    await connectDB();
    console.log('✅ Database connection successful!');
    
    // Wait a bit to see if connection stays stable
    setTimeout(() => {
      console.log('✅ Connection test completed successfully');
      process.exit(0);
    }, 2000);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testDatabaseConnection();
