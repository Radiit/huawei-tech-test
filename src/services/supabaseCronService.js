const { createClient } = require('@supabase/supabase-js');
const config = require('../config/config');
const { logger } = require('../utils/logger');

class SupabaseCronService {
  constructor() {
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
  }

  
  async createCronJob(jobName, schedule, command, description) {
    try {
      const { data, error } = await this.supabase.rpc('cron.schedule', {
        job_name: jobName,
        schedule: schedule,
        command: command,
        description: description
      });

      if (error) {
        logger.error('Error creating cron job:', error);
        throw error;
      }

      logger.info(`Cron job '${jobName}' created successfully`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to create cron job '${jobName}':`, error);
      throw error;
    }
  }

  
  async deleteCronJob(jobName) {
    try {
      const { data, error } = await this.supabase.rpc('cron.unschedule', {
        job_name: jobName
      });

      if (error) {
        logger.error('Error deleting cron job:', error);
        throw error;
      }

      logger.info(`Cron job '${jobName}' deleted successfully`);
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to delete cron job '${jobName}':`, error);
      throw error;
    }
  }

  
  async listCronJobs() {
    try {
      const { data, error } = await this.supabase.rpc('exec_sql', {
        sql: 'SELECT * FROM cron.job ORDER BY jobid;'
      });

      if (error) {
        logger.error('Error listing cron jobs:', error);
        throw error;
      }

      return { success: true, data: data || [] };
    } catch (error) {
      logger.error('Failed to list cron jobs:', error);
      throw error;
    }
  }

  async setupCronJobs() {
    try {
      logger.info('Setting up Supabase pg_cron jobs...');

      // Data collection jobs (3 times daily: 08:00, 12:00, 15:00 WIB)
      const dataCollectionJobs = [
        {
          name: 'data_collection_morning',
          schedule: '0 8 * * *', // 08:00 WIB daily
          command: `SELECT cron_data_collection('morning');`,
          description: 'Morning data collection at 08:00 WIB'
        },
        {
          name: 'data_collection_noon',
          schedule: '0 12 * * *', // 12:00 WIB daily
          command: `SELECT cron_data_collection('noon');`,
          description: 'Noon data collection at 12:00 WIB'
        },
        {
          name: 'data_collection_afternoon',
          schedule: '0 15 * * *', // 15:00 WIB daily
          command: `SELECT cron_data_collection('afternoon');`,
          description: 'Afternoon data collection at 15:00 WIB'
        }
      ];

      // Data cleanup job (daily at 02:00 WIB)
      const dataCleanupJob = {
        name: 'data_cleanup_daily',
        schedule: '0 2 * * *', // 02:00 WIB daily
        command: `SELECT cron_data_cleanup();`,
        description: 'Daily data cleanup at 02:00 WIB'
      };

      const allJobs = [...dataCollectionJobs, dataCleanupJob];
      const results = [];

      for (const job of allJobs) {
        try {
          const result = await this.createCronJob(
            job.name,
            job.schedule,
            job.command,
            job.description
          );
          results.push({ job: job.name, success: true, result });
        } catch (error) {
          results.push({ job: job.name, success: false, error: error.message });
        }
      }

      logger.info('Cron jobs setup completed', { results });
      return { success: true, results };
    } catch (error) {
      logger.error('Failed to setup cron jobs:', error);
      throw error;
    }
  }

  async createCronFunctions() {
    try {
      logger.info('Creating cron database functions...');

      const dataCollectionFunction = `
        CREATE OR REPLACE FUNCTION cron_data_collection(session_name TEXT DEFAULT 'default')
        RETURNS TEXT
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result TEXT;
          collection_date TEXT;
          collection_time TEXT;
          data_content JSONB;
          file_path TEXT;
        BEGIN
          -- Get current timestamp in WIB timezone
          collection_date := TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD');
          collection_time := TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'HH24:MI:SS');
          
          -- Simulate data collection (replace with actual data source)
          data_content := jsonb_build_object(
            'session', session_name,
            'collected_at', NOW() AT TIME ZONE 'Asia/Jakarta',
            'data_source', 'https://jsonplaceholder.typicode.com/posts',
            'sample_data', jsonb_build_object(
              'id', 1,
              'title', 'Sample Data Collection',
              'body', 'This is automated data collection from pg_cron',
              'userId', 1
            )
          );
          
          -- Generate file path
          file_path := 'cron_' || collection_date || '_' || REPLACE(collection_time, ':', '.') || '.json';
          
          -- Insert into data_collections table
          INSERT INTO data_collections (
            collection_date,
            collection_time,
            data_source,
            data_content,
            file_path,
            created_at
          ) VALUES (
            collection_date,
            collection_time,
            'https://jsonplaceholder.typicode.com/posts',
            data_content::text,
            file_path,
            NOW()
          );
          
          result := 'Data collection completed for session: ' || session_name || 
                   ', File: ' || file_path || 
                   ', Records: 1';
          
          RETURN result;
        END;
        $$;
      `;

      const dataCleanupFunction = `
        CREATE OR REPLACE FUNCTION cron_data_cleanup()
        RETURNS TEXT
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          deleted_count INTEGER;
          cutoff_date DATE;
        BEGIN
          -- Delete records older than 30 days
          cutoff_date := CURRENT_DATE - INTERVAL '30 days';
          
          DELETE FROM data_collections 
          WHERE created_at < cutoff_date;
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          
          RETURN 'Data cleanup completed. Deleted ' || deleted_count || ' records older than ' || cutoff_date;
        END;
        $$;
      `;

      const { error: error1 } = await this.supabase.rpc('exec_sql', {
        sql: dataCollectionFunction
      });

      if (error1) {
        logger.error('Error creating data collection function:', error1);
        throw error1;
      }

      const { error: error2 } = await this.supabase.rpc('exec_sql', {
        sql: dataCleanupFunction
      });

      if (error2) {
        logger.error('Error creating data cleanup function:', error2);
        throw error2;
      }

      logger.info('Cron database functions created successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to create cron functions:', error);
      throw error;
    }
  }

  async testCronJob(jobName) {
    try {
      let command;
      
      switch (jobName) {
        case 'data_collection_morning':
          command = `SELECT cron_data_collection('morning');`;
          break;
        case 'data_collection_noon':
          command = `SELECT cron_data_collection('noon');`;
          break;
        case 'data_collection_afternoon':
          command = `SELECT cron_data_collection('afternoon');`;
          break;
        case 'data_cleanup_daily':
          command = `SELECT cron_data_cleanup();`;
          break;
        default:
          throw new Error(`Unknown job name: ${jobName}`);
      }

      const { data, error } = await this.supabase.rpc('exec_sql', {
        sql: command
      });

      if (error) {
        logger.error(`Error testing cron job '${jobName}':`, error);
        throw error;
      }

      logger.info(`Cron job '${jobName}' tested successfully:`, data);
      return { success: true, data };
    } catch (error) {
      logger.error(`Failed to test cron job '${jobName}':`, error);
      throw error;
    }
  }

  async getCronJobStatus() {
    try {
      const { data, error } = await this.supabase.rpc('exec_sql', {
        sql: 'SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 50;'
      });

      if (error) {
        logger.error('Error getting cron job status:', error);
        throw error;
      }

      return { success: true, data: data || [] };
    } catch (error) {
      logger.error('Failed to get cron job status:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseCronService();
