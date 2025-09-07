const database = require('../config/database');
const config = require('../config/config');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const jwt = require('jsonwebtoken');

class AuthService {
  constructor() {
    this.jwtSecret = config.jwt.secret;
    this.jwtExpiresIn = config.jwt.expiresIn;
  }

  // Register new user
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await User.hashPassword(userData.password);

      // Create user
      const user = new User({
        email: userData.email,
        password_hash: passwordHash,
        first_name: userData.firstName,
        last_name: userData.lastName,
        is_active: true
      });

      const sql = `
        INSERT INTO users (email, password_hash, first_name, last_name, is_active)
        VALUES (?, ?, ?, ?, ?)
      `;

      const result = await database.run(sql, [
        user.email,
        user.passwordHash,
        user.firstName,
        user.lastName,
        user.isActive
      ]);

      // Get created user
      const createdUser = await this.getUserById(result.id);
      logger.info(`User registered with ID: ${result.id}`);

      return createdUser;
    } catch (error) {
      logger.error('Error registering user:', error);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await this.updateLastLogin(user.id);

      // Generate JWT token
      const token = this.generateToken(user);

      logger.info(`User logged in: ${user.email}`);

      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(id) {
    try {
      const sql = 'SELECT * FROM users WHERE id = ?';
      const rows = await database.query(sql, [id]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return User.fromDBRow(rows[0]);
    } catch (error) {
      logger.error(`Error getting user by ID ${id}:`, error);
      throw error;
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      const sql = 'SELECT * FROM users WHERE email = ?';
      const rows = await database.query(sql, [email]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return User.fromDBRow(rows[0]);
    } catch (error) {
      logger.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  }

  // Update user
  async updateUser(id, userData) {
    try {
      const existingUser = await this.getUserById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      const updateFields = [];
      const values = [];

      if (userData.firstName) {
        updateFields.push('first_name = ?');
        values.push(userData.firstName);
      }

      if (userData.lastName) {
        updateFields.push('last_name = ?');
        values.push(userData.lastName);
      }

      if (userData.isActive !== undefined) {
        updateFields.push('is_active = ?');
        values.push(userData.isActive);
      }

      if (updateFields.length === 0) {
        return existingUser;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      await database.run(sql, values);

      const updatedUser = await this.getUserById(id);
      logger.info(`User updated with ID: ${id}`);

      return updatedUser;
    } catch (error) {
      logger.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  // Update password
  async updatePassword(id, currentPassword, newPassword) {
    try {
      const user = await this.getUserById(id);
      if (!user) {
        throw new Error('User not found');
      }

      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      const newPasswordHash = await User.hashPassword(newPassword);

      const sql = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      await database.run(sql, [newPasswordHash, id]);

      logger.info(`Password updated for user ID: ${id}`);
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      logger.error(`Error updating password for user ${id}:`, error);
      throw error;
    }
  }

  // Update last login
  async updateLastLogin(id) {
    try {
      const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
      await database.run(sql, [id]);
    } catch (error) {
      logger.error(`Error updating last login for user ${id}:`, error);
      throw error;
    }
  }

  // Generate JWT token
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Get all users with pagination
  async getAllUsers(filters = {}, pagination = {}) {
    try {
      let sql = 'SELECT * FROM users WHERE 1=1';
      const params = [];

      // Apply filters
      if (filters.isActive !== undefined) {
        sql += ' AND is_active = ?';
        params.push(filters.isActive);
      }

      if (filters.search) {
        sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Apply sorting
      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'DESC';
      sql += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Apply pagination
      if (pagination.limit) {
        sql += ' LIMIT ?';
        params.push(pagination.limit);
        
        if (pagination.offset) {
          sql += ' OFFSET ?';
          params.push(pagination.offset);
        }
      }

      const rows = await database.query(sql, params);
      return rows.map(row => User.fromDBRow(row));
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  // Delete user
  async deleteUser(id) {
    try {
      const sql = 'DELETE FROM users WHERE id = ?';
      const result = await database.run(sql, [id]);
      
      if (result.changes === 0) {
        throw new Error('User not found');
      }
      
      logger.info(`User deleted with ID: ${id}`);
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      logger.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new AuthService();
