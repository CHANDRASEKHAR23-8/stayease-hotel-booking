import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import app from '../app.js';
import env from '../config/env.js';
import userRepository from '../repositories/user.repository.js';

test('AUTH SUITE: Registration, Login, RBAC, Tokens, and Protected Fields', async (t) => {
  // Clear any existing mock data before tests
  userRepository.resetMockStore();

  // Seed an admin user for RBAC testing
  const adminPasswordHash = await bcrypt.hash('AdminSecret123!', 10);
  userRepository.seedMockUser({
    id: 1,
    name: 'Platform Admin',
    email: 'admin@stayease.com',
    password_hash: adminPasswordHash,
    role: 'admin',
    status: 'active'
  });

  // Seed a suspended user for suspension test
  const suspendedPasswordHash = await bcrypt.hash('Suspended123!', 10);
  userRepository.seedMockUser({
    id: 2,
    name: 'Suspended User',
    email: 'suspended@stayease.com',
    password_hash: suspendedPasswordHash,
    role: 'customer',
    status: 'suspended'
  });

  let customerToken = null;
  let customerRefreshToken = null;
  let ownerToken = null;
  let adminToken = null;

  await t.test('1. Customer Registration - should succeed with valid inputs', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'Password123!',
        phone: '+1234567890',
        role: 'customer'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, 'john.doe@example.com');
    assert.strictEqual(res.body.data.user.role, 'customer');
    assert.strictEqual(res.body.data.user.status, 'active');
    assert.strictEqual(res.body.data.user.password_hash, undefined, 'password_hash must never be leaked');
    assert.ok(res.body.data.tokens.accessToken, 'Access token must be present');
    assert.ok(res.body.data.tokens.refreshToken, 'Refresh token must be present');

    customerToken = res.body.data.tokens.accessToken;
    customerRefreshToken = res.body.data.tokens.refreshToken;
  });

  await t.test('2. Owner Registration - should succeed with role "owner"', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Alice Owner',
        email: 'alice.owner@example.com',
        password: 'Password123!',
        phone: '+1987654321',
        role: 'owner'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.role, 'owner');
    assert.strictEqual(res.body.data.user.password_hash, undefined);

    ownerToken = res.body.data.tokens.accessToken;
  });

  await t.test('3. Security Check: Prevent self-registration as "admin"', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Hacker Admin',
        email: 'hacker@example.com',
        password: 'Password123!',
        role: 'admin'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    const roleError = res.body.error.details.find(d => d.field === 'role');
    assert.ok(roleError, 'Must reject role=admin with clear error');
  });

  await t.test('4. Duplicate Email Registration - should return 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'John Clone',
        email: 'john.doe@example.com', // Duplicate
        password: 'Password123!'
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'CONFLICT');
  });

  await t.test('5. Invalid Inputs Validation - should reject invalid email, weak password, short name', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'J', // Too short
        email: 'invalid-email-address', // Invalid email
        password: 'weak' // Too weak (< 8 chars, missing uppercase, digits)
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.length >= 3);
  });

  await t.test('6. User Login - should succeed with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'Password123!'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, 'john.doe@example.com');
    assert.strictEqual(res.body.data.user.password_hash, undefined);
    assert.ok(res.body.data.tokens.accessToken);
  });

  await t.test('7. Login - should reject incorrect password (verifies bcrypt comparison)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'WrongPassword999!'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('8. Login - should reject non-existent email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'ghost@example.com',
        password: 'Password123!'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('9. Login - should block suspended accounts with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'suspended@stayease.com',
        password: 'Suspended123!'
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('10. Admin Login - should succeed for seeded admin', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@stayease.com',
        password: 'AdminSecret123!'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.role, 'admin');
    adminToken = res.body.data.tokens.accessToken;
  });

  await t.test('11. JWT Auth - GET /me should return current authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, 'john.doe@example.com');
  });

  await t.test('12. JWT Auth - should reject request without token with 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me');

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('13. JWT Auth - should reject invalid or forged token with 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.forged.jwt.token');

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_TOKEN');
  });

  await t.test('14. JWT Auth - should reject expired token with 401 TOKEN_EXPIRED', async () => {
    // Sign a token that expired 10 minutes ago
    const expiredToken = jwt.sign(
      { id: 1, email: 'admin@stayease.com', role: 'admin', name: 'Platform Admin' },
      env.jwt.secret,
      { expiresIn: '-10m' }
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'TOKEN_EXPIRED');
  });

  await t.test('15. Token Refresh - should issue new tokens with valid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: customerRefreshToken });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.tokens.accessToken);
    assert.ok(res.body.data.tokens.refreshToken);
  });

  await t.test('16. Token Refresh - should reject invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'bogus.refresh.token' });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('17. RBAC - Admin route should allow admin and block customer with 403', async () => {
    // Admin access
    const adminRes = await request(app)
      .get('/api/v1/test/admin-only')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(adminRes.status, 200);

    // Customer attempt on Admin route
    const customerRes = await request(app)
      .get('/api/v1/test/admin-only')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.strictEqual(customerRes.status, 403);
    assert.strictEqual(customerRes.body.error.code, 'FORBIDDEN_ROLE');
  });

  await t.test('18. RBAC - Owner route should allow owner and block customer with 403', async () => {
    // Owner access
    const ownerRes = await request(app)
      .get('/api/v1/test/owner-only')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.strictEqual(ownerRes.status, 200);

    // Customer attempt on Owner route
    const customerRes = await request(app)
      .get('/api/v1/test/owner-only')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.strictEqual(customerRes.status, 403);
  });

  await t.test('19. Profile Update - should successfully update permitted fields (name, phone)', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'John Updated Doe',
        phone: '+15559998888'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.name, 'John Updated Doe');
    assert.strictEqual(res.body.data.user.phone, '+15559998888');
  });

  await t.test('20. Security Check: Prevent privilege escalation on profile update', async () => {
    // Attempt to update role to 'admin'
    const roleRes = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ role: 'admin' });

    assert.strictEqual(roleRes.status, 400);
    assert.strictEqual(roleRes.body.success, false);
    const hasProtectedFieldDetail = roleRes.body.error.details?.some(d => d.message.includes('protected field'));
    assert.ok(hasProtectedFieldDetail, 'Should have validation error detail specifying protected field');

    // Attempt to update status to 'suspended' or modify id
    const statusRes = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'suspended', id: 999 });

    assert.strictEqual(statusRes.status, 400);
    assert.strictEqual(statusRes.body.success, false);
    const hasStatusFieldDetail = statusRes.body.error.details?.some(d => d.message.includes('protected field'));
    assert.ok(hasStatusFieldDetail, 'Should reject modifying status or id');
  });

  await t.test('21. Password Change - should succeed when current password matches', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        currentPassword: 'Password123!',
        newPassword: 'BrandNewPassword456!'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify login with new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'john.doe@example.com',
        password: 'BrandNewPassword456!'
      });

    assert.strictEqual(loginRes.status, 200);
  });

  await t.test('22. Password Change - should reject incorrect current password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        currentPassword: 'IncorrectOldPassword123!',
        newPassword: 'AnotherPassword789!'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('23. Logout - should return success confirmation', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.loggedOut, true);
  });
});
