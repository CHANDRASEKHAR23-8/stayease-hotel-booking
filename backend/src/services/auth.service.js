import bcrypt from 'bcryptjs';
import userRepository from '../repositories/user.repository.js';
import { generateTokens, verifyRefreshToken } from '../utils/token.js';
import { ApiError } from '../utils/apiResponse.js';

class AuthService {
  /**
   * Helper to strip password_hash from user object
   */
  sanitizeUser(user) {
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Register a new user (customer or owner)
   */
  async register({ name, email, password, phone, role = 'customer' }) {
    // Enforce role constraints: only customer or owner allowed
    if (role === 'admin' || !['customer', 'owner'].includes(role)) {
      throw ApiError.badRequest('Invalid registration role. Admin accounts cannot be self-registered.');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const newUser = await userRepository.create({
      name,
      email,
      password_hash,
      phone,
      role,
      status: 'active'
    });

    const tokens = generateTokens(newUser);
    return {
      user: this.sanitizeUser(newUser),
      tokens
    };
  }

  /**
   * Authenticate user with email and password
   */
  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status === 'suspended') {
      throw ApiError.forbidden('Your account has been suspended. Please contact platform support.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      tokens
    };
  }

  /**
   * Refresh expired access token using valid refresh token
   */
  async refresh(refreshToken) {
    if (!refreshToken) {
      throw ApiError.badRequest('Refresh token is required');
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await userRepository.findById(decoded.id);

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (user.status === 'suspended') {
      throw ApiError.forbidden('Account is suspended');
    }

    const tokens = generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      tokens
    };
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return this.sanitizeUser(user);
  }

  /**
   * Update permitted profile fields
   */
  async updateProfile(userId, { name, phone, avatar_url }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const updatedUser = await userRepository.update(userId, { name, phone, avatar_url });
    return this.sanitizeUser(updatedUser);
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await userRepository.updatePassword(userId, password_hash);
    return { success: true, message: 'Password updated successfully' };
  }
}

export default new AuthService();
