const database = require('../config/database');
const authService = require('../services/authService');
const rbacService = require('../services/rbacService');
const { logger } = require('../utils/logger');

class Seeder {
  constructor() {
    this.isSeeded = false;
  }

  // Check if data already exists
  async checkIfSeeded() {
    try {
      const userCount = await database.query('SELECT COUNT(*) as count FROM users');
      const roleCount = await database.query('SELECT COUNT(*) as count FROM roles');
      const permissionCount = await database.query('SELECT COUNT(*) as count FROM permissions');
      
      return userCount[0].count > 0 && roleCount[0].count > 0 && permissionCount[0].count > 0;
    } catch (error) {
      logger.error('Error checking if seeded:', error);
      return false;
    }
  }

  // Seed roles
  async seedRoles() {
    try {
      const roles = [
        {
          name: 'ADMIN',
          description: 'System administrator with full access to all features and data'
        },
        {
          name: 'HR_MANAGER',
          description: 'Human Resources manager with access to employee management and user administration'
        },
        {
          name: 'MANAGER',
          description: 'Department manager with access to team management and reporting'
        },
        {
          name: 'EMPLOYEE',
          description: 'Regular employee with limited access to personal data and basic features'
        },
        {
          name: 'GUEST',
          description: 'Guest user with read-only access to public information'
        }
      ];

      for (const roleData of roles) {
        try {
          await rbacService.createRole(roleData);
          logger.info(`Role created: ${roleData.name}`);
        } catch (error) {
          if (error.message.includes('UNIQUE constraint failed')) {
            logger.info(`Role already exists: ${roleData.name}`);
          } else {
            throw error;
          }
        }
      }

      logger.info('Roles seeded successfully');
    } catch (error) {
      logger.error('Error seeding roles:', error);
      throw error;
    }
  }

  // Seed permissions
  async seedPermissions() {
    try {
      const permissions = [
        // User management permissions
        { name: 'USERS_MANAGE', resource: 'users', action: 'MANAGE', description: 'Full access to user management' },
        { name: 'USERS_READ', resource: 'users', action: 'READ', description: 'Read user information' },
        { name: 'USERS_CREATE', resource: 'users', action: 'CREATE', description: 'Create new users' },
        { name: 'USERS_UPDATE', resource: 'users', action: 'UPDATE', description: 'Update user information' },
        { name: 'USERS_DELETE', resource: 'users', action: 'DELETE', description: 'Delete users' },

        // Employee management permissions
        { name: 'EMPLOYEES_MANAGE', resource: 'employees', action: 'MANAGE', description: 'Full access to employee management' },
        { name: 'EMPLOYEES_READ', resource: 'employees', action: 'READ', description: 'Read employee information' },
        { name: 'EMPLOYEES_CREATE', resource: 'employees', action: 'CREATE', description: 'Create new employees' },
        { name: 'EMPLOYEES_UPDATE', resource: 'employees', action: 'UPDATE', description: 'Update employee information' },
        { name: 'EMPLOYEES_DELETE', resource: 'employees', action: 'DELETE', description: 'Delete employees' },

        // Role management permissions
        { name: 'ROLES_MANAGE', resource: 'roles', action: 'MANAGE', description: 'Full access to role management' },
        { name: 'ROLES_READ', resource: 'roles', action: 'READ', description: 'Read role information' },
        { name: 'ROLES_CREATE', resource: 'roles', action: 'CREATE', description: 'Create new roles' },
        { name: 'ROLES_UPDATE', resource: 'roles', action: 'UPDATE', description: 'Update role information' },
        { name: 'ROLES_DELETE', resource: 'roles', action: 'DELETE', description: 'Delete roles' },

        // Permission management permissions
        { name: 'PERMISSIONS_MANAGE', resource: 'permissions', action: 'MANAGE', description: 'Full access to permission management' },
        { name: 'PERMISSIONS_READ', resource: 'permissions', action: 'READ', description: 'Read permission information' },

        // Report permissions
        { name: 'REPORTS_MANAGE', resource: 'reports', action: 'MANAGE', description: 'Full access to reports and analytics' },
        { name: 'REPORTS_READ', resource: 'reports', action: 'READ', description: 'Read reports and analytics' },

        // System management permissions
        { name: 'SYSTEM_MANAGE', resource: 'system', action: 'MANAGE', description: 'Full access to system administration' }
      ];

      for (const permissionData of permissions) {
        try {
          await rbacService.createPermission(permissionData);
          logger.info(`Permission created: ${permissionData.name}`);
        } catch (error) {
          if (error.message.includes('UNIQUE constraint failed')) {
            logger.info(`Permission already exists: ${permissionData.name}`);
          } else {
            throw error;
          }
        }
      }

      logger.info('Permissions seeded successfully');
    } catch (error) {
      logger.error('Error seeding permissions:', error);
      throw error;
    }
  }

