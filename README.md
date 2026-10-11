# StayEase — Full-Stack Hotel Booking Platform

[![Node.js](https://img.shields.io/badge/Node.js-20+-68a063?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.20+-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**StayEase** is an enterprise-grade, scalable, full-stack hotel booking platform designed for real-world production use. It features a responsive **Flutter (Material 3)** mobile frontend, a high-throughput **Node.js / Express.js (ES Modules)** REST API, an ACID-compliant **MySQL 8** relational database with 16 normalized tables, and an administrative **React 18 / Vite** Web Dashboard.

---

## 🌟 Key Capabilities & Features

### 1. Mobile Experience (Flutter & Dart)
- **Material 3 Design System**: Curated color schemes, dynamic contrast, responsive cards, glassmorphic headers, and micro-interactions.
- **State & Routing**: Riverpod code generation architecture with GoRouter deep linking and navigation guards.
- **Robust Networking**: Dio HTTP client with automatic JWT token attachment, refresh rotation interceptor, and comprehensive error mapping.
- **Customer Journey**:
  - Full-text hotel search by location, date range, price sliders, guest counts, and amenities.
  - Interactive room selection with real-time remaining inventory checks.
  - Streamlined booking checkout with server-authoritative tax and nightly price calculations.
  - Secure payment simulation with card/UPI/netbanking options and instant receipt generation.
  - Booking management with cancellation eligibility checks and automated inventory restoration.
  - Customer wishlist saving and verified stay-only review submission.

### 2. Backend & API (Node.js & Express)
- **Modular REST Architecture**: Clean Separation of Concerns (`routes` → `controllers` → `services` → `repositories`).
- **Role-Based Access Control (RBAC)**: Strictly enforced server-side authorization for `customer`, `owner`, and `admin` roles.
- **Transactional Booking Engine**: ACID-compliant reservations with row-level locks, date-range overlap calculations, multi-room support, and duplicate request idempotency.
- **Payment Processing Module**:
  - Payment intent generation with authoritative price calculations.
  - Authoritative payment verification and settlement.
  - Gateway webhook listener with timing-safe HMAC-SHA256 signature verification.
  - Idempotent duplicate event suppression.
- **Security & Reliability**:
  - bcrypt password hashing with salt rounds.
  - Rate limiting via `express-rate-limit`.
  - Secure HTTP headers via `helmet`.
  - Input sanitization via `express-validator`.
  - Centralized error handler preventing internal stack leakages.

### 3. Relational Database (MySQL 8)
- **Normalized Schema (16 tables)**: `users`, `hotels`, `rooms`, `amenities`, `hotel_amenities`, `hotel_images`, `room_images`, `bookings`, `booking_rooms`, `payments`, `reviews`, `wishlists`, `notifications`, `audit_logs`, `coupons`, `settings`.
- **Row-Level Locking**: `SELECT ... FOR UPDATE` ensuring race conditions never permit overbooking.
- **Database Migrations & Seed**: Comprehensive seed dataset with sample hotels, rooms, amenities, and user accounts.

### 4. Admin Web Dashboard (React 18 & Vite)
- Real-time KPI summary (Total Revenue, Active Bookings, Registered Users, Pending Approvals).
- Hotel verification and approval/rejection workflow with feedback notes.
- Platform user moderation (suspend/reactivate accounts).
- Platform-wide booking ledger and revenue analytics.

---

## 🏗️ Project Architecture

```text
booking/
├── mobile/                   # Flutter mobile & web application
│   ├── android/              # Native Android gradle & manifest
│   ├── assets/               # Images, icons, and fonts
│   ├── lib/
│   │   ├── core/             # Theme, constants, network (Dio), routing
│   │   ├── features/         # Auth, Hotels, Bookings, Wishlist, Notifications
│   │   └── main.dart         # Entrypoint
│   ├── test/                 # Unit and widget test suite (28 tests)
│   └── pubspec.yaml
│
├── backend/                  # Node.js + Express REST API (ES Modules)
│   ├── src/
│   │   ├── config/           # Database, environment, and logger config
│   │   ├── controllers/      # Route controllers
│   │   ├── middleware/       # JWT auth, RBAC, error handling, rate limiting
│   │   ├── repositories/     # Data access layer (MySQL & fallback store)
│   │   ├── routes/           # Versioned routes (/api/v1/...)
│   │   ├── services/         # Core business logic & transactions
│   │   ├── utils/            # Token generation, helpers, HMAC hashing
│   │   ├── validators/       # Request validation schemas
│   │   └── tests/            # Automated test suite (92 tests)
│   ├── uploads/              # Local storage for hotel/room media
│   ├── .env.example          # Environment variables template
│   └── package.json
│
├── admin-web/                # React 18 + Vite Admin Dashboard
│   ├── src/                  # Dashboard components, pages, API clients
│   ├── dist/                 # Production web build bundle
│   └── package.json
│
├── database/                 # Relational Database Schema & Data
│   ├── schema.sql            # MySQL 8 Normalized Schema
│   ├── seed.sql              # Seed accounts, hotels, rooms, and reviews
│   └── migrations/           # Migration files
│
├── docs/                     # Engineering documentation
│   ├── api-documentation.md  # Detailed REST API specification
│   ├── architecture.md       # High-level system design & security
│   └── deployment.md         # Production deployment & PM2/Nginx guide
│
└── README.md
```

---

## 🛠️ Prerequisites & Setup

Ensure the following tools are installed on your environment:
- **Node.js**: v20.0+ (Tested on v24.19)
- **MySQL Server**: 8.0+
- **Flutter SDK**: 3.20+ (Tested on Flutter 3.47 / Dart 3.13)
- **Git**

---

## 🗄️ Database Setup

1. Verify your MySQL 8 instance is running on port `3306`:
   ```bash
   mysqladmin -u root -p ping
   ```
2. Execute the schema script to create `stayease_db` and all 16 tables:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
3. Populate the database with the seed dataset:
   ```bash
   mysql -u root -p stayease_db < database/seed.sql
   ```

### Default Seed Accounts
All seed accounts use the default password: **`Password123!`**

| Role | Email | Permissions |
| :--- | :--- | :--- |
| **Administrator** | `admin@stayease.com` | Full governance, approvals, user moderation, reports |
| **Hotel Owner 1** | `owner1@stayease.com` | Manages Grand Plaza Hotel & room inventory |
| **Hotel Owner 2** | `owner2@stayease.com` | Manages Seaside Resort & room inventory |
| **Customer 1** | `customer1@stayease.com` | Books rooms, submits reviews, manages wishlist |
| **Customer 2** | `customer2@stayease.com` | Books rooms, submits reviews, manages wishlist |

---

## 🚀 Running the Backend API

1. Navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Configure environment settings:
   ```bash
   cp .env.example .env
   ```
   *(Update `DB_PASSWORD`, `JWT_SECRET`, and `PAYMENT_WEBHOOK_SECRET` in `.env` if necessary)*
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the automated test suite:
   ```bash
   npm test
   ```
   *(Executes **92 test cases** across Auth, Inventory, Transactions, RBAC, Payments, and End-to-End flows)*
5. Start the development server:
   ```bash
   npm run dev
   ```
   Server starts at `http://localhost:5000`. Health check endpoint: `http://localhost:5000/api/v1/health`.

---

## 📱 Running the Mobile Client (Flutter)

1. Navigate to `mobile/`:
   ```bash
   cd mobile
   flutter pub get
   ```
2. Run code analysis & test suite:
   ```bash
   flutter analyze
   flutter test
   ```
   *(Executes **28 tests** covering state providers, widgets, auth logic, and booking workflows with 0 analyzer issues)*
3. Launch on your preferred target:
   ```bash
   # Run in Web Browser
   flutter run -d chrome

   # Run as Desktop Application (Windows)
   flutter run -d windows

   # Run on connected Android Device or Emulator
   flutter run -d android
   ```

*Note: For testing on an Android Emulator, the API base URL in `mobile/lib/core/constants/api_constants.dart` defaults to `http://10.0.2.2:5000/api/v1`.*

---

## 💻 Running the Admin Dashboard (React)

1. Navigate to `admin-web/`:
   ```bash
   cd admin-web
   npm install
   ```
2. Start the local Vite development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` and sign in using the administrator credentials (`admin@stayease.com` / `Password123!`).
4. To build the production bundle:
   ```bash
   npm run build
   ```

---

## 💳 Payment & Webhook Architecture

StayEase integrates an authoritative payment workflow:
1. **Payment Intent**: Client calls `POST /api/v1/payments/intent` with `bookingId`. Server verifies user ownership and pending status, generating a signed `clientSecret` and tracking ledger entry.
2. **Payment Verification**: Client or gateway completes the transaction and calls `POST /api/v1/payments/verify`. Backend validates the signature, marks payment `completed`, confirms booking, and emits an in-app notification.
3. **Gateway Webhooks**: Public endpoint `POST /api/v1/payments/webhook` verifies payloads against `PAYMENT_WEBHOOK_SECRET` using **HMAC-SHA256** and timing-safe byte comparison (`crypto.timingSafeEqual`).
4. **Idempotency Protection**: Duplicate callbacks or retried webhooks detect existing completed status and return `200 OK` idempotently without double-crediting or duplicate events.

---

## 🔒 Security Hardening & Best Practices

- **Zero Client Trust**: All room charges, dates, taxes, and cancellation eligibility rules are evaluated server-side.
- **SQL Injection Prevention**: All MySQL queries utilize parameterized prepared statements (`mysql2/promise`).
- **Timing-Attack Resistance**: Password hashes use bcrypt with work factor 10; webhook signatures use `crypto.timingSafeEqual`.
- **Role Elevation Defense**: User registration routes strictly reject attempts to register or update to the `admin` role.
- **Environment Isolation**: Secrets, private keys, and database credentials are excluded from source control (`.gitignore`).

---

## 📚 Engineering Documentation

- [REST API Specification](docs/api-documentation.md): Comprehensive documentation of all endpoints, parameters, and error formats.
- [System Architecture](docs/architecture.md): High-level topology, component diagrams, and data flow models.
- [Production Deployment Guide](docs/deployment.md): Instructions for PM2 clustering, Nginx reverse proxy configuration, SSL certificates, MySQL InnoDB tuning, and Android APK/AAB release signing.
