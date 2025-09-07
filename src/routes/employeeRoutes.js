const express = require('express');
const employeeController = require('../controllers/employeeController');
const Employee = require('../models/Employee');
const { authenticate, canManageEmployees, canReadEmployees, canCreateEmployees, canUpdateEmployees, canDeleteEmployees, canViewReports } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticate);
router.get('/', canReadEmployees, employeeController.getAllEmployees);
router.get('/top-experience', canViewReports, employeeController.getTopEmployeesByExperience);
router.get('/engineers/low-experience', canViewReports, employeeController.getEngineersWithLowExperience);
router.get('/position/:position', canReadEmployees, employeeController.getEmployeesByPosition);
router.get('/salary/year/:year', canViewReports, employeeController.getTotalSalaryForYear);
router.get('/:id', canReadEmployees, employeeController.getEmployeeById);

router.post('/', 
  canCreateEmployees,
  Employee.getValidationRules(),
  Employee.validate,
  employeeController.createEmployee
);

router.put('/:id',
  canUpdateEmployees,
  Employee.getValidationRules(),
  Employee.validate,
  employeeController.updateEmployee
);

router.patch('/engineers/salary', canManageEmployees, employeeController.updateEngineerSalary);
router.delete('/:id', canDeleteEmployees, employeeController.deleteEmployee);
module.exports = router;
