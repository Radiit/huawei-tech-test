const authService = require('../services/prismaAuthService');
const rbacService = require('../services/prismaRbacService');
const { logger } = require('../utils/logger');

class AuthController {
  async me(req, res) {
    try {
      const user = req.user;
      return res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      logger.error('Error in me controller:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
  async register(req, res) {
    try {
      const user = await authService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
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

  async getProfile(req, res) {
    try {
      const user = req.user;
      const roles = await rbacService.getUserRoles(user.id);
      const permissions = await rbacService.getUserPermissions(user.id);
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          },
          roles: roles.map(role => ({
            id: role.id,
            name: role.name,
            description: role.description,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt
          })),
          permissions: permissions.map(permission => ({
            id: permission.id,
            name: permission.name,
            description: permission.description,
            resource: permission.resource,
            action: permission.action,
            createdAt: permission.createdAt,
            updatedAt: permission.updatedAt
          }))
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

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await authService.updateUser(userId, req.body);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
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

  async logout(req, res) {
    try {
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
        data: users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
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
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          },
          roles: roles.map(role => ({
            id: role.id,
            name: role.name,
            description: role.description,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt
          }))
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

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const user = await authService.updateUser(parseInt(id), req.body);
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
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
