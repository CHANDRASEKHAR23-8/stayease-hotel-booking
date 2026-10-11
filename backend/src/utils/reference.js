import crypto from 'crypto';

/**
 * Generate a unique booking reference in the format SE-YYYYMM-XXXX
 * Example: SE-202610-8842
 */
export function generateBookingReference() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars
  return `SE-${year}${month}-${randomChars}`;
}

/**
 * Generate a unique payment reference
 * Example: PAY-202610-A1B2C3
 */
export function generatePaymentReference() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const randomChars = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `PAY-${year}${month}-${randomChars}`;
}
