const { body, validationResult } = require('express-validator');

class Role {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static getValidationRules() {
    return [
      body('name')
        .trim()
        .notEmpty()
        .withMessage('Role name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Role name must be between 2 and 50 characters')
        .matches(/^[A-Z_]+$/)
        .withMessage('Role name must be uppercase letters and underscores only'),
      
      body('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 5, max: 200 })
        .withMessage('Description must be between 5 and 200 characters'),
      
      body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value')
    ];
  }

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

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDBRow(row) {
    return new Role(row);
  }

  toDBFormat() {
    return {
      name: this.name,
      description: this.description,
      is_active: this.isActive
    };
  }
}

module.exports = Role;
