const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.passwordHash = data.password_hash;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.isActive = data.is_active;
    this.lastLogin = data.last_login;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Validation rules for user registration
  static getRegistrationValidationRules() {
    return [
      body('email')
        .trim()
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
      
      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
      
      body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
      
      body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters')
    ];
  }

  // Validation rules for user login
  static getLoginValidationRules() {
    return [
      body('email')
        .trim()
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
      
      body('password')
        .notEmpty()
        .withMessage('Password is required')
    ];
  }

  // Validation rules for user update
  static getUpdateValidationRules() {
    return [
      body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
      
      body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
      
      body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value')
    ];
  }

  // Validate user data
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

  // Hash password
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  async comparePassword(password) {
    return await bcrypt.compare(password, this.passwordHash);
  }

  // Convert to JSON format for API response (exclude sensitive data)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      isActive: this.isActive,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from database row
  static fromDBRow(row) {
    return new User(row);
  }

  // Convert to database format
  toDBFormat() {
    return {
      email: this.email,
      password_hash: this.passwordHash,
      first_name: this.firstName,
      last_name: this.lastName,
      is_active: this.isActive
    };
  }

  // Get full name
  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

module.exports = User;

