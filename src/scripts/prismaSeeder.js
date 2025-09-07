const prisma = require('../lib/prisma');
const { logger } = require('../utils/logger');
const bcrypt = require('bcrypt');

class PrismaSeeder {
  constructor() {
    this.isSeeded = false;
  }

  // Check if data already exists
  async checkIfSeeded() {
    try {
      const userCount = await prisma.client.user.count();
      const roleCount = await prisma.client.role.count();
      const permissionCount = await prisma.client.permission.count();
      
      return userCount > 0 && roleCount > 0 && permissionCount > 0;
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
          await prisma.client.role.upsert({
            where: { name: roleData.name },
            update: roleData,
            create: roleData
          });
          logger.info(`Role created/updated: ${roleData.name}`);
        } catch (error) {
          logger.error(`Error creating role ${roleData.name}:`, error);
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
          await prisma.client.permission.upsert({
            where: { name: permissionData.name },
            update: permissionData,
            create: permissionData
          });
          logger.info(`Permission created/updated: ${permissionData.name}`);
        } catch (error) {
          logger.error(`Error creating permission ${permissionData.name}:`, error);
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
      const roles = await prisma.client.role.findMany();
      const permissions = await prisma.client.permission.findMany();

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
              await prisma.client.rolePermission.upsert({
                where: {
                  roleId_permissionId: {
                    roleId: role.id,
                    permissionId: permission.id
                  }
                },
                update: {},
                create: {
                  roleId: role.id,
                  permissionId: permission.id
                }
              });
              logger.info(`Permission ${permissionName} assigned to role ${role.name}`);
            } catch (error) {
              logger.error(`Error assigning permission ${permissionName} to role ${role.name}:`, error);
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
          const passwordHash = await bcrypt.hash(userData.password, 12);
          
          await prisma.client.user.upsert({
            where: { email: userData.email },
            update: {
              passwordHash,
              firstName: userData.firstName,
              lastName: userData.lastName
            },
            create: {
              email: userData.email,
              passwordHash,
              firstName: userData.firstName,
              lastName: userData.lastName
            }
          });
          logger.info(`User created/updated: ${userData.email}`);
        } catch (error) {
          logger.error(`Error creating user ${userData.email}:`, error);
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
      const roles = await prisma.client.role.findMany();
      const users = await prisma.client.user.findMany();

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
              await prisma.client.userRole.upsert({
                where: {
                  userId_roleId: {
                    userId: user.id,
                    roleId: role.id
                  }
                },
                update: {},
                create: {
                  userId: user.id,
                  roleId: role.id
                }
              });
              logger.info(`Role ${roleName} assigned to user ${user.email}`);
            } catch (error) {
              logger.error(`Error assigning role ${roleName} to user ${user.email}:`, error);
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
          joinDate: '2018-07-25',
          releaseDate: '2022-07-25',
          experienceYears: 8,
          salary: 120000
        },
        {
          name: 'John',
          position: 'Assistant Manager',
          joinDate: '2016-02-02',
          releaseDate: '2021-02-02',
          experienceYears: 12,
          salary: 95000
        },
        {
          name: 'Alano',
          position: 'Manager',
          joinDate: '2010-11-09',
          releaseDate: null,
          experienceYears: 14,
          salary: 110000
        },
        {
          name: 'Aaron',
          position: 'Engineer',
          joinDate: '2021-08-16',
          releaseDate: '2022-08-16',
          experienceYears: 1,
          salary: 65000
        },
        {
          name: 'Allen',
          position: 'Engineer',
          joinDate: '2024-06-06',
          releaseDate: null,
          experienceYears: 4,
          salary: 75000
        },
        {
          name: 'Peter',
          position: 'Team Leader',
          joinDate: '2020-01-09',
          releaseDate: null,
          experienceYears: 3,
          salary: 85000
        },
        {
          name: 'Albert',
          position: 'Engineer',
          joinDate: '2024-01-24',
          releaseDate: null,
          experienceYears: 2.5,
          salary: 70000
        }
      ];

      for (const employeeData of employees) {
        try {
          await prisma.client.employee.upsert({
            where: {
              name_position: {
                name: employeeData.name,
                position: employeeData.position
              }
            },
            update: employeeData,
            create: employeeData
          });
          logger.info(`Employee created/updated: ${employeeData.name}`);
        } catch (error) {
          // If unique constraint doesn't exist, try with just name
          try {
            await prisma.client.employee.create({
              data: employeeData
            });
            logger.info(`Employee created: ${employeeData.name}`);
          } catch (createError) {
            logger.error(`Error creating employee ${employeeData.name}:`, createError);
          }
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
      logger.info('Starting Prisma database seeding...');
      
      // Check if already seeded
      const alreadySeeded = await this.checkIfSeeded();
      if (alreadySeeded) {
        logger.info('Database already seeded, skipping...');
        return { success: true, message: 'Database already seeded' };
      }

      // Connect to database
      await prisma.connect();

      // Seed in order
      await this.seedRoles();
      await this.seedPermissions();
      await this.assignPermissionsToRoles();
      await this.seedUsers();
      await this.assignRolesToUsers();
      await this.seedEmployees();

      this.isSeeded = true;
      logger.info('Prisma database seeding completed successfully');
      
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
      logger.error('Prisma database seeding failed:', error);
      throw error;
    } finally {
      await prisma.disconnect();
    }
  }

  // Reset database (for development)
  async reset() {
    try {
      logger.info('Resetting Prisma database...');
      
      await prisma.connect();
      
      // Delete all data in reverse order of dependencies
      await prisma.client.userRole.deleteMany();
      await prisma.client.rolePermission.deleteMany();
      await prisma.client.session.deleteMany();
      await prisma.client.dataCollection.deleteMany();
      await prisma.client.employee.deleteMany();
      await prisma.client.user.deleteMany();
      await prisma.client.permission.deleteMany();
      await prisma.client.role.deleteMany();
      
      logger.info('Database reset completed');
      
      // Re-seed
      await this.seed();
      
      return { success: true, message: 'Database reset and re-seeded successfully' };
    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    } finally {
      await prisma.disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const seeder = new PrismaSeeder();
  
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

module.exports = PrismaSeeder;

