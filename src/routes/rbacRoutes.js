const express = require('express');
const rbacController = require('../controllers/rbacController');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const { authenticate, requireAdmin, canManageRoles, canReadRoles, canCreateRoles, canUpdateRoles, canDeleteRoles, canManagePermissions, canReadPermissions, canReadUsers } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/roles',
  canReadRoles,
  rbacController.getAllRoles
);

router.get('/roles/:id',
  canReadRoles,
  rbacController.getRoleById
);

router.post('/roles',
  canCreateRoles,
  Role.getValidationRules(),
  Role.validate,
  rbacController.createRole
);

router.put('/roles/:id',
  canUpdateRoles,
  Role.getValidationRules(),
  Role.validate,
  rbacController.updateRole
);

router.delete('/roles/:id',
  canDeleteRoles,
  rbacController.deleteRole
);

router.get('/roles/:roleId/permissions',
  canReadRoles,
  rbacController.getRolePermissions
);

router.get('/roles/name/:roleName/users',
  canReadRoles,
  rbacController.getUsersByRole
);

router.get('/permissions',
  canReadPermissions,
  rbacController.getAllPermissions
);

router.get('/permissions/:id',
  canReadPermissions,
  rbacController.getPermissionById
);

router.post('/permissions',
  canManagePermissions,
  Permission.getValidationRules(),
  Permission.validate,
  rbacController.createPermission
);

router.post('/assign-permission',
  canManageRoles,
  rbacController.assignPermissionToRole
);

router.post('/remove-permission',
  canManageRoles,
  rbacController.removePermissionFromRole
);

router.get('/users/:userId/permissions',
  canReadUsers,
  rbacController.getUserPermissions
);

router.get('/users/:userId/check-permission',
  canReadUsers,
  rbacController.checkUserPermission
);

module.exports = router;
