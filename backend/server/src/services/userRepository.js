const User = require('../models/User');
const { getDbStatus } = require('../config/db');
const bcrypt = require('bcryptjs');

// In-Memory store for development fallback mode
const inMemoryUsers = new Map();
let nextId = 1;

class UserRepository {
  async findByEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      return await User.findOne({ email: normalizedEmail }).select('+password');
    }

    // In-memory fallback
    const user = Array.from(inMemoryUsers.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (!user) return null;

    // Return object with helper method for consistency
    return {
      ...user,
      _id: user._id,
      comparePassword: async (enteredPassword) => {
        return await bcrypt.compare(enteredPassword, user.password);
      }
    };
  }

  async findById(id) {
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      return await User.findById(id);
    }

    const user = inMemoryUsers.get(String(id));
    if (!user) return null;
    const { password, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      _id: user._id
    };
  }

  async create({ name, email, password, role = 'operator' }) {
    const normalizedEmail = email.toLowerCase().trim();
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      const user = await User.create({
        name,
        email: normalizedEmail,
        password,
        role
      });
      return user;
    }

    // In-memory fallback
    const existing = Array.from(inMemoryUsers.values()).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      const err = new Error('User already exists');
      err.code = 11000;
      throw err;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = String(nextId++);

    const userDoc = {
      _id: userId,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    inMemoryUsers.set(userId, userDoc);

    return {
      _id: userId,
      name,
      email: normalizedEmail,
      role,
      lastLogin: null,
      createdAt: userDoc.createdAt,
      updatedAt: userDoc.updatedAt,
      comparePassword: async (enteredPassword) => {
        return await bcrypt.compare(enteredPassword, hashedPassword);
      }
    };
  }

  async updateLastLogin(id) {
    const dbStatus = getDbStatus();

    if (dbStatus.isConnected) {
      await User.findByIdAndUpdate(id, { lastLogin: new Date() });
      return;
    }

    const user = inMemoryUsers.get(String(id));
    if (user) {
      user.lastLogin = new Date();
      inMemoryUsers.set(String(id), user);
    }
  }

  // Clear in-memory store for testing purposes
  clearInMemoryStore() {
    inMemoryUsers.clear();
    nextId = 1;
  }
}

module.exports = new UserRepository();
