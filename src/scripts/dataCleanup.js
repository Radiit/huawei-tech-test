const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const database = require('../config/database');
const { logger } = require('../utils/logger');

class DataCleanup {
  constructor() {
    this.dataPath = config.cron.dataPath;
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      logger.warn(`Data directory does not exist: ${this.dataPath}`);
      return false;
    }
    return true;
  }

  getOldFiles(days = 30) {
    try {
      if (!this.ensureDataDirectory()) {
        return [];
      }

      const files = fs.readdirSync(this.dataPath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const oldFiles = files.filter(file => {
        const filePath = path.join(this.dataPath, file);
        const stats = fs.statSync(filePath);
        return stats.mtime < cutoffDate;
      });

      logger.info(`Found ${oldFiles.length} files older than ${days} days`);
      return oldFiles;
    } catch (error) {
      logger.error('Error getting old files:', error);
      throw error;
    }
  }

  async deleteOldFiles(files) {
    const deletedFiles = [];
    const failedFiles = [];

    for (const file of files) {
      try {
        const filePath = path.join(this.dataPath, file);
        fs.unlinkSync(filePath);
        deletedFiles.push(file);
        logger.info(`Deleted file: ${file}`);
      } catch (error) {
        failedFiles.push({ file, error: error.message });
        logger.error(`Failed to delete file ${file}:`, error);
      }
    }

    return { deletedFiles, failedFiles };
  }

  async updateDatabaseRecords(deletedFiles) {
    try {
      await database.connect();

      for (const file of deletedFiles) {
        const sql = `
          UPDATE data_collections 
          SET file_path = NULL 
          WHERE file_path = ?
        `;

        await database.run(sql, [file]);
        logger.info(`Updated database record for deleted file: ${file}`);
      }
    } catch (error) {
      logger.error('Error updating database records:', error);
      throw error;
    }
  }

  async getCleanupStats() {
    try {
      await database.connect();

      const totalCollectionsSql = 'SELECT COUNT(*) as total FROM data_collections';
      const totalCollections = await database.query(totalCollectionsSql);

      const activeFilesSql = 'SELECT COUNT(*) as active FROM data_collections WHERE file_path IS NOT NULL';
      const activeFiles = await database.query(activeFilesSql);

      const deletedFilesSql = 'SELECT COUNT(*) as deleted FROM data_collections WHERE file_path IS NULL';
      const deletedFiles = await database.query(deletedFilesSql);

      return {
        totalCollections: totalCollections[0].total,
        activeFiles: activeFiles[0].active,
        deletedFiles: deletedFiles[0].deleted
      };
    } catch (error) {
      logger.error('Error getting cleanup stats:', error);
      throw error;
    }
  }

  async run(days = 30) {
    try {
      logger.info(`Starting data cleanup process (files older than ${days} days)`);

      const oldFiles = this.getOldFiles(days);

      if (oldFiles.length === 0) {
        logger.info('No old files found for cleanup');
        return {
          success: true,
          message: 'No old files found for cleanup',
          deletedFiles: [],
          failedFiles: []
        };
      }

      const { deletedFiles, failedFiles } = await this.deleteOldFiles(oldFiles);

      if (deletedFiles.length > 0) {
        await this.updateDatabaseRecords(deletedFiles);
      }

      const stats = await this.getCleanupStats();

      logger.info('Data cleanup process completed', {
        totalFiles: oldFiles.length,
        deletedFiles: deletedFiles.length,
        failedFiles: failedFiles.length,
        stats
      });

      return {
        success: true,
        message: `Cleanup completed. Deleted ${deletedFiles.length} files, ${failedFiles.length} failed`,
        deletedFiles,
        failedFiles,
        stats
      };

    } catch (error) {
      logger.error('Data cleanup process failed:', error);
      throw error;
    }
  }
}

if (require.main === module) {
  const cleanup = new DataCleanup();
  const days = process.argv[2] ? parseInt(process.argv[2]) : 30;

  cleanup.run(days)
    .then(result => {
      console.log('Cleanup completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = DataCleanup;