  // Assign permissions to roles
  async assignPermissionsToRoles() {
    try {
      // Get all roles and permissions
      const roles = await rbacService.getAllRoles();
      const permissions = await rbacService.getAllPermissions();

      const rolePermissionMap = {
        'ADMIN': permissions.map(p => p.name), // Admin gets all permissions
        'HR_MANAGER': [
          'USERS_MANAGE', 'USERS_READ', 'USERS_CREATE', 'USERS_UPDATE', 'USERS_DELETE',
          'EMPLOYEES_MANAGE', 'EMPLOYEES_READ', 'EMPLOYEES_CREATE', 'EMPLOYEES_UPDATE', 'EMPLOYEES_DELETE',
          'ROLES_READ', 'PERMISSIONS_READ', 'REPORTS_MANAGE', 'REPORTS_READ'
        ],
        'MANAGER': [
          'USERS_READ', 'EMPLOYEES_READ', 'EMPLOYEES_CREATE', 'EMPLOYEES_UPDATE',
          'ROLES_READ', 'REPORTS_READ'
        ],
        'EMPLOYEE': [
          'USERS_READ', 'EMPLOYEES_READ', 'REPORTS_READ'
        ],
        'GUEST': [
          'EMPLOYEES_READ'
        ]
      };

      for (const role of roles) {
        const permissionNames = rolePermissionMap[role.name] || [];
        
        for (const permissionName of permissionNames) {
          const permission = permissions.find(p => p.name === permissionName);
          if (permission) {
            try {
              await rbacService.assignPermissionToRole(role.id, permission.id);
              logger.info(`Permission ${permissionName} assigned to role ${role.name}`);
            } catch (error) {
              if (error.message.includes('already has')) {
                logger.info(`Permission ${permissionName} already assigned to role ${role.name}`);
              } else {
                throw error;
              }
            }
          }
        }
      }

      logger.info('Permissions assigned to roles successfully');
    } catch (error) {
      logger.error('Error assigning permissions to roles:', error);
      throw error;
    }
  }

