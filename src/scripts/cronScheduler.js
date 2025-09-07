const cron = require('node-cron');
const DataCollector = require('./dataCollector');
const DataCleanup = require('./dataCleanup');
const config = require('../config/config');
const { logger } = require('../utils/logger');

class CronScheduler {
  constructor() {
    this.collectionTimes = config.cron.collectionTimes;
    this.timezone = config.cron.timezone;
    this.tasks = [];
  }

  // Schedule data collection tasks
  scheduleDataCollection() {
    this.collectionTimes.forEach((time) => {
      const [hours, minutes] = time.split(':');
      const cronExpression = `${minutes} ${hours} * * *`;

      const task = cron.schedule(cronExpression, async () => {
        try {
          logger.info(`Starting scheduled data collection at ${time}`);
          const collector = new DataCollector();
          const result = await collector.run();
          logger.info('Scheduled data collection completed:', result);
        } catch (error) {
          logger.error('Scheduled data collection failed:', error);
        }
      }, {
        scheduled: false,
        timezone: this.timezone
      });

      this.tasks.push({
        name: `data-collection-${time}`,
        task,
        schedule: cronExpression,
        description: `Collect data at ${time} WIB`
      });

      logger.info(`Scheduled data collection task: ${cronExpression} (${time} WIB)`);
    });
  }

  // Schedule data cleanup task (daily at 2 AM)
  scheduleDataCleanup() {
    const task = cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting scheduled data cleanup');
        const cleanup = new DataCleanup();
        const result = await cleanup.run(30); // Clean files older than 30 days
        logger.info('Scheduled data cleanup completed:', result);
      } catch (error) {
        logger.error('Scheduled data cleanup failed:', error);
      }
    }, {
      scheduled: false,
      timezone: this.timezone
    });

    this.tasks.push({
      name: 'data-cleanup',
      task,
      schedule: '0 2 * * *',
      description: 'Clean old files daily at 2 AM WIB'
    });

    logger.info('Scheduled data cleanup task: 0 2 * * * (2:00 AM WIB)');
  }

  // Start all scheduled tasks
  start() {
    try {
      this.scheduleDataCollection();
      this.scheduleDataCleanup();

      // Start all tasks
      this.tasks.forEach(({ name, task, description }) => {
        task.start();
        logger.info(`Started cron task: ${name} - ${description}`);
      });

      logger.info(`Cron scheduler started with ${this.tasks.length} tasks`);
    } catch (error) {
      logger.error('Failed to start cron scheduler:', error);
      throw error;
    }
  }

  // Stop all scheduled tasks
  stop() {
    this.tasks.forEach(({ name, task }) => {
      task.stop();
      logger.info(`Stopped cron task: ${name}`);
    });
    logger.info('Cron scheduler stopped');
  }

  // Get task status
  getStatus() {
    return this.tasks.map(({ name, task, schedule, description }) => ({
      name,
      schedule,
      description,
      running: task.running
    }));
  }

  // Run data collection manually
  async runDataCollection() {
    try {
      logger.info('Running manual data collection');
      const collector = new DataCollector();
      const result = await collector.run();
      logger.info('Manual data collection completed:', result);
      return result;
    } catch (error) {
      logger.error('Manual data collection failed:', error);
      throw error;
    }
  }

  // Run data cleanup manually
  async runDataCleanup(days = 30) {
    try {
      logger.info(`Running manual data cleanup (${days} days)`);
      const cleanup = new DataCleanup();
      const result = await cleanup.run(days);
      logger.info('Manual data cleanup completed:', result);
      return result;
    } catch (error) {
      logger.error('Manual data cleanup failed:', error);
      throw error;
    }
  }
}

// Create and export scheduler instance
const scheduler = new CronScheduler();

// Start scheduler if this file is run directly
if (require.main === module) {
  scheduler.start();

  // Keep the process running
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, stopping cron scheduler');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, stopping cron scheduler');
    scheduler.stop();
    process.exit(0);
  });
}

module.exports = scheduler;
