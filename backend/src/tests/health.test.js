import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../app.js';

test('GET / should return 200 with service info', async () => {
  const res = await request(app).get('/');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.service, 'StayEase Hotel Booking Platform API');
});

test('GET /api/v1/health should return 200 with health status', async () => {
  const res = await request(app).get('/api/v1/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.data.status, 'UP');
  assert.ok(res.body.data.database !== undefined);
});

test('GET /api/v1/non-existent-route should return 404 with standard error format', async () => {
  const res = await request(app).get('/api/v1/non-existent-route');
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.success, false);
  assert.strictEqual(res.body.error.code, 'NOT_FOUND');
});
