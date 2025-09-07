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

  start() {
    try {
      this.scheduleDataCollection();
      this.scheduleDataCleanup();

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

  stop() {
    this.tasks.forEach(({ name, task }) => {
      task.stop();
      logger.info(`Stopped cron task: ${name}`);
    });
    logger.info('Cron scheduler stopped');
  }

  getStatus() {
    return this.tasks.map(({ name, task, schedule, description }) => ({
      name,
      schedule,
      description,
      running: task.running
    }));
  }

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

const scheduler = new CronScheduler();

if (require.main === module) {
  scheduler.start();

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
