const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const queueService = require('./services/queueService');
const socketService = require('./services/socketService');

const startServer = async () => {
  await connectDB();

  // Initialize queue system (BullMQ/Redis or in-memory fallback)
  await queueService.initialize();

  const server = app.listen(env.PORT, () => {
    console.log(`[HYRO Server] Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  // Initialize Socket.IO real-time layer
  socketService.initialize(server);

  process.on('unhandledRejection', (err) => {
    console.error(`[Unhandled Rejection] ${err.message}`);
    // Keep server running in dev
  });

  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
