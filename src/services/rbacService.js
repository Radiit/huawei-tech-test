const database = require('../config/database');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const { logger } = require('../utils/logger');

class RBACService {
  // Get all roles
  async getAllRoles() {
    try {
      const sql = 'SELECT * FROM roles WHERE is_active = 1 ORDER BY name';
      const rows = await database.query(sql);
      return rows.map(row => Role.fromDBRow(row));
    } catch (error) {
      logger.error('Error getting all roles:', error);
      throw error;
    }
  }

  // Get role by ID
  async getRoleById(id) {
    try {
      const sql = 'SELECT * FROM roles WHERE id = ?';
      const rows = await database.query(sql, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return Role.fromDBRow(rows[0]);
    } catch (error) {
      logger.error(`Error getting role by ID ${id}:`, error);
      throw error;
    }
  }

  // Create role
  async createRole(roleData) {
    try {
      const role = new Role(roleData);
      const dbData = role.toDBFormat();
      
      const sql = `
        INSERT INTO roles (name, description, is_active)
        VALUES (?, ?, ?)
      `;
      
      const result = await database.run(sql, [
        dbData.name,
        dbData.description,
        dbData.is_active
      ]);
      
      const createdRole = await this.getRoleById(result.id);
      logger.info(`Role created with ID: ${result.id}`);
      
      return createdRole;
    } catch (error) {
      logger.error('Error creating role:', error);
      throw error;
    }
  }

  // Update role
  async updateRole(id, roleData) {
    try {
      const existingRole = await this.getRoleById(id);
      if (!existingRole) {
        throw new Error('Role not found');
      }

      const role = new Role({ ...existingRole, ...roleData });
      const dbData = role.toDBFormat();
      
      const sql = `
        UPDATE roles 
        SET name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      const result = await database.run(sql, [
        dbData.name,
        dbData.description,
        dbData.is_active,
        id
      ]);
      
      if (result.changes === 0) {
        throw new Error('Role not found or no changes made');
      }
      
      const updatedRole = await this.getRoleById(id);
      logger.info(`Role updated with ID: ${id}`);
      
      return updatedRole;
    } catch (error) {
      logger.error(`Error updating role ${id}:`, error);
      throw error;
    }
  }

  // Delete role
  async deleteRole(id) {
    try {
      const sql = 'DELETE FROM roles WHERE id = ?';
      const result = await database.run(sql, [id]);
      
      if (result.changes === 0) {
        throw new Error('Role not found');
      }
      
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
      const sql = 'SELECT * FROM permissions WHERE is_active = 1 ORDER BY resource, action';
      const rows = await database.query(sql);
      return rows.map(row => Permission.fromDBRow(row));
    } catch (error) {
      logger.error('Error getting all permissions:', error);
      throw error;
    }
  }

  // Get permission by ID
  async getPermissionById(id) {
    try {
      const sql = 'SELECT * FROM permissions WHERE id = ?';
      const rows = await database.query(sql, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return Permission.fromDBRow(rows[0]);
    } catch (error) {
      logger.error(`Error getting permission by ID ${id}:`, error);
      throw error;
    }
  }

  // Create permission
  async createPermission(permissionData) {
    try {
      const permission = new Permission(permissionData);
      const dbData = permission.toDBFormat();
      
      const sql = `
        INSERT INTO permissions (name, resource, action, description, is_active)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const result = await database.run(sql, [
        dbData.name,
        dbData.resource,
        dbData.action,
        dbData.description,
        dbData.is_active
      ]);
      
      const createdPermission = await this.getPermissionById(result.id);
      logger.info(`Permission created with ID: ${result.id}`);
      
      return createdPermission;
    } catch (error) {
      logger.error('Error creating permission:', error);
      throw error;
    }
  }

  // Assign role to user
  async assignRoleToUser(userId, roleId) {
    try {
      const sql = `
        INSERT OR IGNORE INTO user_roles (user_id, role_id)
        VALUES (?, ?)
      `;
      
      const result = await database.run(sql, [userId, roleId]);
      
      if (result.changes === 0) {
        throw new Error('User already has this role or role/user not found');
      }
      
      logger.info(`Role ${roleId} assigned to user ${userId}`);
      return { success: true, message: 'Role assigned successfully' };
    } catch (error) {
      logger.error(`Error assigning role to user:`, error);
      throw error;
    }
  }

  // Remove role from user
  async removeRoleFromUser(userId, roleId) {
    try {
      const sql = 'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?';
      const result = await database.run(sql, [userId, roleId]);
      
      if (result.changes === 0) {
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
      const sql = `
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
        VALUES (?, ?)
      `;
      
      const result = await database.run(sql, [roleId, permissionId]);
      
      if (result.changes === 0) {
        throw new Error('Role already has this permission or role/permission not found');
      }
      
      logger.info(`Permission ${permissionId} assigned to role ${roleId}`);
      return { success: true, message: 'Permission assigned successfully' };
    } catch (error) {
      logger.error(`Error assigning permission to role:`, error);
      throw error;
    }
  }

  // Remove permission from role
  async removePermissionFromRole(roleId, permissionId) {
    try {
      const sql = 'DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?';
      const result = await database.run(sql, [roleId, permissionId]);
      
      if (result.changes === 0) {
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
      const sql = `
        SELECT r.* FROM roles r
        INNER JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ? AND r.is_active = 1
        ORDER BY r.name
      `;
      
      const rows = await database.query(sql, [userId]);
      return rows.map(row => Role.fromDBRow(row));
    } catch (error) {
      logger.error(`Error getting user roles for user ${userId}:`, error);
      throw error;
    }
  }

  // Get role permissions
  async getRolePermissions(roleId) {
    try {
      const sql = `
        SELECT p.* FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ? AND p.is_active = 1
        ORDER BY p.resource, p.action
      `;
      
      const rows = await database.query(sql, [roleId]);
      return rows.map(row => Permission.fromDBRow(row));
    } catch (error) {
      logger.error(`Error getting role permissions for role ${roleId}:`, error);
      throw error;
    }
  }

  // Get user permissions (all permissions from all user roles)
  async getUserPermissions(userId) {
    try {
      const sql = `
        SELECT DISTINCT p.* FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ? AND p.is_active = 1
        ORDER BY p.resource, p.action
      `;
      
      const rows = await database.query(sql, [userId]);
      return rows.map(row => Permission.fromDBRow(row));
    } catch (error) {
      logger.error(`Error getting user permissions for user ${userId}:`, error);
      throw error;
    }
  }

  // Check if user has permission
  async userHasPermission(userId, resource, action) {
    try {
      const sql = `
        SELECT COUNT(*) as count FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ? AND p.resource = ? AND p.action = ? AND p.is_active = 1
      `;
      
      const rows = await database.query(sql, [userId, resource, action]);
      return rows[0].count > 0;
    } catch (error) {
      logger.error(`Error checking user permission:`, error);
      throw error;
    }
  }

  // Check if user has role
  async userHasRole(userId, roleName) {
    try {
      const sql = `
        SELECT COUNT(*) as count FROM roles r
        INNER JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = ? AND r.name = ? AND r.is_active = 1
      `;
      
      const rows = await database.query(sql, [userId, roleName]);
      return rows[0].count > 0;
    } catch (error) {
      logger.error(`Error checking user role:`, error);
      throw error;
    }
  }

  // Get users by role
  async getUsersByRole(roleName) {
    try {
      const sql = `
        SELECT u.* FROM users u
        INNER JOIN user_roles ur ON u.id = ur.user_id
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE r.name = ? AND u.is_active = 1
        ORDER BY u.first_name, u.last_name
      `;
      
      const rows = await database.query(sql, [roleName]);
      return rows.map(row => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        isActive: row.is_active,
        lastLogin: row.last_login,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      logger.error(`Error getting users by role ${roleName}:`, error);
      throw error;
    }
  }
}

module.exports = new RBACService();

