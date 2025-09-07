const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

class SupabaseCronController {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async getCronStatus(req, res) {
    try {
      logger.info('Getting Supabase cron status...');
      
      const cronJobs = await this.prisma.$queryRaw`
        SELECT 
          jobid,
          jobname,
          schedule,
          command,
          active,
          nodename,
          nodeport,
          database,
          username
        FROM cron.job 
        ORDER BY jobid;
      `;

      const dataCollections = await this.prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_collections,
          MAX(created_at) as last_collection
        FROM data_collections;
      `;

      const recentCollections = await this.prisma.$queryRaw`
        SELECT 
          id,
          collection_date,
          collection_time,
          file_path,
          created_at
        FROM data_collections
        ORDER BY created_at DESC
        LIMIT 10;
      `;

      res.json({
        success: true,
        data: {
          cronJobs: cronJobs,
          totalJobs: cronJobs.length,
          activeJobs: cronJobs.filter(job => job.active).length,
          dataCollections: {
            total: parseInt(dataCollections[0].total_collections),
            lastCollection: dataCollections[0].last_collection
          },
          recentCollections: recentCollections
        }
      });

    } catch (error) {
      logger.error('Error getting cron status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cron status',
        message: error.message
      });
    }
  }

  async testDataCollection(req, res) {
    try {
      const sessionName = req.body.session || 'api_test';
      logger.info(`Testing data collection for session: ${sessionName}`);
      
      const result = await this.prisma.$queryRaw`
        SELECT cron_data_collection(${sessionName});
      `;

      res.json({
        success: true,
        data: {
          result: result[0],
          session: sessionName,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error testing data collection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test data collection',
        message: error.message
      });
    }
  }

  async testDataCleanup(req, res) {
    try {
      logger.info('Testing data cleanup...');
      
      const result = await this.prisma.$queryRaw`
        SELECT cron_data_cleanup();
      `;

      res.json({
        success: true,
        data: {
          result: result[0],
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error testing data cleanup:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test data cleanup',
        message: error.message
      });
    }
  }

  async getDataCollections(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      
      logger.info(`Getting data collections (limit: ${limit}, offset: ${offset})`);
      
      const collections = await this.prisma.$queryRaw`
        SELECT 
          id,
          collection_date,
          collection_time,
          data_source,
          file_path,
          created_at
        FROM data_collections
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset};
      `;

      const totalCount = await this.prisma.$queryRaw`
        SELECT COUNT(*) as total FROM data_collections;
      `;

      res.json({
        success: true,
        data: {
          collections: collections,
          total: parseInt(totalCount[0].total),
          limit: limit,
          offset: offset
        }
      });

    } catch (error) {
      logger.error('Error getting data collections:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get data collections',
        message: error.message
      });
    }
  }

  async getDataCollection(req, res) {
    try {
      const { id } = req.params;
      logger.info(`Getting data collection: ${id}`);
      
      const collection = await this.prisma.$queryRaw`
        SELECT 
          id,
          collection_date,
          collection_time,
          data_source,
          data_content,
          file_path,
          created_at
        FROM data_collections
        WHERE id = ${parseInt(id)};
      `;

      if (collection.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Data collection not found'
        });
      }

      res.json({
        success: true,
        data: collection[0]
      });

    } catch (error) {
      logger.error('Error getting data collection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get data collection',
        message: error.message
      });
    }
  }

  async getCronJob(req, res) {
    try {
      const { jobId } = req.params;
      logger.info(`Getting cron job: ${jobId}`);
      
      const job = await this.prisma.$queryRaw`
        SELECT 
          jobid,
          jobname,
          schedule,
          command,
          active,
          nodename,
          nodeport,
          database,
          username
        FROM cron.job 
        WHERE jobid = ${parseInt(jobId)};
      `;

      if (job.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Cron job not found'
        });
      }

      res.json({
        success: true,
        data: job[0]
      });

    } catch (error) {
      logger.error('Error getting cron job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cron job',
        message: error.message
      });
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

module.exports = SupabaseCronController;
