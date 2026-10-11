import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import env from './config/env.js';
import { getDbStatus } from './config/database.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { successResponse } from './utils/apiResponse.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import hotelRoutes from './routes/hotel.routes.js';
import ownerRoutes from './routes/owner.routes.js';
import adminRoutes from './routes/admin.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { authenticate, requireRoles } from './middleware/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration
const allowedOrigins = env.frontendOrigin === '*'
  ? '*'
  : env.frontendOrigin.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins === '*' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key']
}));

// Request Logging
if (!env.isTest) {
  app.use(morgan(env.isDev ? 'dev' : 'combined'));
}

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory for hotel/room images
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Root Endpoint
app.get('/', (req, res) => {
  return successResponse(res, {
    service: 'StayEase Hotel Booking Platform API',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: '/api/v1'
  }, 'StayEase REST API is live');
});

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  const dbStatus = getDbStatus();
  return successResponse(res, {
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
    database: dbStatus.connected ? 'CONNECTED' : 'DISCONNECTED',
    databaseDetails: {
      host: dbStatus.host,
      port: dbStatus.port,
      database: dbStatus.database,
      error: dbStatus.lastError
    }
  }, 'Service Health Check');
});

// Mount Application Routes under /api/v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/hotels', hotelRoutes);
app.use('/api/v1/owner', ownerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/payments', paymentRoutes);

// RBAC Protected Test verification routes
app.get('/api/v1/test/admin-only', authenticate, requireRoles('admin'), (req, res) => {
  return successResponse(res, { user: req.user }, 'Admin clearance granted');
});

app.get('/api/v1/test/owner-only', authenticate, requireRoles('owner'), (req, res) => {
  return successResponse(res, { user: req.user }, 'Owner clearance granted');
});

app.get('/api/v1/test/customer-only', authenticate, requireRoles('customer'), (req, res) => {
  return successResponse(res, { user: req.user }, 'Customer clearance granted');
});

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

export default app;
