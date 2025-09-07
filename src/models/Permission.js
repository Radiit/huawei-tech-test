const { body } = require('express-validator');

class Permission {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.resource = data.resource;
    this.action = data.action;
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
        .withMessage('Permission name is required')
        .isLength({ min: 3, max: 100 })
        .withMessage('Permission name must be between 3 and 100 characters')
        .matches(/^[A-Z_]+$/)
        .withMessage('Permission name must be uppercase letters and underscores only'),
      
      body('resource')
        .trim()
        .notEmpty()
        .withMessage('Resource is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Resource must be between 2 and 50 characters'),
      
      body('action')
        .trim()
        .notEmpty()
        .withMessage('Action is required')
        .isIn(['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE'])
        .withMessage('Action must be one of: CREATE, READ, UPDATE, DELETE, MANAGE'),
      
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
      resource: this.resource,
      action: this.action,
      description: this.description,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromDBRow(row) {
    return new Permission(row);
  }

  toDBFormat() {
    return {
      name: this.name,
      resource: this.resource,
      action: this.action,
      description: this.description,
      is_active: this.isActive
    };
  }

  matches(resource, action) {
    return this.resource === resource && this.action === action;
  }
}

module.exports = Permission;

