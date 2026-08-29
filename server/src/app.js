const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const executionRoutes = require('./routes/executionRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const gmailRoutes = require('./routes/gmailRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const linkedinRoutes = require('./routes/linkedinRoutes');

const app = express();

// Security HTTP headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false // disabled to allow dynamic client-side scripts in dev
}));

// Enable CORS — allow configured CLIENT_URL + any Vercel deployment + localhost
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Render health checks)
      if (!origin) return callback(null, true);
      // Allow any Vercel preview/production URLs and configured origins
      if (
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        /\.onrender\.com$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin not allowed — ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Compression & Logging
app.use(compression());
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// Auth endpoints — strict limit to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth requests, please try again later.' }
});

// General API limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' }
});

// Apply limiters
app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);

// ── System Status ─────────────────────────────────────────────────────────────
app.get('/api/system/status', (req, res) => {
  const queueService = require('./services/queueService');
  const socketService = require('./services/socketService');
  const { getDbStatus } = require('./config/db');

  res.status(200).json({
    success: true,
    data: {
      db: getDbStatus(),
      queue: queueService.getQueueStats(),
      socketIO: { connected: socketService.isConnected() },
      env: env.NODE_ENV,
      uptime: process.uptime()
    }
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/linkedin', linkedinRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack || err.message);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Never expose stack in responses — only in dev logs
  res.status(statusCode).json({
    success: false,
    message
  });
});

module.exports = app;
