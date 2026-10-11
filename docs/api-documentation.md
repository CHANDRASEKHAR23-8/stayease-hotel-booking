# StayEase REST API Documentation

The StayEase REST API provides programmatic access to hotel inventory, booking engine, multi-role management, verified reviews, wishlists, notifications, and secure payment processing.

- **Base URL**: `http://localhost:5000/api/v1` (Production: `https://api.stayease.com/api/v1`)
- **Format**: JSON (`Content-Type: application/json`)
- **Authentication**: Bearer Token in `Authorization` header (`Authorization: Bearer <jwt_access_token>`)
- **Standard Response Structure**:
  ```json
  {
    "success": true,
    "data": { ... },
    "error": null,
    "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } // When applicable
  }
  ```

---

## 1. System Health

### `GET /health`
Verifies backend service operational state and database connectivity.
- **Auth**: None
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "service": "StayEase REST API",
      "status": "UP",
      "timestamp": "2026-10-11T11:00:00.000Z",
      "database": "connected"
    }
  }
  ```

---

## 2. Authentication & Identity (`/auth`)

### `POST /auth/register`
Register a new customer or hotel owner.
- **Auth**: None
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "role": "customer" // "customer" | "owner"
  }
  ```
- **Response `201 Created`**: Returns `{ user, tokens: { accessToken, refreshToken, expiresIn } }`.

### `POST /auth/login`
Authenticate user credentials and receive JWT keypair.
- **Auth**: None
- **Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`**: Returns `{ user, tokens: { accessToken, refreshToken, expiresIn } }`.

### `POST /auth/refresh`
Refresh expired access token using valid refresh token.
- **Auth**: None
- **Body**: `{ "refreshToken": "<token>" }`
- **Response `200 OK`**: Returns renewed `accessToken`.

### `POST /auth/logout`
Revoke refresh token and invalidate active session.
- **Auth**: Bearer token
- **Response `200 OK`**

### `GET /auth/me`
Retrieve currently authenticated user's profile and roles.
- **Auth**: Bearer token
- **Response `200 OK`**

### `PATCH /auth/profile`
Update user display name, phone number, or avatar URL.
- **Auth**: Bearer token
- **Body**: `{ "name": "Jane M. Doe", "phone": "+1234567890", "avatar_url": "..." }`
- **Response `200 OK`**

---

## 3. Hotels & Inventory (`/hotels`)

### `GET /hotels`
Search approved hotels with compound filtering and pagination.
- **Query Parameters**:
  - `city` (string): Filter by city name.
  - `minPrice` / `maxPrice` (number): Filter by room price range.
  - `rating` (number): Minimum average review score (1.0 to 5.0).
  - `amenities` (comma-separated): e.g. `wifi,pool,spa`.
  - `page` (number, default 1), `limit` (number, default 10).
- **Response `200 OK`**: Paginated list of approved hotels with thumbnails, price range, and review aggregates.

### `GET /hotels/:hotelId`
Retrieve comprehensive hotel profile including description, policy, amenities, verified reviews, room types, and photos.
- **Response `200 OK`**

### `GET /hotels/:hotelId/availability`
Check room type availability between check-in and check-out dates.
- **Query Parameters**:
  - `checkIn` (YYYY-MM-DD): Required
  - `checkOut` (YYYY-MM-DD): Required
  - `guests` (number): Minimum capacity
- **Response `200 OK`**: Returns list of available room types with remaining room counts for the requested dates.

---

## 4. Bookings & Reservations (`/bookings`)

### `POST /bookings`
Transactional reservation creation with idempotency and room inventory decrement.
- **Auth**: Bearer token (Customer)
- **Headers**:
  - `Idempotency-Key` (string, optional UUID): Prevents duplicate booking creation on network retries.
- **Body**:
  ```json
  {
    "hotelId": 1,
    "roomId": 1,
    "checkInDate": "2026-11-01",
    "checkOutDate": "2026-11-05",
    "numRooms": 1,
    "numGuests": 2,
    "specialRequests": "Late check-in requested"
  }
  ```
- **Response `201 Created`**: Returns confirmed booking reference (`SE-XXXXXX`), verified itemized total, taxes, and initial payment record (`payment_status: "pending"`).

### `GET /bookings/my`
Retrieve authenticated customer's booking history with hotel and room metadata.
- **Auth**: Bearer token
- **Response `200 OK`**

### `GET /bookings/:bookingId`
Retrieve detailed overview of a single booking.
- **Auth**: Bearer token (Customer owner, Hotel owner, or Admin)
- **Response `200 OK`**

### `POST /bookings/:bookingId/cancel`
Cancel an eligible reservation, restore room availability in MySQL, and initiate refund processing.
- **Auth**: Bearer token (Customer owner or Admin)
- **Body**: `{ "reason": "Travel plans changed" }`
- **Response `200 OK`**

---

## 5. Payment Processing (`/payments`)

Enterprise payment interface supporting client intents, manual verification, session cancellations, and gateway webhook signatures (HMAC-SHA256).

### `POST /payments/intent`
Initialize a payment transaction for an active booking.
- **Auth**: Bearer token (Customer owner)
- **Body**:
  ```json
  {
    "bookingId": 105,
    "paymentMethod": "card" // "card" | "upi" | "netbanking" | "wallet"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "paymentReference": "PAY-1730000000-A1B2",
      "bookingId": 105,
      "amount": 450.00,
      "currency": "USD",
      "clientSecret": "pi_sec_mock_45000_1730000000",
      "status": "pending"
    }
  }
  ```

### `POST /payments/verify`
Authoritative confirmation and settlement of a payment transaction.
- **Auth**: Bearer token (Customer owner)
- **Body**:
  ```json
  {
    "paymentReference": "PAY-1730000000-A1B2",
    "transactionId": "txn_gateway_success_99182",
    "paymentMethod": "card"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "paymentReference": "PAY-1730000000-A1B2",
      "bookingId": 105,
      "status": "completed",
      "transactionId": "txn_gateway_success_99182",
      "verifiedAt": "2026-10-11T12:00:00.000Z"
    }
  }
  ```

### `POST /payments/:reference/cancel`
Cancel an in-flight payment session without charging the user.
- **Auth**: Bearer token (Customer owner or Admin)
- **Body**: `{ "reason": "User abandoned checkout" }`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "paymentReference": "PAY-1730000000-A1B2",
      "status": "cancelled"
    }
  }
  ```

