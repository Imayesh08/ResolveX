import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Phase 1 Smoke Tests: Backend API Server Initialization', () => {
  it('GET /api/v1/health should respond with status 200 and success message', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('ResolveX Backend API is up and running');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/v1/unknown-route should return 404 error response', async () => {
    const res = await request(app).get('/api/v1/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toContain('Cannot find /api/v1/unknown-route');
  });
});
