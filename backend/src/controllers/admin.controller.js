import hotelService from '../services/hotel.service.js';
import adminService from '../services/admin.service.js';
import { paginatedResponse, successResponse } from '../utils/apiResponse.js';

class AdminController {
  /**
   * GET /api/v1/admin/dashboard
   */
  async getDashboard(req, res, next) {
    try {
      const data = await adminService.getDashboardMetrics();
      return successResponse(res, data, 'Admin dashboard metrics retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/users
   */
  async listUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const { items, total } = await adminService.listUsers(req.query);
      return paginatedResponse(res, items, total, page, limit, 'Users retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/users/:userId/status
   */
  async updateUserStatus(req, res, next) {
    try {
      const { status } = req.body;
      const result = await adminService.updateUserStatus(req.params.userId, status, req.user.id);
      return successResponse(res, result, `User status updated to ${status}`);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/hotels/pending
   */
  async listPendingHotels(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const { items, total } = await hotelService.getPendingHotels(req.query);
      return paginatedResponse(res, items, total, page, limit, 'Pending hotels retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/admin/hotels/:hotelId/approve
   */
  async approveHotel(req, res, next) {
    try {
      const approved = await hotelService.approveHotel(req.params.hotelId);
      return successResponse(res, { hotel: approved }, 'Hotel approved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/admin/hotels/:hotelId/reject
   */
  async rejectHotel(req, res, next) {
    try {
      const { reason } = req.body;
      const rejected = await hotelService.rejectHotel(req.params.hotelId, reason);
      return successResponse(res, { hotel: rejected }, 'Hotel rejected successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/bookings
   */
  async listBookings(req, res, next) {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '20', 10);
      const { items, total } = await adminService.listBookings(req.query);
      return paginatedResponse(res, items, total, page, limit, 'Platform bookings retrieved');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/reports
   */
  async getReports(req, res, next) {
    try {
      const reports = await adminService.getReports();
      return successResponse(res, reports, 'Platform reports retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export default new AdminController();
