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
    console.log(`[HYRO Server] ✅ Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  // Handle port already in use — exit cleanly so nodemon can retry
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[HYRO Server] ❌ Port ${env.PORT} is already in use. Exiting so nodemon can retry...`);
      process.exit(1);
    } else {
      throw err;
    }
  });

  // Initialize Socket.IO real-time layer
  socketService.initialize(server);

  // Graceful shutdown on SIGTERM / SIGINT (e.g. Ctrl+C)
  const shutdown = () => {
    console.log('\n[HYRO Server] Shutting down gracefully...');
    server.close(() => {
      console.log('[HYRO Server] HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000); // force exit after 5s
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

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
