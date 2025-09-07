const database = require('../config/database');
const Employee = require('../models/Employee');
const { logger } = require('../utils/logger');

class EmployeeService {
  // Get all employees with optional filtering and pagination
  async getAllEmployees(filters = {}, pagination = {}) {
    try {
      let sql = 'SELECT * FROM employees WHERE 1=1';
      const params = [];

      // Apply filters
      if (filters.position) {
        sql += ' AND position = ?';
        params.push(filters.position);
      }

      if (filters.minExperience) {
        sql += ' AND experience_years >= ?';
        params.push(filters.minExperience);
      }

      if (filters.maxExperience) {
        sql += ' AND experience_years <= ?';
        params.push(filters.maxExperience);
      }

      // Apply sorting
      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'DESC';
      sql += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Apply pagination
      if (pagination.limit) {
        sql += ' LIMIT ?';
        params.push(pagination.limit);

        if (pagination.offset) {
          sql += ' OFFSET ?';
          params.push(pagination.offset);
        }
      }

      const rows = await database.query(sql, params);
      return rows.map(row => Employee.fromDBRow(row));
    } catch (error) {
      logger.error('Error getting all employees:', error);
      throw error;
    }
  }

  // Get employee by ID
  async getEmployeeById(id) {
    try {
      const sql = 'SELECT * FROM employees WHERE id = ?';
      const rows = await database.query(sql, [id]);

      if (rows.length === 0) {
        return null;
      }

      return Employee.fromDBRow(rows[0]);
    } catch (error) {
      logger.error(`Error getting employee by ID ${id}:`, error);
      throw error;
    }
  }

  // Create new employee
  async createEmployee(employeeData) {
    try {
      const employee = new Employee(employeeData);
      const dbData = employee.toDBFormat();

      const sql = `
        INSERT INTO employees (name, position, join_date, release_date, experience_years, salary)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const params = [
        dbData.name,
        dbData.position,
        dbData.join_date,
        dbData.release_date,
        dbData.experience_years,
        dbData.salary
      ];

      const result = await database.run(sql, params);

      // Return the created employee with ID
      const createdEmployee = await this.getEmployeeById(result.id);
      logger.info(`Employee created with ID: ${result.id}`);

      return createdEmployee;
    } catch (error) {
      logger.error('Error creating employee:', error);
      throw error;
    }
  }

  // Update employee
  async updateEmployee(id, employeeData) {
    try {
      const existingEmployee = await this.getEmployeeById(id);
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }

      const employee = new Employee({ ...existingEmployee, ...employeeData });
      const dbData = employee.toDBFormat();

      const sql = `
        UPDATE employees 
        SET name = ?, position = ?, join_date = ?, release_date = ?, 
            experience_years = ?, salary = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const params = [
        dbData.name,
        dbData.position,
        dbData.join_date,
        dbData.release_date,
        dbData.experience_years,
        dbData.salary,
        id
      ];

      const result = await database.run(sql, params);

      if (result.changes === 0) {
        throw new Error('Employee not found or no changes made');
      }

      const updatedEmployee = await this.getEmployeeById(id);
      logger.info(`Employee updated with ID: ${id}`);

      return updatedEmployee;
    } catch (error) {
      logger.error(`Error updating employee ${id}:`, error);
      throw error;
    }
  }

  // Delete employee
  async deleteEmployee(id) {
    try {
      const sql = 'DELETE FROM employees WHERE id = ?';
      const result = await database.run(sql, [id]);

      if (result.changes === 0) {
        throw new Error('Employee not found');
      }

      logger.info(`Employee deleted with ID: ${id}`);
      return { success: true, message: 'Employee deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting employee ${id}:`, error);
      throw error;
    }
  }

  // Get employees by position
  async getEmployeesByPosition(position) {
    try {
      const sql = 'SELECT * FROM employees WHERE position = ? ORDER BY experience_years DESC';
      const rows = await database.query(sql, [position]);
      return rows.map(row => Employee.fromDBRow(row));
    } catch (error) {
      logger.error(`Error getting employees by position ${position}:`, error);
      throw error;
    }
  }

  // Get total salary for a specific year
  async getTotalSalaryForYear(year) {
    try {
      const sql = `
        SELECT SUM(salary) as total_salary 
        FROM employees 
        WHERE strftime('%Y', join_date) <= ? 
        AND (release_date IS NULL OR strftime('%Y', release_date) >= ?)
      `;

      const rows = await database.query(sql, [year, year]);
      return rows[0].total_salary || 0;
    } catch (error) {
      logger.error(`Error getting total salary for year ${year}:`, error);
      throw error;
    }
  }

  // Get top employees by experience
  async getTopEmployeesByExperience(limit = 3) {
    try {
      const sql = `
        SELECT * FROM employees 
        ORDER BY experience_years DESC 
        LIMIT ?
      `;

      const rows = await database.query(sql, [limit]);
      return rows.map(row => Employee.fromDBRow(row));
    } catch (error) {
      logger.error('Error getting top employees by experience:', error);
      throw error;
    }
  }

  // Get engineers with experience <= 3 years
  async getEngineersWithLowExperience() {
    try {
      const sql = `
        SELECT * FROM employees 
        WHERE position = 'Engineer' AND experience_years <= 3
        ORDER BY experience_years ASC
      `;

      const rows = await database.query(sql);
      return rows.map(row => Employee.fromDBRow(row));
    } catch (error) {
      logger.error('Error getting engineers with low experience:', error);
      throw error;
    }
  }

  // Update salary for all engineers
  async updateEngineerSalary(newSalary) {
    try {
      const sql = `
        UPDATE employees 
        SET salary = ?, updated_at = CURRENT_TIMESTAMP
        WHERE position = 'Engineer'
      `;

      const result = await database.run(sql, [newSalary]);
      logger.info(`Updated salary for ${result.changes} engineers to $${newSalary}`);

      return {
        success: true,
        message: `Updated salary for ${result.changes} engineers`,
        updatedCount: result.changes
      };
    } catch (error) {
      logger.error('Error updating engineer salary:', error);
      throw error;
    }
  }
}

module.exports = new EmployeeService();

