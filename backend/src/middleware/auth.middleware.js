import { verifyAccessToken } from '../utils/token.js';
import { ApiError } from '../utils/apiResponse.js';
import userRepository from '../repositories/user.repository.js';

/**
 * Middleware to authenticate JWT access tokens
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('Authentication token is required. Format: Bearer <token>', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Verify user exists and status is active
    const user = await userRepository.findById(decoded.id);
    if (!user) {
      throw new ApiError('User account not found or has been removed', 401, 'USER_NOT_FOUND');
    }

    if (user.status === 'suspended') {
      throw new ApiError('Your account has been suspended. Please contact platform support.', 403, 'ACCOUNT_SUSPENDED');
    }

    // Attach user to request object (without sensitive hash)
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware to enforce role-based access control
 * @param {...string} allowedRoles - 'customer', 'owner', 'admin'
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('Authentication required before checking roles', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(
        `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]. Your role is "${req.user.role}".`,
        403,
        'FORBIDDEN_ROLE'
      ));
    }

    next();
  };
}

/**
 * Optional authentication middleware: attaches user if token is valid, but does not block guests
 */
export async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await userRepository.findById(decoded.id);
    if (user && user.status === 'active') {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      };
    } else {
      req.user = null;
    }
  } catch (e) {
    req.user = null;
  }
  next();
}

export default {
  authenticate,
  requireRoles,
  optionalAuthenticate
};
