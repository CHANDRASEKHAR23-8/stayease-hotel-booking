# StayEase Architecture Overview

## 1. System Architecture

StayEase is designed as a modular, three-tier full-stack hotel booking platform:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     StayEase Mobile Client      │       │     StayEase Admin Web App      │
│  (Flutter / Dart / Material 3)  │       │       (React 18 / Vite)         │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 │              HTTPS REST API             │
                 └───────────────────┬─────────────────────┘
                                     │
                        ┌────────────▼────────────┐
                        │   Express.js API Layer   │
                        │    (Node.js 20+ ES6)    │
                        │  - Rate Limiting        │
                        │  - JWT Auth & RBAC      │
                        │  - Express-Validator    │
                        │  - Centralized Errors   │
                        └────────────┬────────────┘
                                     │
              ┌──────────────────────┴──────────────────────┐
              │                                             │
   ┌──────────▼──────────┐                       ┌──────────▼──────────┐
   │    MySQL 8+ Engine  │                       │   Object Storage    │
   │  - Normalized Schema│                       │   (Uploads / S3)    │
   │  - ACID Transactions│                       └─────────────────────┘
   │  - Row-level Locks  │
   └─────────────────────┘
```

## 2. Core Security & Isolation Principles

1. **Server-Enforced RBAC**:
   - `customer`: Browse, search, book rooms, leave verified reviews, manage personal profile.
   - `owner`: Manage their own hotels, rooms, inventory, and reservations. Cannot access other owners' assets.
   - `admin`: Platform governance, review approvals, hotel moderation, account suspensions.
2. **Transaction Integrity**:
   - Booking operations use `withTransaction` with strict validation.
   - Room availability check counts overlapping active bookings:
     `WHERE check_in_date < :requested_check_out AND check_out_date > :requested_check_in AND booking_status IN ('confirmed', 'pending')`.
3. **No Client Trust**:
   - Grand totals, nightly rates, tax percentages, and permissions are calculated strictly on the server.
