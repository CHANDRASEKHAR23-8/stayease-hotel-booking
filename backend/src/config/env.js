import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // Database
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || 'stayease_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10)
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'stayease_default_fallback_secret_key_39482',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'stayease_default_refresh_secret_key_39482',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // CORS
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',

  // Uploads
  storageDriver: process.env.STORAGE_DRIVER || 'local',
  storageLocalPath: process.env.STORAGE_LOCAL_PATH || 'uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),

  // Payment
  paymentGatewayProvider: process.env.PAYMENT_GATEWAY_PROVIDER || 'mock',
  paymentCurrency: process.env.PAYMENT_CURRENCY || 'USD',
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_stayease_secure_webhook_secret_key_84920'
};

export default env;
