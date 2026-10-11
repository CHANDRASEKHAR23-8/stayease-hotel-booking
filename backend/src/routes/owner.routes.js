import { Router } from 'express';
import ownerController from '../controllers/owner.controller.js';
import bookingController from '../controllers/booking.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { handleSingleUpload } from '../middleware/upload.middleware.js';
import {
  createHotelValidator,
  updateHotelValidator,
  createRoomValidator,
  updateRoomValidator
} from '../validators/hotel.validator.js';

const router = Router();

// Enforce authentication & owner role on all /owner endpoints
router.use(authenticate, requireRoles('owner'));

// Owner Dashboard & Analytics
router.get('/dashboard', ownerController.getOwnerDashboard);
router.get('/analytics', ownerController.getOwnerDashboard);

// Hotel management
router.get('/hotels', ownerController.listMyHotels);
router.post('/hotels', createHotelValidator, ownerController.createHotel);
router.get('/hotels/:hotelId', ownerController.getHotel);
router.patch('/hotels/:hotelId', updateHotelValidator, ownerController.updateHotel);
router.post('/hotels/:hotelId/submit', ownerController.submitHotel);
router.post('/hotels/:hotelId/images', handleSingleUpload('image'), ownerController.uploadHotelImage);

// Room management
router.post('/hotels/:hotelId/rooms', createRoomValidator, ownerController.createRoom);
router.patch('/rooms/:roomId', updateRoomValidator, ownerController.updateRoom);
router.delete('/rooms/:roomId', ownerController.deactivateRoom);
router.post('/rooms/:roomId/images', handleSingleUpload('image'), ownerController.uploadRoomImage);

// Reservations management
router.get('/bookings', bookingController.getOwnerBookings);

export default router;
