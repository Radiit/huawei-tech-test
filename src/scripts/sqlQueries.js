const database = require('../config/database');
const { logger } = require('../utils/logger');

class SQLQueries {
  constructor() {
    this.initializeData();
  }

  // Initialize with sample data from requirement
  async initializeData() {
    try {
      await database.connect();

      // Check if data already exists
      const existingData = await database.query('SELECT COUNT(*) as count FROM employees');
      if (existingData[0].count > 0) {
        logger.info('Sample data already exists, skipping initialization');
        return;
      }

      // Insert sample data from requirement
      const sampleData = [
        {
          name: 'Jacky',
          position: 'Solution Architect',
          join_date: '2018-07-25',
          release_date: '2022-07-25',
          experience_years: 8,
          salary: 0 // Salary not specified in requirement
        },
        {
          name: 'John',
          position: 'Assistant Manager',
          join_date: '2016-02-02',
          release_date: '2021-02-02',
          experience_years: 12,
          salary: 0
        },
        {
          name: 'Alano',
          position: 'Manager',
          join_date: '2010-11-09',
          release_date: null,
          experience_years: 14,
          salary: 0
        },
        {
          name: 'Aaron',
          position: 'Engineer',
          join_date: '2021-08-16',
          release_date: '2022-08-16',
          experience_years: 1,
          salary: 0
        },
        {
          name: 'Allen',
          position: 'Engineer',
          join_date: '2024-06-06',
          release_date: null,
          experience_years: 4,
          salary: 0
        },
        {
          name: 'Peter',
          position: 'Team Leader',
          join_date: '2020-01-09',
          release_date: null,
          experience_years: 3,
          salary: 0
        }
      ];

      for (const employee of sampleData) {
        const sql = `
          INSERT INTO employees (name, position, join_date, release_date, experience_years, salary)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        await database.run(sql, [
          employee.name,
          employee.position,
          employee.join_date,
          employee.release_date,
          employee.experience_years,
          employee.salary
        ]);
      }

      logger.info('Sample data initialized successfully');
    } catch (error) {
      logger.error('Error initializing sample data:', error);
      throw error;
    }
  }

  // 1. Add Albert as Engineer
  async addAlbert() {
    try {
      const sql = `
        INSERT INTO employees (name, position, join_date, experience_years, salary)
        VALUES (?, ?, ?, ?, ?)
      `;

      const result = await database.run(sql, [
        'Albert',
        'Engineer',
        '2024-01-24',
        2.5,
        50
      ]);

      logger.info('Albert added successfully with ID:', result.id);
      return { success: true, id: result.id, message: 'Albert added successfully' };
    } catch (error) {
      logger.error('Error adding Albert:', error);
      throw error;
    }
  }

  // 2. Update Engineer salary (assuming $1000 as not specified)
  async updateEngineerSalary(salary = 1000) {
    try {
      const sql = `
        UPDATE employees 
        SET salary = ?, updated_at = CURRENT_TIMESTAMP
        WHERE position = 'Engineer'
      `;

      const result = await database.run(sql, [salary]);

      logger.info(`Updated salary for ${result.changes} engineers to $${salary}`);
      return {
        success: true,
        updatedCount: result.changes,
        message: `Updated salary for ${result.changes} engineers to $${salary}`
      };
    } catch (error) {
      logger.error('Error updating engineer salary:', error);
      throw error;
    }
  }

  // 3. Calculate total salary for 2021
  async getTotalSalary2021() {
    try {
      const sql = `
        SELECT SUM(salary) as total_salary 
        FROM employees 
        WHERE strftime('%Y', join_date) <= '2021' 
        AND (release_date IS NULL OR strftime('%Y', release_date) >= '2021')
      `;

      const result = await database.query(sql);
      const totalSalary = result[0].total_salary || 0;

      logger.info(`Total salary for 2021: $${totalSalary}`);
      return {
        success: true,
        year: 2021,
        totalSalary,
        message: `Total salary expenditure for 2021: $${totalSalary}`
      };
    } catch (error) {
      logger.error('Error calculating total salary for 2021:', error);
      throw error;
    }
  }

  // 4. Get top 3 employees by experience
  async getTop3ByExperience() {
    try {
      const sql = `
        SELECT name, position, experience_years, salary
        FROM employees 
        ORDER BY experience_years DESC 
        LIMIT 3
      `;

      const result = await database.query(sql);

      logger.info('Top 3 employees by experience:', result);
      return {
        success: true,
        employees: result,
        message: 'Top 3 employees by experience retrieved successfully'
      };
    } catch (error) {
      logger.error('Error getting top 3 employees by experience:', error);
      throw error;
    }
  }

  // 5. Get engineers with experience <= 3 years (subquery)
  async getEngineersLowExperience() {
    try {
      const sql = `
        SELECT name, position, experience_years, salary
        FROM employees 
        WHERE position = 'Engineer' 
        AND experience_years <= 3
        ORDER BY experience_years ASC
      `;

      const result = await database.query(sql);

      logger.info('Engineers with low experience:', result);
      return {
        success: true,
        engineers: result,
        message: `Found ${result.length} engineers with experience <= 3 years`
      };
    } catch (error) {
      logger.error('Error getting engineers with low experience:', error);
      throw error;
    }
  }

  // Run all queries as specified in requirement
  async runAllQueries() {
    try {
      logger.info('Running all SQL queries from requirement');

      const results = {};

      // 1. Add Albert
      results.addAlbert = await this.addAlbert();

      // 2. Update Engineer salary
      results.updateEngineerSalary = await this.updateEngineerSalary(1000);

      // 3. Calculate total salary for 2021
      results.totalSalary2021 = await this.getTotalSalary2021();

      // 4. Get top 3 by experience
      results.top3ByExperience = await this.getTop3ByExperience();

      // 5. Get engineers with low experience
      results.engineersLowExperience = await this.getEngineersLowExperience();

      logger.info('All SQL queries completed successfully');
      return {
        success: true,
        message: 'All SQL queries executed successfully',
        results
      };

    } catch (error) {
      logger.error('Error running SQL queries:', error);
      throw error;
    }
  }

  // Get all employees
  async getAllEmployees() {
    try {
      const sql = 'SELECT * FROM employees ORDER BY experience_years DESC';
      const result = await database.query(sql);

      return {
        success: true,
        employees: result,
        count: result.length
      };
    } catch (error) {
      logger.error('Error getting all employees:', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const sqlQueries = new SQLQueries();

  sqlQueries.runAllQueries()
    .then(result => {
      console.log('SQL Queries Results:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('SQL Queries failed:', error);
      process.exit(1);
    });
}

module.exports = SQLQueries;

