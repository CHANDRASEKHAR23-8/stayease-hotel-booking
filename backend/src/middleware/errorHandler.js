import { ApiError } from '../utils/apiResponse.js';
import env from '../config/env.js';

export function notFoundHandler(req, res, next) {
  next(new ApiError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  // Do not log sensitive credentials or secrets
  if (statusCode >= 500) {
    console.error(`[Error 500] ${req.method} ${req.originalUrl}:`, err.stack || err);
  }

  const response = {
    success: false,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
      ...(env.isDev && statusCode >= 500 ? { stack: err.stack } : {})
    }
  };

  res.status(statusCode).json(response);
}
