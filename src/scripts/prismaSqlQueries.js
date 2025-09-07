const prisma = require('../lib/prisma');
const { logger } = require('../utils/logger');

class PrismaSQLQueries {
  constructor() {
    this.queries = {
      addAlbert: this.addAlbert.bind(this),
      updateEngineerSalary: this.updateEngineerSalary.bind(this),
      getTotalSalary2021: this.getTotalSalary2021.bind(this),
      getTop3ByExperience: this.getTop3ByExperience.bind(this),
      getEngineersWithLowExperience: this.getEngineersWithLowExperience.bind(this)
    };
  }


  async addAlbert() {
    try {
      const albert = await prisma.client.employee.upsert({
        where: {
          name_position: {
            name: 'Albert',
            position: 'Engineer'
          }
        },
        update: {
          joinDate: '2024-01-24',
          releaseDate: null,
          experienceYears: 2.5,
          salary: 70000
        },
        create: {
          name: 'Albert',
          position: 'Engineer',
          joinDate: '2024-01-24',
          releaseDate: null,
          experienceYears: 2.5,
          salary: 70000
        }
      });

      logger.info('Albert added/updated successfully');
      return {
        success: true,
        message: 'Albert added successfully',
        data: albert
      };
    } catch (error) {
      logger.error('Error adding Albert:', error);
      throw error;
    }
  }


  async updateEngineerSalary() {
    try {
      const result = await prisma.client.employee.updateMany({
        where: {
          position: { contains: 'Engineer', mode: 'insensitive' }
        },
        data: {
          salary: {
            multiply: 1.1
          }
        }
      });

      logger.info(`Updated salary for ${result.count} engineers by 10%`);
      return {
        success: true,
        message: `Updated salary for ${result.count} engineers by 10%`,
        count: result.count
      };
    } catch (error) {
      logger.error('Error updating engineer salary:', error);
      throw error;
    }
  }


  async getTotalSalary2021() {
    try {
      const employees = await prisma.client.employee.findMany({
        where: {
          OR: [
            {
              AND: [
                { joinDate: { contains: '2021' } },
                { releaseDate: null }
              ]
            },
            {
              AND: [
                { joinDate: { contains: '2021' } },
                { releaseDate: { contains: '2021' } }
              ]
            },
            {
              AND: [
                { joinDate: { lt: '2021-01-01' } },
                {
                  OR: [
                    { releaseDate: null },
                    { releaseDate: { gte: '2021-01-01' } }
                  ]
                }
              ]
            }
          ]
        }
      });

      const totalSalary = employees.reduce((sum, emp) => sum + emp.salary, 0);
      
      logger.info(`Total salary for 2021: $${totalSalary}`);
      return {
        success: true,
        year: 2021,
        totalSalary,
        employeeCount: employees.length,
        employees: employees.map(emp => ({
          name: emp.name,
          position: emp.position,
          salary: emp.salary
        }))
      };
    } catch (error) {
      logger.error('Error getting total salary for 2021:', error);
      throw error;
    }
  }


  async getTop3ByExperience() {
    try {
      const employees = await prisma.client.employee.findMany({
        orderBy: { experienceYears: 'desc' },
        take: 3
      });

      logger.info(`Retrieved top 3 employees by experience`);
      return {
        success: true,
        employees: employees.map(emp => ({
          name: emp.name,
          position: emp.position,
          experienceYears: emp.experienceYears
        }))
      };
    } catch (error) {
      logger.error('Error getting top 3 employees by experience:', error);
      throw error;
    }
  }


  async getEngineersWithLowExperience() {
    try {
      const employees = await prisma.client.employee.findMany({
        where: {
          position: { contains: 'Engineer', mode: 'insensitive' },
          experienceYears: { lte: 2 }
        },
        orderBy: { experienceYears: 'asc' }
      });

      logger.info(`Found ${employees.length} engineers with low experience`);
      return {
        success: true,
        count: employees.length,
        employees: employees.map(emp => ({
          name: emp.name,
          position: emp.position,
          experienceYears: emp.experienceYears
        }))
      };
    } catch (error) {
      logger.error('Error getting engineers with low experience:', error);
      throw error;
    }
  }


  async executeAllQueries() {
    try {
      logger.info('Starting execution of all SQL queries...');
      
      const results = {};
      
      for (const [queryName, queryFunction] of Object.entries(this.queries)) {
        try {
          logger.info(`Executing query: ${queryName}`);
          results[queryName] = await queryFunction();
          logger.info(`Query ${queryName} completed successfully`);
        } catch (error) {
          logger.error(`Query ${queryName} failed:`, error);
          results[queryName] = {
            success: false,
            error: error.message
          };
        }
      }
      
      logger.info('All queries execution completed');
      return {
        success: true,
        message: 'All queries executed',
        results
      };
    } catch (error) {
      logger.error('Error executing queries:', error);
      throw error;
    }
  }


  async executeQuery(queryName) {
    try {
      if (!this.queries[queryName]) {
        throw new Error(`Query '${queryName}' not found`);
      }
      
      logger.info(`Executing query: ${queryName}`);
      const result = await this.queries[queryName]();
      logger.info(`Query ${queryName} completed successfully`);
      
      return result;
    } catch (error) {
      logger.error(`Query ${queryName} failed:`, error);
      throw error;
    }
  }


  listQueries() {
    return {
      success: true,
      queries: Object.keys(this.queries).map(name => ({
        name,
        description: this.getQueryDescription(name)
      }))
    };
  }


  getQueryDescription(queryName) {
    const descriptions = {
      addAlbert: 'Add Albert as a new Engineer employee',
      updateEngineerSalary: 'Update all Engineer salaries by 10%',
      getTotalSalary2021: 'Get total salary for all employees in 2021',
      getTop3ByExperience: 'Get top 3 employees by experience years',
      getEngineersWithLowExperience: 'Get engineers with experience ≤ 2 years'
    };
    
    return descriptions[queryName] || 'No description available';
  }
}

    
if (require.main === module) {
  const queries = new PrismaSQLQueries();
  
  const command = process.argv[2];
  
  if (command === 'list') {
    console.log('Available queries:', queries.listQueries());
  } else if (command && queries.queries[command]) {
    queries.executeQuery(command)
      .then(result => {
        console.log(`Query '${command}' result:`, result);
        process.exit(0);
      })
      .catch(error => {
        console.error(`Query '${command}' failed:`, error);
        process.exit(1);
      });
  } else if (command === 'all') {
    queries.executeAllQueries()
      .then(result => {
        console.log('All queries result:', result);
        process.exit(0);
      })
      .catch(error => {
        console.error('All queries failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  node prismaSqlQueries.js list                    - List available queries');
    console.log('  node prismaSqlQueries.js <queryName>             - Execute specific query');
    console.log('  node prismaSqlQueries.js all                     - Execute all queries');
    console.log('');
    console.log('Available queries:', Object.keys(queries.queries));
  }
}

module.exports = PrismaSQLQueries;

