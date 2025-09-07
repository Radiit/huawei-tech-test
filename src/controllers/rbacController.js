const rbacService = require('../services/prismaRbacService');
const { logger } = require('../utils/logger');

class RBACController {
  async getAllRoles(req, res) {
    try {
      const roles = await rbacService.getAllRoles();
      
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      logger.error('Error in getAllRoles controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async getRoleById(req, res) {
    try {
      const { id } = req.params;
      const role = await rbacService.getRoleById(parseInt(id));
      
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      
      const permissions = await rbacService.getRolePermissions(role.id);
      
      res.json({
        success: true,
        data: {
          role: role,
          permissions: permissions
        }
      });
    } catch (error) {
      logger.error(`Error in getRoleById controller for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async createRole(req, res) {
    try {
      const role = await rbacService.createRole(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: role
      });
    } catch (error) {
      logger.error('Error in createRole controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const role = await rbacService.updateRole(parseInt(id), req.body);
      
      res.json({
        success: true,
        message: 'Role updated successfully',
        data: role
      });
    } catch (error) {
      logger.error(`Error in updateRole controller for ID ${req.params.id}:`, error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async deleteRole(req, res) {
    try {
      const { id } = req.params;
      const result = await rbacService.deleteRole(parseInt(id));
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error(`Error in deleteRole controller for ID ${req.params.id}:`, error);
      
      if (error.message === 'Role not found') {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async getAllPermissions(req, res) {
    try {
      const permissions = await rbacService.getAllPermissions();
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error('Error in getAllPermissions controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async getPermissionById(req, res) {
    try {
      const { id } = req.params;
      const permission = await rbacService.getPermissionById(parseInt(id));
      
      if (!permission) {
        return res.status(404).json({
          success: false,
          message: 'Permission not found'
        });
      }
      
      res.json({
        success: true,
        data: permission.toJSON()
      });
    } catch (error) {
      logger.error(`Error in getPermissionById controller for ID ${req.params.id}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async createPermission(req, res) {
    try {
      const permission = await rbacService.createPermission(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Permission created successfully',
        data: permission.toJSON()
      });
    } catch (error) {
      logger.error('Error in createPermission controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async assignPermissionToRole(req, res) {
    try {
      const { roleId, permissionId } = req.body;
      const result = await rbacService.assignPermissionToRole(parseInt(roleId), parseInt(permissionId));
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error in assignPermissionToRole controller:', error);
      
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

  async removePermissionFromRole(req, res) {
    try {
      const { roleId, permissionId } = req.body;
      const result = await rbacService.removePermissionFromRole(parseInt(roleId), parseInt(permissionId));
      
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error in removePermissionFromRole controller:', error);
      
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

  async getUsersByRole(req, res) {
    try {
      const { roleName } = req.params;
      const users = await rbacService.getUsersByRole(roleName);
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      logger.error(`Error in getUsersByRole controller for role ${req.params.roleName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async getRolePermissions(req, res) {
    try {
      const { roleId } = req.params;
      const permissions = await rbacService.getRolePermissions(parseInt(roleId));
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error(`Error in getRolePermissions controller for role ${req.params.roleId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async getUserPermissions(req, res) {
    try {
      const { userId } = req.params;
      const permissions = await rbacService.getUserPermissions(parseInt(userId));
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error(`Error in getUserPermissions controller for user ${req.params.userId}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }

  async checkUserPermission(req, res) {
    try {
      const { userId } = req.params;
      const { resource, action } = req.query;
      
      if (!resource || !action) {
        return res.status(400).json({
          success: false,
          message: 'Resource and action parameters are required'
        });
      }
      
      const hasPermission = await rbacService.userHasPermission(parseInt(userId), resource, action);
      
      res.json({
        success: true,
        data: {
          userId: parseInt(userId),
          resource,
          action,
          hasPermission
        }
      });
    } catch (error) {
      logger.error('Error in checkUserPermission controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    }
  }
}

module.exports = new RBACController();
