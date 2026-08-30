const { getDbStatus } = require('../config/db');

class HealthController {
  getHealth(req, res) {
    const dbStatus = getDbStatus();
    return res.status(200).json({
      status: 'ok',
      service: 'HYRO Automation Platform Engine',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus
    });
  }
}

module.exports = new HealthController();
