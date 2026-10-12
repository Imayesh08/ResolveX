import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import User from '../src/models/User.js';

describe('Phase 3 Authentication, User Management & RBAC Integration Tests', () => {
  let customerToken;
  let adminToken;
  let staffToken;
  let createdStaffId;

  const testCustomerData = {
    name: 'Kavitha Ramanathan',
    email: 'kavitha@test-auth.local',
    password: 'CustomerPass123!',
    phone: '9840123456'
  };

  const testAdminData = {
    name: 'Chief Admin',
    email: 'admin@test-auth.local',
    password: 'AdminSecurePass999!',
    role: 'admin',
    department: 'Administration'
  };

  beforeAll(async () => {
    await connectDB();
    // Clean test users
    await User.deleteMany({ email: /@test-auth\.local$/i });

    // Seed Admin user directly for testing admin actions
    const admin = await User.create(testAdminData);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testAdminData.email, password: testAdminData.password });
    adminToken = loginRes.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-auth\.local$/i });
  });

  describe('Customer Registration Flow', () => {
    it('should register a customer with valid credentials and return JWT token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testCustomerData);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testCustomerData.email);
      expect(res.body.data.user.role).toBe('customer');
      expect(res.body.data.user.password).toBeUndefined();

      customerToken = res.body.token;
    });

    it('should prevent privilege escalation: public register cannot claim admin role', async () => {
      const maliciousRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Hacker User',
          email: 'hacker@test-auth.local',
          password: 'Password123!',
          role: 'admin' // Attempting to escalate role
        });

      expect(maliciousRes.status).toBe(201);
      // Backend must force role to 'customer'
      expect(maliciousRes.body.data.user.role).toBe('customer');
    });

    it('should reject registration if email is already registered', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testCustomerData);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject registration if required fields are missing or invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: '',
          email: 'invalid-email',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('User Login Flow', () => {
    it('should login successfully with valid email and password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testCustomerData.email,
          password: testCustomerData.password
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testCustomerData.email);
    });

    it('should reject login when password is incorrect', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testCustomerData.email,
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/invalid email address or password/i);
    });

    it('should reject login for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'ghost@test-auth.local',
          password: 'Password123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid email address or password/i);
    });
  });

  describe('Protected Route Authentication Middleware', () => {
    it('should return 401 when accessing protected route without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/not logged in/i);
    });

    it('should return 401 when token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid authorization token/i);
    });

    it('should return user profile when valid token is supplied', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testCustomerData.email);
      expect(res.body.data.user.role).toBe('customer');
    });
  });

  describe('Role-Based Access Control (RBAC) & User Management', () => {
    it('should return 403 Forbidden when Customer tries to access Admin user management', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/forbidden/i);
    });

    it('should allow Admin to create a Support Staff account', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Vikram Support Lead',
          email: 'vikram.staff@test-auth.local',
          password: 'StaffPass123!',
          role: 'staff',
          department: 'Technical Support',
          phone: '9840998877'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('staff');
      expect(res.body.data.user.department).toBe('Technical Support');
      createdStaffId = res.body.data.user._id || res.body.data.user.id;
    });

    it('should allow Support Staff to login and fetch their staff profile', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'vikram.staff@test-auth.local',
          password: 'StaffPass123!'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.role).toBe('staff');
      staffToken = loginRes.body.token;

      // Staff can access staff list
      const staffListRes = await request(app)
        .get('/api/v1/users/staff')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(staffListRes.status).toBe(200);
      expect(staffListRes.body.data.staff.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow Admin to view all users with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
      expect(res.body.data.users).toBeInstanceOf(Array);
    });

    it('should allow Admin to update user details', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${createdStaffId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          department: 'Customer Operations'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.department).toBe('Customer Operations');
    });

    it('should allow Admin to deactivate a user account', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${createdStaffId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deactivated/i);

      // Verify that deactivated user cannot login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'vikram.staff@test-auth.local',
          password: 'StaffPass123!'
        });

      expect(loginRes.status).toBe(403);
      expect(loginRes.body.message).toMatch(/deactivated/i);
    });
  });
});
