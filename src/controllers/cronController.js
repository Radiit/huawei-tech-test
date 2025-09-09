const supabaseCronService = require('../services/supabaseCronService');
const { logger } = require('../utils/logger');
const prisma = require('../lib/prisma');
const storage = require('../services/supabaseStorageService');

class CronController {
  async createCustomCron(req, res) {
    try {
      const { jobName, schedule, command } = req.body || {};
      if (!jobName || !schedule || !command) {
        return res.status(400).json({ success: false, message: 'jobName, schedule, and command are required' });
      }

      const result = await supabaseCronService.createCronJob(jobName, schedule, command);
      return res.json({ success: true, message: 'Custom cron created', data: result });
    } catch (error) {
      logger.error('Error in createCustomCron controller:', error);
      return res.status(500).json({ success: false, message: 'Failed to create custom cron' });
    }
  }

  async deleteCustomCron(req, res) {
    try {
      const { jobName } = req.params;
      if (!jobName) {
        return res.status(400).json({ success: false, message: 'jobName is required' });
      }
      const result = await supabaseCronService.deleteCronJob(jobName);
      return res.json({ success: true, message: `Cron '${jobName}' deleted`, data: result });
    } catch (error) {
      logger.error('Error in deleteCustomCron controller:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete custom cron' });
    }
  }
  async setupCronJobs(req, res) {
    try {
      const result = await supabaseCronService.setupCronJobs();
      
      res.json({
        success: true,
        message: 'Cron jobs setup completed',
        data: result
      });
    } catch (error) {
      logger.error('Error in setupCronJobs controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to setup cron jobs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async createCronFunctions(req, res) {
    try {
      const result = await supabaseCronService.createCronFunctions();
      
      res.json({
        success: true,
        message: 'Cron functions created successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in createCronFunctions controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create cron functions',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async listCronJobs(req, res) {
    try {
      const result = await supabaseCronService.listCronJobs();
      
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Error in listCronJobs controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list cron jobs',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async testCronJob(req, res) {
    try {
      const { jobName } = req.params;
      const result = await supabaseCronService.testCronJob(jobName);
      
      res.json({
        success: true,
        message: `Cron job '${jobName}' tested successfully`,
        data: result
      });
    } catch (error) {
      logger.error(`Error in testCronJob controller for job ${req.params.jobName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to test cron job',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async getCronJobStatus(req, res) {
    try {
      const result = await supabaseCronService.getCronJobStatus();
      
      res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      logger.error('Error in getCronJobStatus controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cron job status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async deleteCronJob(req, res) {
    try {
      const { jobName } = req.params;
      const result = await supabaseCronService.deleteCronJob(jobName);
      
      res.json({
        success: true,
        message: `Cron job '${jobName}' deleted successfully`,
        data: result
      });
    } catch (error) {
      logger.error(`Error in deleteCronJob controller for job ${req.params.jobName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete cron job',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async initializeCronSetup(req, res) {
    try {
      logger.info('Starting complete cron setup initialization...');
      
      // First create the database functions
      await supabaseCronService.createCronFunctions();
      
      // Then setup the cron jobs
      const result = await supabaseCronService.setupCronJobs();
      
      res.json({
        success: true,
        message: 'Complete cron setup initialized successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in initializeCronSetup controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize cron setup',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async exportLatestCollectionToStorage(req, res) {
    try {
      const latest = await prisma.client.dataCollection.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      if (!latest) {
        return res.status(404).json({ success: false, message: 'No data_collections found' });
      }

      const now = new Date();
      const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const pad = n => String(n).padStart(2, '0');
      const fname = `cron_${pad(wib.getMonth()+1)}${pad(wib.getDate())}${wib.getFullYear()}_${pad(wib.getHours())}.${pad(wib.getMinutes())}.csv`;
      const path = `cron/${fname}`;

      // CSV from latest data collection
      const collectionDate = latest.collectionDate || latest.collection_date || '';
      const collectionTime = latest.collectionTime || latest.collection_time || '';
      const dataSource = latest.dataSource || latest.data_source || '';
      const filePath = latest.filePath || latest.file_path || '';
      const rawPayload = latest.dataContent || latest.data_content || '';
      let payloadJson;
      try { payloadJson = JSON.stringify(JSON.parse(rawPayload)); } catch { payloadJson = String(rawPayload); }

      const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
      const header = 'collection_date,collection_time,data_source,file_path,payload';
      const row = [collectionDate, collectionTime, dataSource, filePath, payloadJson].map(esc).join(',');
      const csv = header + '\n' + row + '\n';

      const payload = Buffer.from(csv);
      const uploaded = await storage.uploadFile({ buffer: payload, mimetype: 'text/csv' }, path);

      return res.json({ success: true, message: 'Latest data exported to storage', data: { uploaded, recordId: latest.id } });
    } catch (error) {
      logger.error('Error exporting latest collection to storage:', error);
      return res.status(500).json({ success: false, message: 'Export failed', error: process.env.NODE_ENV==='development'? error.message : undefined });
    }
  }
}

module.exports = new CronController();