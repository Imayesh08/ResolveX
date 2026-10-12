const mongoose = require('mongoose');

async function testConnection() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resolvex_db';
  console.log(`Testing MongoDB connection to: ${uri}`);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connection SUCCESSFUL!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('MongoDB connection FAILED:', err.message);
    process.exit(1);
  }
}

testConnection();
