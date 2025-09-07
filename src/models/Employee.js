const { body, validationResult } = require('express-validator');

class Employee {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.position = data.position;
    this.joinDate = data.join_date;
    this.releaseDate = data.release_date;
    this.experienceYears = data.experience_years;
    this.salary = data.salary;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Validation rules for employee data
  static getValidationRules() {
    return [
      body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),

      body('position')
        .trim()
        .notEmpty()
        .withMessage('Position is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Position must be between 2 and 100 characters'),

      body('join_date')
        .trim()
        .notEmpty()
        .withMessage('Join date is required')
        .isISO8601()
        .withMessage('Join date must be a valid date (YYYY-MM-DD)'),

      body('release_date')
        .optional()
        .trim()
        .isISO8601()
        .withMessage('Release date must be a valid date (YYYY-MM-DD)'),

      body('experience_years')
        .isFloat({ min: 0, max: 50 })
        .withMessage('Experience years must be between 0 and 50'),

      body('salary')
        .isInt({ min: 0 })
        .withMessage('Salary must be a positive integer')
    ];
  }

  // Validate employee data
  static validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }

  // Convert to JSON format for API response
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      position: this.position,
      join_date: this.joinDate,
      release_date: this.releaseDate,
      experience_years: this.experienceYears,
      salary: this.salary,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  // Create from database row
  static fromDBRow(row) {
    return new Employee(row);
  }

  // Convert to database format
  toDBFormat() {
    return {
      name: this.name,
      position: this.position,
      join_date: this.joinDate,
      release_date: this.releaseDate,
      experience_years: this.experienceYears,
      salary: this.salary
    };
  }
}

module.exports = Employee;

