const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import configurations and utilities
const config = require('./config/config');
const prisma = require('./lib/prisma');
const { logger, requestLogger } = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const employeeRoutes = require('./routes/employeeRoutes');
const authRoutes = require('./routes/authRoutes');
const rbacRoutes = require('./routes/rbacRoutes');
const fileRoutes = require('./routes/fileRoutes');
const cronRoutes = require('./routes/cronRoutes');
const supabaseCronRoutes = require('./routes/supabaseCronRoutes');

class Application {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    this.app.set('trust proxy', 1);

    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(cors(config.api.cors));

    // Compression middleware
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.api.rateLimit.windowMs,
      max: config.api.rateLimit.maxRequests,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    this.app.use(morgan('combined', {
      stream: { write: message => logger.info(message.trim()) }
    }));
    this.app.use(requestLogger);

    // Static files
    this.app.use(express.static('public'));
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await prisma.healthCheck();
        res.json({
          success: dbHealth.status === 'healthy',
          message: 'Server is running',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: dbHealth
        });
      } catch (error) {
        // Fallback: return 200 even if DB is down, but indicate DB issue
        res.status(200).json({
          success: true,
          message: 'Server is running (database connection issue)',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: { status: 'unhealthy', error: error.message },
          warning: 'Database connection failed but server is operational'
        });
      }
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/rbac', rbacRoutes);
    this.app.use('/api/employees', employeeRoutes);
    this.app.use('/api/files', fileRoutes);
    this.app.use('/api/cron', cronRoutes);
    this.app.use('/api/supabase-cron', supabaseCronRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Employee Management API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          rbac: '/api/rbac',
          employees: '/api/employees',
          files: '/api/files',
          cron: '/api/cron',
        supabaseCron: '/api/supabase-cron',
          documentation: '/api-docs'
        }
      });
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      const dbConnected = await prisma.connect();
      if (!dbConnected) {
        logger.warn('Database connection failed, but server will start anyway');
      }

      const server = this.app.listen(config.server.port, config.server.host, () => {
        logger.info(`Server running on http://${config.server.host}:${config.server.port}`);
        logger.info(`Environment: ${config.server.env}`);
        if (dbConnected) {
          logger.info('Database connection: OK');
        } else {
          logger.warn('Database connection: FAILED - some features may not work');
        }
      });

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(async () => {
          await prisma.disconnect();
          logger.info('Process terminated');
          process.exit(0);
        });
      });

      process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down gracefully');
        server.close(async () => {
          await prisma.disconnect();
          logger.info('Process terminated');
          process.exit(0);
        });
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Create and start application
const app = new Application();
app.start();

module.exports = app;
