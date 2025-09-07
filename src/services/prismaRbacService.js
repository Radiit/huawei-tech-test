const prisma = require('../lib/prisma');
const { logger } = require('../utils/logger');

class PrismaRBACService {
  // Get all roles
  async getAllRoles() {
    try {
      const roles = await prisma.client.role.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      return roles;
    } catch (error) {
      logger.error('Error getting all roles:', error);
      throw error;
    }
  }

  // Get role by ID
  async getRoleById(id) {
    try {
      const role = await prisma.client.role.findUnique({
        where: { id: parseInt(id) }
      });
      
      return role;
    } catch (error) {
      logger.error(`Error getting role by ID ${id}:`, error);
      throw error;
    }
  }

  // Create role
  async createRole(roleData) {
    try {
      const role = await prisma.client.role.create({
        data: roleData
      });
      
      logger.info(`Role created with ID: ${role.id}`);
      return role;
    } catch (error) {
      logger.error('Error creating role:', error);
      throw error;
    }
  }

  // Update role
  async updateRole(id, roleData) {
    try {
      const existingRole = await prisma.client.role.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!existingRole) {
        throw new Error('Role not found');
      }

      const role = await prisma.client.role.update({
        where: { id: parseInt(id) },
        data: roleData
      });
      
      logger.info(`Role updated with ID: ${id}`);
      return role;
    } catch (error) {
      logger.error(`Error updating role ${id}:`, error);
      throw error;
    }
  }

  // Delete role
  async deleteRole(id) {
    try {
      const existingRole = await prisma.client.role.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!existingRole) {
        throw new Error('Role not found');
      }

      await prisma.client.role.delete({
        where: { id: parseInt(id) }
      });
      
      logger.info(`Role deleted with ID: ${id}`);
      return { success: true, message: 'Role deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting role ${id}:`, error);
      throw error;
    }
  }

  // Get all permissions
  async getAllPermissions() {
    try {
      const permissions = await prisma.client.permission.findMany({
        where: { isActive: true },
        orderBy: [{ resource: 'asc' }, { action: 'asc' }]
      });
      return permissions;
    } catch (error) {
      logger.error('Error getting all permissions:', error);
      throw error;
    }
  }

  // Get permission by ID
  async getPermissionById(id) {
    try {
      const permission = await prisma.client.permission.findUnique({
        where: { id: parseInt(id) }
      });
      
      return permission;
    } catch (error) {
      logger.error(`Error getting permission by ID ${id}:`, error);
      throw error;
    }
  }

  // Create permission
  async createPermission(permissionData) {
    try {
      const permission = await prisma.client.permission.create({
        data: permissionData
      });
      
      logger.info(`Permission created with ID: ${permission.id}`);
      return permission;
    } catch (error) {
      logger.error('Error creating permission:', error);
      throw error;
    }
  }

  // Assign role to user
  async assignRoleToUser(userId, roleId) {
    try {
      const userRole = await prisma.client.userRole.create({
        data: {
          userId: parseInt(userId),
          roleId: parseInt(roleId)
        }
      });
      
      logger.info(`Role ${roleId} assigned to user ${userId}`);
      return { success: true, message: 'Role assigned successfully' };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('User already has this role');
      }
      logger.error(`Error assigning role to user:`, error);
      throw error;
    }
  }

  // Remove role from user
  async removeRoleFromUser(userId, roleId) {
    try {
      const result = await prisma.client.userRole.deleteMany({
        where: {
          userId: parseInt(userId),
          roleId: parseInt(roleId)
        }
      });
      
      if (result.count === 0) {
        throw new Error('User does not have this role');
      }
      
      logger.info(`Role ${roleId} removed from user ${userId}`);
      return { success: true, message: 'Role removed successfully' };
    } catch (error) {
      logger.error(`Error removing role from user:`, error);
      throw error;
    }
  }

  // Assign permission to role
  async assignPermissionToRole(roleId, permissionId) {
    try {
      const rolePermission = await prisma.client.rolePermission.create({
        data: {
          roleId: parseInt(roleId),
          permissionId: parseInt(permissionId)
        }
      });
      
      logger.info(`Permission ${permissionId} assigned to role ${roleId}`);
      return { success: true, message: 'Permission assigned successfully' };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('Role already has this permission');
      }
      logger.error(`Error assigning permission to role:`, error);
      throw error;
    }
  }

  // Remove permission from role
  async removePermissionFromRole(roleId, permissionId) {
    try {
      const result = await prisma.client.rolePermission.deleteMany({
        where: {
          roleId: parseInt(roleId),
          permissionId: parseInt(permissionId)
        }
      });
      
      if (result.count === 0) {
        throw new Error('Role does not have this permission');
      }
      
      logger.info(`Permission ${permissionId} removed from role ${roleId}`);
      return { success: true, message: 'Permission removed successfully' };
    } catch (error) {
      logger.error(`Error removing permission from role:`, error);
      throw error;
    }
  }

  // Get user roles
  async getUserRoles(userId) {
    try {
      const userRoles = await prisma.client.userRole.findMany({
        where: { userId: parseInt(userId) },
        include: {
          role: true
        }
      });
      
      return userRoles.map(ur => ur.role);
    } catch (error) {
      logger.error(`Error getting user roles for user ${userId}:`, error);
      throw error;
    }
  }

  // Get role permissions
  async getRolePermissions(roleId) {
    try {
      const rolePermissions = await prisma.client.rolePermission.findMany({
        where: { roleId: parseInt(roleId) },
        include: {
          permission: true
        }
      });
      
      return rolePermissions.map(rp => rp.permission);
    } catch (error) {
      logger.error(`Error getting role permissions for role ${roleId}:`, error);
      throw error;
    }
  }

  // Get user permissions (all permissions from all user roles)
  async getUserPermissions(userId) {
    try {
      const userRoles = await prisma.client.userRole.findMany({
        where: { userId: parseInt(userId) },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      });

      const permissions = [];
      userRoles.forEach(ur => {
        ur.role.rolePermissions.forEach(rp => {
          if (!permissions.find(p => p.id === rp.permission.id)) {
            permissions.push(rp.permission);
          }
        });
      });

      return permissions;
    } catch (error) {
      logger.error(`Error getting user permissions for user ${userId}:`, error);
      throw error;
    }
  }

  // Check if user has permission
  async userHasPermission(userId, resource, action) {
    try {
      const count = await prisma.client.userRole.count({
        where: {
          userId: parseInt(userId),
          role: {
            rolePermissions: {
              some: {
                permission: {
                  resource,
                  action,
                  isActive: true
                }
              }
            }
          }
        }
      });
      
      return count > 0;
    } catch (error) {
      logger.error(`Error checking user permission:`, error);
      throw error;
    }
  }

  // Check if user has role
  async userHasRole(userId, roleName) {
    try {
      const count = await prisma.client.userRole.count({
        where: {
          userId: parseInt(userId),
          role: {
            name: roleName,
            isActive: true
          }
        }
      });
      
      return count > 0;
    } catch (error) {
      logger.error(`Error checking user role:`, error);
      throw error;
    }
  }

  // Get users by role
  async getUsersByRole(roleName) {
    try {
      const userRoles = await prisma.client.userRole.findMany({
        where: {
          role: {
            name: roleName,
            isActive: true
          }
        },
        include: {
          user: true
        }
      });
      
      return userRoles.map(ur => ur.user);
    } catch (error) {
      logger.error(`Error getting users by role ${roleName}:`, error);
      throw error;
    }
  }
}

module.exports = new PrismaRBACService();

