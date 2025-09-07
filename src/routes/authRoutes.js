const express = require('express');
const authController = require('../controllers/authController');
const User = require('../models/User');
const { authenticate, requireAdmin, requireHRManager, canManageUsers, canReadUsers, canCreateUsers, canUpdateUsers, canDeleteUsers } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register',
  User.getRegistrationValidationRules(),
  User.validate,
  authController.register
);

router.post('/login',
  User.getLoginValidationRules(),
  User.validate,
  authController.login
);

router.use(authenticate);

router.get('/profile', authController.getProfile);
router.put('/profile', 
  User.getUpdateValidationRules(),
  User.validate,
  authController.updateProfile
);
router.put('/change-password', authController.changePassword);
router.post('/logout', authController.logout);

router.get('/users',
  canReadUsers,
  authController.getAllUsers
);

router.get('/users/:id',
  canReadUsers,
  authController.getUserById
);

router.put('/users/:id',
  canUpdateUsers,
  User.getUpdateValidationRules(),
  User.validate,
  authController.updateUser
);

router.delete('/users/:id',
  canDeleteUsers,
  authController.deleteUser
);

router.post('/assign-role',
  canManageUsers,
  authController.assignRole
);

router.post('/remove-role',
  canManageUsers,
  authController.removeRole
);

module.exports = router;

