const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * Uses connection string from environment variables or falls back to local database
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resolvex_db';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(` MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(` Error connecting to MongoDB: ${error.message}`);
    // If in production/server startup, exit process on database connection failure
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Close database connection (useful for graceful shutdown and test teardown)
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error(`Error closing MongoDB connection: ${error.message}`);
  }
};

module.exports = { connectDB, closeDB };
