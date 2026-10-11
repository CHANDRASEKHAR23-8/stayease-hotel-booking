import { Router } from 'express';
import wishlistController from '../controllers/wishlist.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', wishlistController.getMyWishlist);
router.post('/:hotelId', wishlistController.addToWishlist);
router.delete('/:hotelId', wishlistController.removeFromWishlist);
router.get('/:hotelId/status', wishlistController.checkStatus);

export default router;
