import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { rejectHotelValidator } from '../validators/hotel.validator.js';

const router = Router();

// Enforce authentication & admin role on all /admin endpoints
router.use(authenticate, requireRoles('admin'));

// Admin Dashboard & Reports
router.get('/dashboard', adminController.getDashboard);
router.get('/reports', adminController.getReports);

// User Management
router.get('/users', adminController.listUsers);
router.patch('/users/:userId/status', adminController.updateUserStatus);

// Hotel moderation workflows
router.get('/hotels/pending', adminController.listPendingHotels);
router.post('/hotels/:hotelId/approve', adminController.approveHotel);
router.post('/hotels/:hotelId/reject', rejectHotelValidator, adminController.rejectHotel);

// Platform Bookings Overview
router.get('/bookings', adminController.listBookings);

export default router;
