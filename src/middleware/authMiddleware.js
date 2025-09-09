const authService = require('../services/prismaAuthService');
const rbacService = require('../services/prismaRbacService');
const { logger } = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.substring(7);
    
    const decoded = authService.verifyToken(token);
    
    const user = await authService.getUserById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

const authorize = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasPermission = await rbacService.userHasPermission(
        req.user.id,
        resource,
        action
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

const requireRole = (roleName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasRole = await rbacService.userHasRole(req.user.id, roleName);

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: `Role '${roleName}' required`
        });
      }

      next();
    } catch (error) {
      logger.error('Role authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Role check failed'
      });
    }
  };
};

const requireAnyRole = (roleNames) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRoles = await rbacService.getUserRoles(req.user.id);
      const userRoleNames = userRoles.map(role => role.name);
      
      const hasAnyRole = roleNames.some(roleName => userRoleNames.includes(roleName));

      if (!hasAnyRole) {
        return res.status(403).json({
          success: false,
          message: `One of these roles required: ${roleNames.join(', ')}`
        });
      }

      next();
    } catch (error) {
      logger.error('Multiple roles authorization error:', error);
      return res.status(500).json({
        success: false,
        message: 'Role check failed'
      });
    }
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyToken(token);
    const user = await authService.getUserById(decoded.id);
    
    req.user = user && user.isActive ? user : null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

const requireAdmin = requireRole('ADMIN');

const requireHRManager = requireAnyRole(['ADMIN', 'HR_MANAGER']);

const requireManager = requireAnyRole(['ADMIN', 'HR_MANAGER', 'MANAGER']);

const requireEmployee = requireAnyRole(['ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE']);

const canManageUsers = authorize('users', 'MANAGE');
const canReadUsers = authorize('users', 'READ');
const canCreateUsers = authorize('users', 'CREATE');
const canUpdateUsers = authorize('users', 'UPDATE');
const canDeleteUsers = authorize('users', 'DELETE');

const canManageEmployees = authorize('employees', 'MANAGE');
const canReadEmployees = authorize('employees', 'READ');
const canCreateEmployees = authorize('employees', 'CREATE');
const canUpdateEmployees = authorize('employees', 'UPDATE');
const canDeleteEmployees = authorize('employees', 'DELETE');

const canManageRoles = authorize('roles', 'MANAGE');
const canReadRoles = authorize('roles', 'READ');
const canCreateRoles = authorize('roles', 'CREATE');
const canUpdateRoles = authorize('roles', 'UPDATE');
const canDeleteRoles = authorize('roles', 'DELETE');

const canManagePermissions = authorize('permissions', 'MANAGE');
const canReadPermissions = authorize('permissions', 'READ');

const canViewReports = authorize('reports', 'READ');
const canManageReports = authorize('reports', 'MANAGE');

const canManageSystem = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasPermission = await rbacService.userHasPermission(
      req.user.id,
      'system',
      'MANAGE'
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions - SYSTEM_MANAGE required'
      });
    }

    next();
  } catch (error) {
    logger.error('System authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

const canManageFiles = authorize('system', 'MANAGE');

module.exports = {
  authenticate,
  authorize,
  requireRole,
  requireAnyRole,
  optionalAuth,
  requireAdmin,
  requireHRManager,
  requireManager,
  requireEmployee,
  canManageUsers,
  canReadUsers,
  canCreateUsers,
  canUpdateUsers,
  canDeleteUsers,
  canManageEmployees,
  canReadEmployees,
  canCreateEmployees,
  canUpdateEmployees,
  canDeleteEmployees,
  canManageRoles,
  canReadRoles,
  canCreateRoles,
  canUpdateRoles,
  canDeleteRoles,
  canManagePermissions,
  canReadPermissions,
  canViewReports,
  canManageReports,
  canManageSystem,
  canManageFiles
};
