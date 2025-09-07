const axios = require('axios');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const config = require('../config/config');
const prisma = require('../lib/prisma');
const { logger } = require('../utils/logger');
const supabaseStorageService = require('../services/supabaseStorageService');

class DataCollector {
  constructor() {
    this.dataPath = config.cron.dataPath;
    this.sourceUrl = config.dataCollection.sourceUrl;
    this.timeout = config.dataCollection.timeout;
    this.retryAttempts = config.dataCollection.retryAttempts;
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
      logger.info(`Created data directory: ${this.dataPath}`);
    }
  }

  async collectData() {
    let attempt = 0;
    let lastError;

    while (attempt < this.retryAttempts) {
      try {
        logger.info(`Attempting to collect data (attempt ${attempt + 1}/${this.retryAttempts})`);

        const response = await axios.get(this.sourceUrl, {
          timeout: this.timeout,
          headers: {
            'User-Agent': 'Huawei-DataCollector/1.0'
          }
        });

        if (response.status === 200) {
          logger.info('Data collected successfully');
          return response.data;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        lastError = error;
        attempt++;
        logger.warn(`Data collection attempt ${attempt} failed:`, error.message);

        if (attempt < this.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Data collection failed after ${this.retryAttempts} attempts. Last error: ${lastError.message}`);
  }

  generateFilename() {
    const now = new Date();
    const date = now.toISOString().split('T')[0].replace(/-/g, '');
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '.');
    return `cron_${date}_${time}.csv`;
  }

  async saveToCSV(data, filename) {
    try {
      this.ensureDataDirectory();

      const filePath = path.join(this.dataPath, filename);

      let csvData = [];

      if (Array.isArray(data)) {
        csvData = data.map((item, index) => ({
          id: item.id || index + 1,
          title: item.title || '',
          body: item.body || '',
          userId: item.userId || '',
          collected_at: new Date().toISOString()
        }));
      } else if (typeof data === 'object') {
        csvData = [{
          id: data.id || 1,
          title: data.title || '',
          body: data.body || '',
          userId: data.userId || '',
          collected_at: new Date().toISOString()
        }];
      } else {
        csvData = [{
          id: 1,
          title: 'Data Collection',
          body: JSON.stringify(data),
          userId: 'system',
          collected_at: new Date().toISOString()
        }];
      }

      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'id', title: 'ID' },
          { id: 'title', title: 'Title' },
          { id: 'body', title: 'Body' },
          { id: 'userId', title: 'User ID' },
          { id: 'collected_at', title: 'Collected At' }
        ]
      });

      await csvWriter.writeRecords(csvData);
      logger.info(`Data saved to CSV: ${filePath}`);

      return filePath;
    } catch (error) {
      logger.error('Error saving data to CSV:', error);
      throw error;
    }
  }

  async saveCollectionRecord(filename, data) {
    try {
      await prisma.connect();

      const now = new Date();
      const collectionDate = now.toISOString().split('T')[0];
      const collectionTime = now.toTimeString().split(' ')[0];
      const dataContent = JSON.stringify(data);

      const filePath = path.join(this.dataPath, filename);
      const fileBuffer = await fs.readFile(filePath);
      
      const mockFile = {
        buffer: fileBuffer,
        originalname: filename,
        mimetype: 'text/csv'
      };

      const uploadResult = await supabaseStorageService.uploadDataCollectionFile(
        mockFile, 
        `collection_${Date.now()}`
      );

      await prisma.client.dataCollection.create({
        data: {
          collectionDate,
          collectionTime,
          dataSource: this.sourceUrl,
          dataContent,
          filePath: uploadResult.path
        }
      });

      logger.info('Collection record saved to database and file uploaded to Supabase Storage');
    } catch (error) {
      logger.error('Error saving collection record:', error);
      throw error;
    }
  }

  async run() {
    try {
      logger.info('Starting data collection process');

      const data = await this.collectData();
      const filename = this.generateFilename();
      const filePath = await this.saveToCSV(data, filename);

      await this.saveCollectionRecord(filename, data);

      logger.info('Data collection process completed successfully', {
        filename,
        filePath,
        recordCount: Array.isArray(data) ? data.length : 1
      });

      return {
        success: true,
        filename,
        filePath,
        recordCount: Array.isArray(data) ? data.length : 1
      };

    } catch (error) {
      logger.error('Data collection process failed:', error);
      throw error;
    }
  }
}

if (require.main === module) {
  const collector = new DataCollector();
  collector.run()
    .then(result => {
      console.log('Collection completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Collection failed:', error);
      process.exit(1);
    });
}

module.exports = DataCollector;
