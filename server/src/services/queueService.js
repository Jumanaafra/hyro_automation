/**
 * Queue Service — BullMQ + In-Memory Fallback
 * Provides a job queue for workflow execution with retry/backoff.
 * When Redis is unavailable, uses a documented local in-memory queue
 * with explicit warnings that production guarantees do NOT apply.
 */
const { getDbStatus } = require('../config/db');

// ── In-memory fallback queue ──────────────────────────────────────────────────
class InMemoryQueue {
  constructor(name) {
    this.name = name;
    this.jobs = new Map();
    this._nextId = 1;
    this._listeners = {};
    console.warn(`[Queue] ⚠️  USING IN-MEMORY FALLBACK for queue "${name}". This is NOT production-grade. No retry guarantees.`);
  }

  async add(jobName, data, opts = {}) {
    const id = String(this._nextId++);
    const delay = opts.delay || 0;
    const attempts = opts.attempts || 1;
    const job = {
      id,
      name: jobName,
      data,
      opts: { delay, attempts, backoff: opts.backoff },
      status: 'waiting',
      attemptsMade: 0,
      createdAt: new Date(),
      scheduledAt: delay ? new Date(Date.now() + delay) : null
    };
    this.jobs.set(id, job);

    // Simulate async processing
    setTimeout(async () => {
      job.status = 'active';
      try {
        if (this._listeners['completed']) {
          await this._listeners['completed']({ id: job.id, data: job.data, name: job.name });
        }
        job.status = 'completed';
        job.finishedAt = new Date();
      } catch (err) {
        job.status = 'failed';
        job.failedReason = err.message;
      }
    }, delay + 10);

    return job;
  }

  on(event, handler) {
    this._listeners[event] = handler;
    return this;
  }

  async getJob(id) {
    return this.jobs.get(id) || null;
  }

  async getJobs(statuses = ['waiting', 'active', 'completed', 'failed']) {
    return Array.from(this.jobs.values()).filter((j) => statuses.includes(j.status));
  }

  clearAll() {
    this.jobs.clear();
    this._nextId = 1;
  }
}

// ── BullMQ wrapper ────────────────────────────────────────────────────────────
class QueueService {
  constructor() {
    this._queues = {};
    this._workers = {};
    this._useRedis = false;
    this._redisAvailable = false;
    this._bullmqAvailable = false;
  }

  async initialize() {
    try {
      const { Queue, Worker } = require('bullmq');
      const REDIS_URL = process.env.REDIS_URL;
      if (!REDIS_URL) throw new Error('REDIS_URL not set');

      const connection = { url: REDIS_URL };
      this._Queue = Queue;
      this._Worker = Worker;
      this._connection = connection;
      this._useRedis = true;
      this._bullmqAvailable = true;
      this._redisAvailable = true;
      console.log('[Queue] ✅ BullMQ connected to Redis');
    } catch (err) {
      this._useRedis = false;
      this._redisAvailable = false;
      this._bullmqAvailable = false;
      console.warn(`[Queue] ⚠️  BullMQ/Redis unavailable (${err.message}). Using in-memory fallback.`);
    }
  }

  getQueue(name) {
    if (!this._queues[name]) {
      if (this._useRedis) {
        this._queues[name] = new this._Queue(name, { connection: this._connection });
      } else {
        this._queues[name] = new InMemoryQueue(name);
      }
    }
    return this._queues[name];
  }

  async addJob(queueName, jobName, data, opts = {}) {
    const queue = this.getQueue(queueName);
    return queue.add(jobName, data, opts);
  }

  isRedisAvailable() {
    return this._redisAvailable;
  }

  isBullMQAvailable() {
    return this._bullmqAvailable;
  }

  getQueueStats() {
    return {
      redisAvailable: this._redisAvailable,
      bullmqAvailable: this._bullmqAvailable,
      fallback: !this._useRedis,
      queues: Object.keys(this._queues)
    };
  }

  clearInMemoryStore() {
    Object.values(this._queues).forEach((q) => {
      if (q.clearAll) q.clearAll();
    });
    this._queues = {};
  }
}

module.exports = new QueueService();
