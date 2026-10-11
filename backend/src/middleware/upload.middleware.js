import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import env from '../config/env.js';
import { ApiError } from '../utils/apiResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Storage Engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `img-${uniqueSuffix}${ext}`);
  }
});

// File Filter Function
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Validate extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new ApiError(`Unsupported file extension: ${ext}. Allowed: jpg, jpeg, png, webp`, 400, 'UNSUPPORTED_FILE_TYPE'));
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new ApiError(`Unsupported MIME type: ${file.mimetype}. Allowed: image/jpeg, image/png, image/webp`, 400, 'UNSUPPORTED_MIME_TYPE'));
  }

  cb(null, true);
};

// Multer Upload Instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxFileSizeMb * 1024 * 1024 // e.g. 5MB
  }
});

/**
 * Middleware wrapper to catch Multer errors and convert to standard ApiError
 */
export function handleSingleUpload(fieldName) {
  const multerUpload = upload.single(fieldName);

  return (req, res, next) => {
    multerUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(`File size exceeds maximum limit of ${env.maxFileSizeMb}MB`, 400, 'FILE_TOO_LARGE'));
          }
          return next(new ApiError(`File upload error: ${err.message}`, 400, 'UPLOAD_ERROR'));
        }
        return next(err);
      }
      next();
    });
  };
}

export default {
  handleSingleUpload,
  upload
};
