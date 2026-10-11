import notificationService from '../services/notification.service.js';
import { paginatedResponse, successResponse } from '../utils/apiResponse.js';

class NotificationController {
  /**
   * GET /api/v1/notifications
   */
  async getMyNotifications(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const { items, total, unreadCount } = await notificationService.getUserNotifications(req.user.id, req.query);
      return paginatedResponse(res, items, total, page, limit, 'Notifications retrieved', { unreadCount });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/notifications/:notificationId/read
   */
  async markAsRead(req, res, next) {
    try {
      const result = await notificationService.markAsRead(req.params.notificationId, req.user.id);
      return successResponse(res, result, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/notifications/read-all
   */
  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user.id);
      return successResponse(res, result, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
}

export default new NotificationController();