### `GET /payments/booking/:bookingId`
Retrieve payment transaction status and audit ledger for a specific booking.
- **Auth**: Bearer token (Customer owner, Hotel owner, or Admin)
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "paymentReference": "PAY-1730000000-A1B2",
      "bookingId": 105,
      "amount": 450.00,
      "currency": "USD",
      "status": "completed",
      "paymentMethod": "card",
      "createdAt": "2026-10-11T11:58:00.000Z"
    }
  }
  ```

### `POST /payments/webhook`
Public asynchronous gateway webhook receiver with timing-safe HMAC-SHA256 signature verification.
- **Auth**: Webhook Signature Header (`x-webhook-signature` or `stripe-signature`)
- **Body**:
  ```json
  {
    "event": "payment.succeeded",
    "data": {
      "paymentReference": "PAY-1730000000-A1B2",
      "transactionId": "ch_mock_gateway_9921",
      "amount": 450.00
    }
  }
  ```
- **Security**: Validates digest against `PAYMENT_WEBHOOK_SECRET` using `crypto.timingSafeEqual`. Idempotent against duplicate deliveries.
- **Response `200 OK`**: `{ "success": true, "received": true }`

---

## 6. Hotel Owner Management (`/owner`)

### `POST /owner/hotels`
Create a draft hotel property submission.
- **Auth**: Bearer token (Owner)
- **Body**: Property name, description, address, city, amenities, check-in/out policies.

### `PATCH /owner/hotels/:hotelId`
Update hotel profile details (requires owner authorization).
- **Auth**: Bearer token (Owner)

### `POST /owner/hotels/:hotelId/submit`
Submit draft hotel for administrative approval queue.
- **Auth**: Bearer token (Owner)

### `POST /owner/hotels/:hotelId/rooms`
Add a new room category (inventory, max occupancy, nightly price, bed type).
- **Auth**: Bearer token (Owner)

### `PATCH /owner/rooms/:roomId`
Update room type pricing, description, or inventory counts.
- **Auth**: Bearer token (Owner)

### `DELETE /owner/rooms/:roomId`
Deactivate room type.
- **Auth**: Bearer token (Owner)

### `GET /owner/bookings`
List all bookings placed across the owner's managed hotels.
- **Auth**: Bearer token (Owner)

---

## 7. Wishlists & Reviews

### `GET /wishlist`
Retrieve customer's saved hotels.
- **Auth**: Bearer token (Customer)

### `POST /wishlist/:hotelId`
Add hotel to customer's wishlist.
- **Auth**: Bearer token (Customer)

### `DELETE /wishlist/:hotelId`
Remove hotel from customer's wishlist.
- **Auth**: Bearer token (Customer)

### `POST /hotels/:hotelId/reviews`
Submit review and star rating (1–5) for a completed stay. Enforces single review per stay.
- **Auth**: Bearer token (Customer)
- **Body**: `{ "bookingId": 105, "rating": 5, "comment": "Exceeded all expectations!" }`

### `GET /hotels/:hotelId/reviews`
List public approved reviews for a hotel.
- **Auth**: None

---

## 8. Notifications (`/notifications`)

### `GET /notifications`
Fetch customer/owner notifications with unread badge count.
- **Auth**: Bearer token

### `PATCH /notifications/:id/read`
Mark a single notification as read.
- **Auth**: Bearer token

### `PATCH /notifications/read-all`
Mark all user notifications as read.
- **Auth**: Bearer token

---

## 9. Platform Administration (`/admin`)

Strictly restricted to users with `role: "admin"`.

### `GET /admin/dashboard`
Returns platform-wide metrics: total revenue, active bookings, registered customers, approved hotels, pending approvals.

### `GET /admin/users`
List and search platform users with status filtering.

### `PATCH /admin/users/:userId/status`
Suspend or activate user account (`active` | `suspended`).

### `GET /admin/hotels/pending`
Retrieve queue of hotels awaiting verification and approval.

### `POST /admin/hotels/:hotelId/approve`
Approve hotel and make it publicly searchable across the platform.

### `POST /admin/hotels/:hotelId/reject`
Reject hotel submission with structured feedback.
- **Body**: `{ "reason": "Insufficient fire safety documentation." }`

### `GET /admin/bookings`
Platform-wide booking ledger with search and status filters.

### `GET /admin/reports`
Monthly revenue analytics, hotel occupancy reports, and refund summaries.
