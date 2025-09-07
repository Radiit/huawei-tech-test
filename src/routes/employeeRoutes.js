const express = require('express');
const employeeController = require('../controllers/employeeController');
const Employee = require('../models/Employee');
const { authenticate, canManageEmployees, canReadEmployees, canCreateEmployees, canUpdateEmployees, canDeleteEmployees, canViewReports } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/employees - Get all employees with optional filtering
router.get('/', canReadEmployees, employeeController.getAllEmployees);

// GET /api/employees/top-experience - Get top employees by experience
router.get('/top-experience', canViewReports, employeeController.getTopEmployeesByExperience);

// GET /api/employees/engineers/low-experience - Get engineers with low experience
router.get('/engineers/low-experience', canViewReports, employeeController.getEngineersWithLowExperience);

// GET /api/employees/position/:position - Get employees by position
router.get('/position/:position', canReadEmployees, employeeController.getEmployeesByPosition);

// GET /api/employees/salary/year/:year - Get total salary for specific year
router.get('/salary/year/:year', canViewReports, employeeController.getTotalSalaryForYear);

// GET /api/employees/:id - Get employee by ID
router.get('/:id', canReadEmployees, employeeController.getEmployeeById);

// POST /api/employees - Create new employee
router.post('/', 
  canCreateEmployees,
  Employee.getValidationRules(),
  Employee.validate,
  employeeController.createEmployee
);

// PUT /api/employees/:id - Update employee
router.put('/:id',
  canUpdateEmployees,
  Employee.getValidationRules(),
  Employee.validate,
  employeeController.updateEmployee
);

// PATCH /api/employees/engineers/salary - Update engineer salary
router.patch('/engineers/salary', canManageEmployees, employeeController.updateEngineerSalary);

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', canDeleteEmployees, employeeController.deleteEmployee);

module.exports = router;