  // Seed users
  async seedUsers() {
    try {
      const users = [
        {
          email: 'admin@huawei.com',
          password: 'Admin123!@#',
          firstName: 'System',
          lastName: 'Administrator'
        },
        {
          email: 'hr.manager@huawei.com',
          password: 'HR123!@#',
          firstName: 'Sarah',
          lastName: 'Johnson'
        },
        {
          email: 'manager@huawei.com',
          password: 'Manager123!@#',
          firstName: 'Michael',
          lastName: 'Chen'
        },
        {
          email: 'employee@huawei.com',
          password: 'Employee123!@#',
          firstName: 'John',
          lastName: 'Doe'
        },
        {
          email: 'guest@huawei.com',
          password: 'Guest123!@#',
          firstName: 'Guest',
          lastName: 'User'
        }
      ];

      for (const userData of users) {
        try {
          await authService.register(userData);
          logger.info(`User created: ${userData.email}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            logger.info(`User already exists: ${userData.email}`);
          } else {
            throw error;
          }
        }
      }

      logger.info('Users seeded successfully');
    } catch (error) {
      logger.error('Error seeding users:', error);
      throw error;
    }
  }

  // Assign roles to users
  async assignRolesToUsers() {
    try {
      const roles = await rbacService.getAllRoles();
      const users = await authService.getAllUsers();

      const userRoleMap = {
        'admin@huawei.com': 'ADMIN',
        'hr.manager@huawei.com': 'HR_MANAGER',
        'manager@huawei.com': 'MANAGER',
        'employee@huawei.com': 'EMPLOYEE',
        'guest@huawei.com': 'GUEST'
      };

      for (const user of users) {
        const roleName = userRoleMap[user.email];
        if (roleName) {
          const role = roles.find(r => r.name === roleName);
          if (role) {
            try {
              await rbacService.assignRoleToUser(user.id, role.id);
              logger.info(`Role ${roleName} assigned to user ${user.email}`);
            } catch (error) {
              if (error.message.includes('already has')) {
                logger.info(`User ${user.email} already has role ${roleName}`);
              } else {
                throw error;
              }
            }
          }
        }
      }

      logger.info('Roles assigned to users successfully');
    } catch (error) {
      logger.error('Error assigning roles to users:', error);
      throw error;
    }
  }

  // Seed sample employees
  async seedEmployees() {
    try {
      const employees = [
        {
          name: 'Jacky',
          position: 'Solution Architect',
          join_date: '2018-07-25',
          release_date: '2022-07-25',
          experience_years: 8,
          salary: 120000
        },
        {
          name: 'John',
          position: 'Assistant Manager',
          join_date: '2016-02-02',
          release_date: '2021-02-02',
          experience_years: 12,
          salary: 95000
        },
        {
          name: 'Alano',
          position: 'Manager',
          join_date: '2010-11-09',
          release_date: null,
          experience_years: 14,
          salary: 110000
        },
        {
          name: 'Aaron',
          position: 'Engineer',
          join_date: '2021-08-16',
          release_date: '2022-08-16',
          experience_years: 1,
          salary: 65000
        },
        {
          name: 'Allen',
          position: 'Engineer',
          join_date: '2024-06-06',
          release_date: null,
          experience_years: 4,
          salary: 75000
        },
        {
          name: 'Peter',
          position: 'Team Leader',
          join_date: '2020-01-09',
          release_date: null,
          experience_years: 3,
          salary: 85000
        },
        {
          name: 'Albert',
          position: 'Engineer',
          join_date: '2024-01-24',
          release_date: null,
          experience_years: 2.5,
          salary: 70000
        }
      ];

      for (const employeeData of employees) {
        try {
          const sql = `
            INSERT OR IGNORE INTO employees (name, position, join_date, release_date, experience_years, salary)
            VALUES (?, ?, ?, ?, ?, ?)
          `;
          
          await database.run(sql, [
            employeeData.name,
            employeeData.position,
            employeeData.join_date,
            employeeData.release_date,
            employeeData.experience_years,
            employeeData.salary
          ]);
          
          logger.info(`Employee created/updated: ${employeeData.name}`);
        } catch (error) {
          logger.error(`Error creating employee ${employeeData.name}:`, error);
        }
      }

      logger.info('Employees seeded successfully');
    } catch (error) {
      logger.error('Error seeding employees:', error);
      throw error;
    }
  }

  // Main seed method
  async seed() {
    try {
      logger.info('Starting database seeding...');
      
      // Check if already seeded
      const alreadySeeded = await this.checkIfSeeded();
      if (alreadySeeded) {
        logger.info('Database already seeded, skipping...');
        return { success: true, message: 'Database already seeded' };
      }

      // Connect to database
      await database.connect();

      // Seed in order
      await this.seedRoles();
      await this.seedPermissions();
      await this.assignPermissionsToRoles();
      await this.seedUsers();
      await this.assignRolesToUsers();
      await this.seedEmployees();

      this.isSeeded = true;
      logger.info('Database seeding completed successfully');
      
      return {
        success: true,
        message: 'Database seeded successfully',
        data: {
          roles: 5,
          permissions: 17,
          users: 5,
          employees: 7
        }
      };
    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    }
  }

  // Reset database (for development)
  async reset() {
    try {
      logger.info('Resetting database...');
      
      await database.connect();
      
      // Delete all data in reverse order of dependencies
      await database.run('DELETE FROM user_roles');
      await database.run('DELETE FROM role_permissions');
      await database.run('DELETE FROM sessions');
      await database.run('DELETE FROM data_collections');
      await database.run('DELETE FROM employees');
      await database.run('DELETE FROM users');
      await database.run('DELETE FROM permissions');
      await database.run('DELETE FROM roles');
      
      logger.info('Database reset completed');
      
      // Re-seed
      await this.seed();
      
      return { success: true, message: 'Database reset and re-seeded successfully' };
    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const seeder = new Seeder();
  
  const command = process.argv[2];
  
  if (command === 'reset') {
    seeder.reset()
      .then(result => {
        console.log('Reset completed:', result);
        process.exit(0);
      })
      .catch(error => {
        console.error('Reset failed:', error);
        process.exit(1);
      });
  } else {
    seeder.seed()
      .then(result => {
        console.log('Seeding completed:', result);
        process.exit(0);
      })
      .catch(error => {
        console.error('Seeding failed:', error);
        process.exit(1);
      });
  }
}

module.exports = Seeder;

