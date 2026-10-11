import authService from '../services/auth.service.js';
import { successResponse } from '../utils/apiResponse.js';

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password, phone, role } = req.body;
      const result = await authService.register({ name, email, password, phone, role });
      return successResponse(res, result, 'Registration successful', 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      return successResponse(res, result, 'Login successful', 200);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken);
      return successResponse(res, result, 'Token refreshed successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      // For stateless JWT, client deletes token; server returns standard confirmation
      return successResponse(res, { loggedOut: true }, 'Logged out successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      return successResponse(res, { user }, 'Profile retrieved successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { name, phone, avatar_url } = req.body;
      const updatedUser = await authService.updateProfile(req.user.id, { name, phone, avatar_url });
      return successResponse(res, { user: updatedUser }, 'Profile updated successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
      return successResponse(res, result, 'Password changed successfully', 200);
    } catch (err) {
      next(err);
    }
  }
}

export default new AuthController();
