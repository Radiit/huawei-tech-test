const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

let globalPrismaClient = null;

class PrismaService {
  constructor() {
    if (!globalPrismaClient) {
      globalPrismaClient = new PrismaClient({
        log: [
          {
            emit: 'event',
            level: 'error',
          },
          {
            emit: 'event',
            level: 'info',
          },
          {
            emit: 'event',
            level: 'warn',
          },
        ],
      });
    }
    this.prisma = globalPrismaClient;

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$on('query', (e) => {
        logger.debug('Query:', {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      });
    }

    // Log errors
    this.prisma.$on('error', (e) => {
      logger.error('Prisma error:', e);
    });

    // Log info
    this.prisma.$on('info', (e) => {
      logger.info('Prisma info:', e);
    });

    // Log warnings
    this.prisma.$on('warn', (e) => {
      logger.warn('Prisma warning:', e);
    });
  }

  async connect() {
    try {
      await this.prisma.$connect();
      logger.info('Connected to PostgreSQL database via Prisma');
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      return false;
    }
    return true;
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      logger.info('Disconnected from PostgreSQL database');
    } catch (error) {
      logger.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.prisma.$connect();
      return { status: 'healthy', database: 'postgresql' };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', database: 'postgresql', error: error.message };
    }
  }

  // Transaction helper
  async transaction(callback) {
    return await this.prisma.$transaction(callback);
  }

  // Get the Prisma client instance
  get client() {
    return this.prisma;
  }
}

// Create singleton instance
const prismaService = new PrismaService();

module.exports = prismaService;

