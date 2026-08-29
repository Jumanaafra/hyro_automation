/**
 * Socket.IO service — Real-time live agent events + timeline
 * Authenticates clients via JWT before allowing subscriptions
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

class SocketService {
  constructor() {
    this.io = null;
    this._connected = false;
  }

  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.CLIENT_URL || 'http://localhost:3000',
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // JWT authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication token required'));
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET || 'hyro_default_secret');
        socket.userId = decoded.id || decoded.userId;
        next();
      } catch (err) {
        next(new Error('Invalid or expired token'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      socket.join(`user:${userId}`);
      socket.emit('connected', { userId, timestamp: new Date().toISOString() });

      socket.on('subscribe:execution', (data) => {
        const executionId = data?.executionId;
        if (executionId) {
          socket.join(`execution:${executionId}`);
          socket.emit('subscribed', { executionId });
        }
      });

      socket.on('disconnect', (reason) => {
        socket.leave(`user:${userId}`);
      });
    });

    this._connected = true;
    console.log('[SocketIO] ✅ Socket.IO server initialized');
    return this.io;
  }

  // Emit agent lifecycle event to subscribed user
  emitAgentEvent(userId, eventName, payload) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(eventName, { ...payload, timestamp: new Date().toISOString() });
  }

  // Emit to all subscribers of an execution
  emitExecutionEvent(executionId, eventName, payload) {
    if (!this.io) return;
    this.io.to(`execution:${executionId}`).emit(eventName, { ...payload, executionId, timestamp: new Date().toISOString() });
  }

  // Emit timeline update
  emitTimelineUpdate(userId, step) {
    this.emitAgentEvent(userId, 'timeline:update', { step });
  }

  // Emit notification drawer event
  emitNotification(userId, notification) {
    this.emitAgentEvent(userId, 'notification:new', notification);
  }

  isConnected() {
    return this._connected && !!this.io;
  }

  getIO() {
    return this.io;
  }
}

module.exports = new SocketService();
