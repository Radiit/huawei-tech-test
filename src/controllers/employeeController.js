const employeeService = require('../services/prismaEmployeeService');
const { logger } = require('../utils/logger');

class EmployeeController {
  // Get all employees
  async getAllEmployees(req, res) {
    try {
      const { position, min_experience, max_experience, page = 1, limit = 10, sort_by = 'createdAt', sort_order = 'desc' } = req.query;
      
      const filters = {};
      if (position) filters.position = position;
      if (min_experience) filters.minExperience = parseFloat(min_experience);
      if (max_experience) filters.maxExperience = parseFloat(max_experience);
      
      const pagination = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order.toLowerCase()
      };
      
      const employees = await employeeService.getAllEmployees(filters, pagination);
      
      res.json({
        success: true,
        data: employees,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: employees.length
        }
      });
    } catch (error) {
      logger.error('Error in getAllEmployees controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get employee by ID
  async getEmployeeById(req, res) {
    try {
      const { id } = req.params;
      const employee = await employeeService.getEmployeeById(parseInt(id));
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      res.json({
        success: true,
        data: employee
      });
    } catch (error) {
      logger.error(`Error in getEmployeeById controller for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Create new employee
  async createEmployee(req, res) {
    try {
      const employee = await employeeService.createEmployee(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employee
      });
    } catch (error) {
      logger.error('Error in createEmployee controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Update employee
  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const employee = await employeeService.updateEmployee(parseInt(id), req.body);
      
      res.json({
        success: true,
        message: 'Employee updated successfully',
        data: employee
      });
    } catch (error) {
      logger.error(`Error in updateEmployee controller for ID ${req.params.id}:`, error);
      
      if (error.message === 'Employee not found') {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Delete employee
  async deleteEmployee(req, res) {
    try {
      const { id } = req.params;
      const result = await employeeService.deleteEmployee(parseInt(id));
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error(`Error in deleteEmployee controller for ID ${req.params.id}:`, error);
      
      if (error.message === 'Employee not found') {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get employees by position
  async getEmployeesByPosition(req, res) {
    try {
      const { position } = req.params;
      const employees = await employeeService.getEmployeesByPosition(position);
      
      res.json({
        success: true,
        data: employees
      });
    } catch (error) {
      logger.error(`Error in getEmployeesByPosition controller for position ${req.params.position}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get total salary for year
  async getTotalSalaryForYear(req, res) {
    try {
      const { year } = req.params;
      const totalSalary = await employeeService.getTotalSalaryForYear(year);
      
      res.json({
        success: true,
        data: {
          year: parseInt(year),
          total_salary: totalSalary
        }
      });
    } catch (error) {
      logger.error(`Error in getTotalSalaryForYear controller for year ${req.params.year}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get top employees by experience
  async getTopEmployeesByExperience(req, res) {
    try {
      const { limit = 3 } = req.query;
      const employees = await employeeService.getTopEmployeesByExperience(parseInt(limit));
      
      res.json({
        success: true,
        data: employees
      });
    } catch (error) {
      logger.error('Error in getTopEmployeesByExperience controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get engineers with low experience
  async getEngineersWithLowExperience(req, res) {
    try {
      const employees = await employeeService.getEngineersWithLowExperience();
      
      res.json({
        success: true,
        data: employees
      });
    } catch (error) {
      logger.error('Error in getEngineersWithLowExperience controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Update engineer salary
  async updateEngineerSalary(req, res) {
    try {
      const { salary } = req.body;
      
      if (!salary || salary < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid salary is required'
        });
      }
      
      const result = await employeeService.updateEngineerSalary(parseInt(salary));
      
      res.json({
        success: true,
        message: result.message,
        data: {
          updatedCount: result.updatedCount,
          newSalary: salary
        }
      });
    } catch (error) {
      logger.error('Error in updateEngineerSalary controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = new EmployeeController();
