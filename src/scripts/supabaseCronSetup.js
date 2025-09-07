const { PrismaClient } = require('@prisma/client');
const config = require('../config/config');
const { logger } = require('../utils/logger');

class AdvancedSupabaseCron {
  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url
        }
      }
    });
  }

  async enablePgCronExtension() {
    try {
      logger.info('Enabling pg_cron extension...');
      
      await this.prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_cron;`;
      
      logger.info('pg_cron extension enabled successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to enable pg_cron extension:', error);
      throw error;
    }
  }

  async createDataCollectionsTable() {
    try {
      logger.info('Creating data_collections table...');
      
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS data_collections (
          id SERIAL PRIMARY KEY,
          collection_date TEXT NOT NULL,
          collection_time TEXT NOT NULL,
          data_source TEXT NOT NULL,
          data_content TEXT NOT NULL,
          file_path TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      logger.info('data_collections table created successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to create data_collections table:', error);
      throw error;
    }
  }

  async createCronFunctions() {
    try {
      logger.info('Creating cron functions...');
      
      await this.prisma.$executeRaw`
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
          collection_date := TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD');
          collection_time := TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'HH24:MI:SS');
          
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
          
          file_path := 'cron_' || collection_date || '_' || REPLACE(collection_time, ':', '.') || '.json';
          
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

      await this.prisma.$executeRaw`
        CREATE OR REPLACE FUNCTION cron_data_cleanup()
        RETURNS TEXT
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          deleted_count INTEGER;
          cutoff_date DATE;
        BEGIN
          cutoff_date := CURRENT_DATE - INTERVAL '30 days';
          
          DELETE FROM data_collections 
          WHERE created_at < cutoff_date;
          
          GET DIAGNOSTICS deleted_count = ROW_COUNT;
          
          RETURN 'Data cleanup completed. Deleted ' || deleted_count || ' records older than ' || cutoff_date;
        END;
        $$;
      `;
      
      logger.info('Cron functions created successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to create cron functions:', error);
      throw error;
    }
  }

  async setupCronJobs() {
    try {
      logger.info('Setting up cron jobs...');
      
      const jobs = [
        {
          name: 'data_collection_morning',
          schedule: '0 8 * * *',
          command: `SELECT cron_data_collection('morning');`,
          description: 'Morning data collection at 08:00 WIB'
        },
        {
          name: 'data_collection_noon',
          schedule: '0 12 * * *',
          command: `SELECT cron_data_collection('noon');`,
          description: 'Noon data collection at 12:00 WIB'
        },
        {
          name: 'data_collection_afternoon',
          schedule: '0 15 * * *',
          command: `SELECT cron_data_collection('afternoon');`,
          description: 'Afternoon data collection at 15:00 WIB'
        },
        {
          name: 'data_cleanup_daily',
          schedule: '0 2 * * *',
          command: `SELECT cron_data_cleanup();`,
          description: 'Daily data cleanup at 02:00 WIB'
        }
      ];

      const results = [];

      for (const job of jobs) {
        try {
          await this.prisma.$executeRaw`SELECT cron.schedule(${job.name}, ${job.schedule}, ${job.command});`;
          logger.info(`Created cron job: ${job.name}`);
          results.push({ job: job.name, success: true });
        } catch (error) {
          logger.warn(`Failed to create job '${job.name}': ${error.message}`);
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

  async listCronJobs() {
    try {
      logger.info('Listing existing cron jobs...');
      
      const jobs = await this.prisma.$queryRaw`SELECT * FROM cron.job ORDER BY jobid;`;
      
      logger.info('Cron jobs retrieved successfully', { count: jobs.length });
      return { success: true, jobs };
    } catch (error) {
      logger.error('Failed to list cron jobs:', error);
      throw error;
    }
  }

  async testCronFunctions() {
    try {
      logger.info('Testing cron functions...');
      
      const collectionResult = await this.prisma.$queryRaw`SELECT cron_data_collection('test');`;
      logger.info('Data collection test result:', collectionResult[0]);
      
      const cleanupResult = await this.prisma.$queryRaw`SELECT cron_data_cleanup();`;
      logger.info('Data cleanup test result:', cleanupResult[0]);
      
      return { 
        success: true, 
        collectionResult: collectionResult[0],
        cleanupResult: cleanupResult[0]
      };
    } catch (error) {
      logger.error('Failed to test cron functions:', error);
      throw error;
    }
  }

  async getDataCollections() {
    try {
      logger.info('Retrieving data collections...');
      
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
        LIMIT 10;
      `;
      
      logger.info('Data collections retrieved successfully', { count: collections.length });
      return { success: true, collections };
    } catch (error) {
      logger.error('Failed to get data collections:', error);
      throw error;
    }
  }

  async completeSetup() {
    try {
      logger.info('Starting complete Supabase cron setup...');
      
      await this.enablePgCronExtension();
      
      await this.createDataCollectionsTable();
      
      await this.createCronFunctions();
      
      const jobResults = await this.setupCronJobs();
      
      const testResults = await this.testCronFunctions();
      
      logger.info('Complete Supabase cron setup finished successfully');
      return { 
        success: true, 
        message: 'Supabase cron setup completed successfully',
        jobResults,
        testResults
      };
    } catch (error) {
      logger.error('Complete setup failed:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

async function main() {
  const setup = new AdvancedSupabaseCron();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'setup':
      case 'init':
        const result = await setup.completeSetup();
        console.log('Setup completed:', result);
        break;
        
      case 'test':
        const testResult = await setup.testCronFunctions();
        console.log('Test result:', testResult);
        break;
        
      case 'list':
        const jobs = await setup.listCronJobs();
        console.log('Cron jobs:', jobs);
        break;
        
      case 'collections':
        const collections = await setup.getDataCollections();
        console.log('Data collections:', collections);
        break;
        
      case 'enable-extension':
        await setup.enablePgCronExtension();
        console.log('Extension enabled');
        break;
        
      case 'create-table':
        await setup.createDataCollectionsTable();
        console.log('Table created');
        break;
        
      case 'create-functions':
        await setup.createCronFunctions();
        console.log('Functions created');
        break;
        
      case 'setup-jobs':
        const jobResult = await setup.setupCronJobs();
        console.log('Jobs setup:', jobResult);
        break;
        
      default:
        console.log('Advanced Supabase Cron Setup');
        console.log('');
        console.log('Usage:');
        console.log('  node advancedSupabaseCron.js setup        - Complete setup');
        console.log('  node advancedSupabaseCron.js test         - Test functions');
        console.log('  node advancedSupabaseCron.js list         - List cron jobs');
        console.log('  node advancedSupabaseCron.js collections  - Get data collections');
        console.log('  node advancedSupabaseCron.js enable-extension - Enable pg_cron');
        console.log('  node advancedSupabaseCron.js create-table - Create data table');
        console.log('  node advancedSupabaseCron.js create-functions - Create functions');
        console.log('  node advancedSupabaseCron.js setup-jobs   - Setup cron jobs');
        break;
    }
    
    await setup.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Setup error:', error);
    console.error('Error:', error.message);
    await setup.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AdvancedSupabaseCron;
