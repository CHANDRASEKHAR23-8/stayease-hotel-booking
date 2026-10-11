import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { ApiError } from './apiResponse.js';

/**
 * Generate Access and Refresh JWT Tokens for a user
 */
export function generateTokens(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  const accessToken = jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn
  });

  const refreshToken = jwt.sign(
    { id: user.id, tokenType: 'refresh' },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: env.jwt.expiresIn
  };
}

/**
 * Verify JWT Access Token
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError('Token has expired', 401, 'TOKEN_EXPIRED');
    }
    throw new ApiError('Invalid or corrupted token', 401, 'INVALID_TOKEN');
  }
}

/**
 * Verify JWT Refresh Token
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, env.jwt.refreshSecret);
    if (decoded.tokenType !== 'refresh') {
      throw new ApiError('Invalid refresh token type', 401, 'INVALID_REFRESH_TOKEN');
    }
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError('Refresh token has expired', 401, 'REFRESH_TOKEN_EXPIRED');
    }
    throw new ApiError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
}
