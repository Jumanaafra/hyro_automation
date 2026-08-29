const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;
let isFallbackMode = false;

const connectDB = async () => {
  if (process.env.USE_IN_MEMORY_DB === 'true') {
    console.log('[DB] Configured for in-memory development fallback mode.');
    isFallbackMode = true;
    return false;
  }

  try {
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    isFallbackMode = false;
    console.log(`[DB] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[DB] MongoDB Connection warning: ${error.message}.`);
    console.warn('[DB] Falling back to in-memory development database provider.');
    isConnected = false;
    isFallbackMode = true;
    return false;
  }
};

const getDbStatus = () => {
  return {
    isConnected,
    isFallbackMode,
    type: isConnected ? 'mongodb' : 'in-memory-fallback'
  };
};

module.exports = {
  connectDB,
  getDbStatus
};
