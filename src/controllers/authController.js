const authService = require('../services/prismaAuthService');
const rbacService = require('../services/prismaRbacService');
const { logger } = require('../utils/logger');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const user = await authService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user.toJSON()
      });
    } catch (error) {
      logger.error('Error in register controller:', error);
      
      if (error.message === 'User with this email already exists') {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      logger.error('Error in login controller:', error);
      
      if (error.message === 'Invalid email or password' || error.message === 'Account is deactivated') {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = req.user;
      const roles = await rbacService.getUserRoles(user.id);
      const permissions = await rbacService.getUserPermissions(user.id);
      
      res.json({
        success: true,
        data: {
          user: user.toJSON(),
          roles: roles.map(role => role.toJSON()),
          permissions: permissions.map(permission => permission.toJSON())
        }
      });
    } catch (error) {
      logger.error('Error in getProfile controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await authService.updateUser(userId, req.body);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user.toJSON()
      });
    } catch (error) {
      logger.error('Error in updateProfile controller:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      const result = await authService.updatePassword(userId, currentPassword, newPassword);
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error in changePassword controller:', error);
      
      if (error.message === 'User not found' || error.message === 'Current password is incorrect') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Logout (client-side token removal)
  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // by removing the token from storage
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Error in logout controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get all users (admin only)
  async getAllUsers(req, res) {
    try {
      const { search, isActive, page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
      
      const filters = {};
      if (search) filters.search = search;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      
      const pagination = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        sortBy,
        sortOrder: sortOrder.toUpperCase()
      };
      
      const users = await authService.getAllUsers(filters, pagination);
      
      res.json({
        success: true,
        data: users.map(user => user.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: users.length
        }
      });
    } catch (error) {
      logger.error('Error in getAllUsers controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Get user by ID (admin/HR manager)
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await authService.getUserById(parseInt(id));
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const roles = await rbacService.getUserRoles(user.id);
      
      res.json({
        success: true,
        data: {
          user: user.toJSON(),
          roles: roles.map(role => role.toJSON())
        }
      });
    } catch (error) {
      logger.error(`Error in getUserById controller for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Update user (admin/HR manager)
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const user = await authService.updateUser(parseInt(id), req.body);
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: user.toJSON()
      });
    } catch (error) {
      logger.error(`Error in updateUser controller for ID ${req.params.id}:`, error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Delete user (admin only)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const result = await authService.deleteUser(parseInt(id));
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error(`Error in deleteUser controller for ID ${req.params.id}:`, error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Assign role to user (admin/HR manager)
  async assignRole(req, res) {
    try {
      const { userId, roleId } = req.body;
      const result = await rbacService.assignRoleToUser(parseInt(userId), parseInt(roleId));
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error in assignRole controller:', error);
      
      if (error.message.includes('already has') || error.message.includes('not found')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  // Remove role from user (admin/HR manager)
  async removeRole(req, res) {
    try {
      const { userId, roleId } = req.body;
      const result = await rbacService.removeRoleFromUser(parseInt(userId), parseInt(roleId));
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error in removeRole controller:', error);
      
      if (error.message.includes('does not have') || error.message.includes('not found')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = new AuthController();
