const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userRepository = require('./userRepository');

class AuthService {
  generateToken(user) {
    return jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }

  async registerUser({ name, email, password, role }) {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error('User already registered with this email');
      error.statusCode = 400;
      throw error;
    }

    const user = await userRepository.create({ name, email, password, role });
    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    };
  }

  async loginUser({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    await userRepository.updateLastLogin(user._id);
    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: new Date()
      }
    };
  }

  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };
  }
}

module.exports = new AuthService();
