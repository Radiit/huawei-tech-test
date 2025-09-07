const prisma = require('../lib/prisma');
const { logger } = require('../utils/logger');

class PrismaEmployeeService {
  async getAllEmployees(filters = {}, pagination = {}) {
    try {
      const where = {};
      
      if (filters.position) {
        where.position = { contains: filters.position, mode: 'insensitive' };
      }
      
      if (filters.minExperience !== undefined) {
        where.experienceYears = { gte: parseFloat(filters.minExperience) };
      }
      
      if (filters.maxExperience !== undefined) {
        where.experienceYears = { 
          ...where.experienceYears,
          lte: parseFloat(filters.maxExperience) 
        };
      }
      
      if (filters.minSalary !== undefined) {
        where.salary = { gte: parseInt(filters.minSalary) };
      }
      
      if (filters.maxSalary !== undefined) {
        where.salary = { 
          ...where.salary,
          lte: parseInt(filters.maxSalary) 
        };
      }
      
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { position: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const fieldMapping = {
        'created_at': 'createdAt',
        'updated_at': 'updatedAt',
        'join_date': 'joinDate',
        'release_date': 'releaseDate',
        'experience_years': 'experienceYears'
      };
      
      const sortBy = fieldMapping[pagination.sortBy] || pagination.sortBy || 'createdAt';

      const employees = await prisma.client.employee.findMany({
        where,
        skip: pagination.offset || 0,
        take: pagination.limit || 10,
        orderBy: {
          [sortBy]: (pagination.sortOrder || 'desc').toLowerCase()
        }
      });

      const total = await prisma.client.employee.count({ where });

      return { employees, total };
    } catch (error) {
      logger.error('Error getting all employees:', error);
      throw error;
    }
  }

  async getEmployeeById(id) {
    try {
      const employee = await prisma.client.employee.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      return employee;
    } catch (error) {
      logger.error(`Error getting employee by ID ${id}:`, error);
      throw error;
    }
  }

  async createEmployee(employeeData) {
    try {
      logger.info('Received employee data:', employeeData);
      
      const mappedData = {
        name: employeeData.name,
        position: employeeData.position,
        joinDate: employeeData.join_date || employeeData.joinDate,
        releaseDate: employeeData.release_date || employeeData.releaseDate,
        experienceYears: employeeData.experience_years || employeeData.experienceYears,
        salary: employeeData.salary
      };

      logger.info('Mapped data:', mappedData);

      const employee = await prisma.client.employee.create({
        data: mappedData
      });
      
      logger.info(`Employee created with ID: ${employee.id}`);
      return employee;
    } catch (error) {
      logger.error('Error creating employee:', error);
      throw error;
    }
  }

  async updateEmployee(id, employeeData) {
    try {
      const existingEmployee = await prisma.client.employee.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }

      const employee = await prisma.client.employee.update({
        where: { id: parseInt(id) },
        data: employeeData
      });
      
      logger.info(`Employee updated with ID: ${id}`);
      return employee;
    } catch (error) {
      logger.error(`Error updating employee ${id}:`, error);
      throw error;
    }
  }

  async deleteEmployee(id) {
    try {
      const existingEmployee = await prisma.client.employee.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }

      await prisma.client.employee.delete({
        where: { id: parseInt(id) }
      });
      
      logger.info(`Employee deleted with ID: ${id}`);
      return { success: true, message: 'Employee deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting employee ${id}:`, error);
      throw error;
    }
  }

  async getEmployeesByPosition(position) {
    try {
      const employees = await prisma.client.employee.findMany({
        where: {
          position: { contains: position, mode: 'insensitive' }
        },
        orderBy: { name: 'asc' }
      });
      
      return employees;
    } catch (error) {
      logger.error(`Error getting employees by position ${position}:`, error);
      throw error;
    }
  }

  async getTopEmployeesByExperience(limit = 3) {
    try {
      const employees = await prisma.client.employee.findMany({
        orderBy: { experienceYears: 'desc' },
        take: parseInt(limit)
      });
      
      return employees;
    } catch (error) {
      logger.error('Error getting top employees by experience:', error);
      throw error;
    }
  }

  async getEngineersWithLowExperience(maxExperience = 2) {
    try {
      const employees = await prisma.client.employee.findMany({
        where: {
          position: { contains: 'Engineer', mode: 'insensitive' },
          experienceYears: { lte: parseFloat(maxExperience) }
        },
        orderBy: { experienceYears: 'asc' }
      });
      
      return employees;
    } catch (error) {
      logger.error('Error getting engineers with low experience:', error);
      throw error;
    }
  }

  async getTotalSalaryForYear(year) {
    try {
      const employees = await prisma.client.employee.findMany({
        where: {
          OR: [
            {
              AND: [
                { joinDate: { contains: year } },
                { releaseDate: null }
              ]
            },
            {
              AND: [
                { joinDate: { contains: year } },
                { releaseDate: { contains: year } }
              ]
            },
            {
              AND: [
                { joinDate: { lt: `${year}-01-01` } },
                {
                  OR: [
                    { releaseDate: null },
                    { releaseDate: { gte: `${year}-01-01` } }
                  ]
                }
              ]
            }
          ]
        }
      });

      const totalSalary = employees.reduce((sum, emp) => sum + emp.salary, 0);
      
      return {
        year: parseInt(year),
        totalSalary,
        employeeCount: employees.length,
        employees: employees.map(emp => ({
          name: emp.name,
          position: emp.position,
          salary: emp.salary
        }))
      };
    } catch (error) {
      logger.error(`Error getting total salary for year ${year}:`, error);
      throw error;
    }
  }

  async updateEngineerSalary(percentage) {
    try {
      const result = await prisma.client.employee.updateMany({
        where: {
          position: { contains: 'Engineer', mode: 'insensitive' }
        },
        data: {
          salary: {
            multiply: 1 + (parseFloat(percentage) / 100)
          }
        }
      });
      
      logger.info(`Updated salary for ${result.count} engineers by ${percentage}%`);
      return { 
        success: true, 
        message: `Updated salary for ${result.count} engineers`,
        count: result.count
      };
    } catch (error) {
      logger.error('Error updating engineer salary:', error);
      throw error;
    }
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
      return albert;
    } catch (error) {
      logger.error('Error adding Albert:', error);
      throw error;
    }
  }
}

module.exports = new PrismaEmployeeService();
