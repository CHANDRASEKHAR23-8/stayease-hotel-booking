import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator
} from '../validators/auth.validator.js';

const router = Router();

// Public routes
router.post('/register', registerValidator, authController.register);
router.post('/login', loginValidator, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected routes (requires valid JWT access token)
router.get('/me', authenticate, authController.getMe);
router.patch('/profile', authenticate, updateProfileValidator, authController.updateProfile);
router.post('/change-password', authenticate, changePasswordValidator, authController.changePassword);

export default router;
