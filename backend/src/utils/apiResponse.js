/**
 * Consistent API Response Helper Functions
 */

export function successResponse(res, data = null, message = 'Success', statusCode = 200, extra = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra
  });
}

export function paginatedResponse(res, items, total, page, limit, message = 'Success', extra = {}) {
  const totalPages = Math.ceil(total / limit) || 1;
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    ...extra
  });
}

export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details = null) {
    return new ApiError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Access forbidden') {
    return new ApiError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(message, 404, 'NOT_FOUND');
  }

  static conflict(message = 'Conflict with existing state') {
    return new ApiError(message, 409, 'CONFLICT');
  }

  static unprocessable(message, details = null) {
    return new ApiError(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }
}
