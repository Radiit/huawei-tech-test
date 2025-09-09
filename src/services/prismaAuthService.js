const prisma = require('../lib/prisma');
const config = require('../config/config');
const { logger } = require('../utils/logger');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class PrismaAuthService {
  constructor() {
    this.jwtSecret = config.jwt.secret;
    this.jwtExpiresIn = config.jwt.expiresIn;
  }

  async register(userData) {
    try {
      const existingUser = await prisma.client.user.findUnique({
        where: { email: userData.email }
      });
      
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const passwordHash = await bcrypt.hash(userData.password, 12);

      const user = await prisma.client.user.create({
        data: {
          email: userData.email,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          isActive: true
        }
      });

      logger.info(`User registered with ID: ${user.id}`);
      return user;
    } catch (error) {
      logger.error('Error registering user:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      // Use raw SQL to avoid prepared statement conflicts
      const users = await prisma.client.$queryRaw`
        SELECT id, email, password_hash, first_name, last_name, is_active, last_login, created_at, updated_at
        FROM users 
        WHERE email = ${email}
        LIMIT 1
      `;
      
      const user = users[0];
      
      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login using raw SQL
      await prisma.client.$queryRaw`
        UPDATE users 
        SET last_login = NOW() 
        WHERE id = ${user.id}
      `;

      const token = this.generateToken(user);

      logger.info(`User logged in: ${user.email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isActive: user.is_active,
          lastLogin: new Date(),
          createdAt: user.created_at,
          updatedAt: user.updated_at
        },
        token
      };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      const user = await prisma.client.user.findUnique({
        where: { id: parseInt(id) }
      });
      
      return user;
    } catch (error) {
      logger.error(`Error getting user by ID ${id}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const user = await prisma.client.user.findUnique({
        where: { email }
      });
      
      return user;
    } catch (error) {
      logger.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  }

  async updateUser(id, userData) {
    try {
      const existingUser = await prisma.client.user.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!existingUser) {
        throw new Error('User not found');
      }

      const updateData = {};
      if (userData.firstName) updateData.firstName = userData.firstName;
      if (userData.lastName) updateData.lastName = userData.lastName;
      if (userData.isActive !== undefined) updateData.isActive = userData.isActive;

      const user = await prisma.client.user.update({
        where: { id: parseInt(id) },
        data: updateData
      });

      logger.info(`User updated with ID: ${id}`);
      return user;
    } catch (error) {
      logger.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  async updatePassword(id, currentPassword, newPassword) {
    try {
      const user = await prisma.client.user.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!user) {
        throw new Error('User not found');
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await prisma.client.user.update({
        where: { id: parseInt(id) },
        data: { passwordHash: newPasswordHash }
      });

      logger.info(`Password updated for user ID: ${id}`);
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      logger.error(`Error updating password for user ${id}:`, error);
      throw error;
    }
  }

  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async getAllUsers(filters = {}, pagination = {}) {
    try {
      const where = {};
      
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }
      
      if (filters.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      const users = await prisma.client.user.findMany({
        where,
        skip: pagination.offset || 0,
        take: pagination.limit || 10,
        orderBy: {
          [pagination.sortBy || 'createdAt']: pagination.sortOrder || 'desc'
        }
      });

      return users;
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  async deleteUser(id) {
    try {
      const user = await prisma.client.user.findUnique({
        where: { id: parseInt(id) }
      });
      
      if (!user) {
        throw new Error('User not found');
      }

      await prisma.client.user.delete({
        where: { id: parseInt(id) }
      });
      
      logger.info(`User deleted with ID: ${id}`);
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new PrismaAuthService();

