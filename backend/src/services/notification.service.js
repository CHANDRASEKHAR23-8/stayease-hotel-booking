import notificationRepository from '../repositories/notification.repository.js';
import { ApiError } from '../utils/apiResponse.js';

class NotificationService {
  /**
   * Create a notification for a user
   */
  async createNotification({ userId, title, message, type = 'general', referenceId = null }) {
    return notificationRepository.create({
      user_id: userId,
      title,
      message,
      type,
      reference_id: referenceId
    });
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    const result = await notificationRepository.findByUserId(userId, { page, limit });
    const unreadCount = await notificationRepository.countUnread(userId);
    return { ...result, unreadCount };
  }

  /**
   * Mark a specific notification as read (with recipient check)
   */
  async markAsRead(notificationId, userId) {
    const notif = await notificationRepository.findById(notificationId);
    if (!notif) {
      throw ApiError.notFound('Notification not found');
    }
    if (Number(notif.user_id) !== Number(userId)) {
      throw ApiError.forbidden('You do not have permission to modify this notification');
    }
    await notificationRepository.markAsRead(notificationId, userId);
    return { id: Number(notificationId), is_read: true };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    await notificationRepository.markAllAsRead(userId);
    return { markedAllRead: true };
  }
}

export default new NotificationService();
