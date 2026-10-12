import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, closeDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Complaint from '../src/models/Complaint.js';

describe('Phase 4 Complaint CRUD, Assignment, Status & Workflow Integration Tests', () => {
  let customer1Token;
  let customer1Id;
  let customer2Token;
  let customer2Id;
  let staffToken;
  let staffId;
  let adminToken;
  let adminId;

  let complaint1Id;
  let complaint1Ticket;
  let complaint2Id;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: /@test-complaints\.local$/ });
    await Complaint.deleteMany({ title: /^\[TEST-C\]/ });

    // 1. Create Admin
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@test-complaints.local',
      password: 'AdminPassword123!',
      role: 'admin'
    });
    adminId = admin._id;
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test-complaints.local', password: 'AdminPassword123!' });
    adminToken = adminLogin.body.token;

    // 2. Create Support Staff
    const staff = await User.create({
      name: 'Suresh Field Tech',
      email: 'suresh.staff@test-complaints.local',
      password: 'StaffPassword123!',
      role: 'staff',
      department: 'Technical Support'
    });
    staffId = staff._id;
    const staffLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'suresh.staff@test-complaints.local', password: 'StaffPassword123!' });
    staffToken = staffLogin.body.token;

    // 3. Register Customer 1
    const cust1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Ananya Customer One',
        email: 'ananya@test-complaints.local',
        password: 'CustomerPass123!',
        phone: '9840112233'
      });
    customer1Token = cust1Res.body.token;
    customer1Id = cust1Res.body.data.user.id;

    // 4. Register Customer 2
    const cust2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Balaji Customer Two',
        email: 'balaji@test-complaints.local',
        password: 'CustomerPass123!',
        phone: '9840445566'
      });
    customer2Token = cust2Res.body.token;
    customer2Id = cust2Res.body.data.user.id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-complaints\.local$/ });
    await Complaint.deleteMany({ title: /^\[TEST-C\]/ });
  });

  describe('Complaint Submission & Validation', () => {
    it('should allow customer to submit a new complaint with auto-generated ticketNumber', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          title: '[TEST-C] Fiber internet connection failure',
          description: 'Optical fiber light is flashing red on the modem since 9 AM.',
          category: 'Technical Issue',
          priority: 'HIGH'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.complaint.ticketNumber).toMatch(/^RX-\d{8}-\d{4}$/);
      expect(res.body.data.complaint.status).toBe('OPEN');
      expect(res.body.data.complaint.customer.name).toBe('Ananya Customer One');

      complaint1Id = res.body.data.complaint._id;
      complaint1Ticket = res.body.data.complaint.ticketNumber;
    });

    it('should reject complaint creation with invalid category or short title', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          title: 'Bad',
          description: 'Too short',
          category: 'Invalid Unlisted Category'
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject request when complaint ID is a malformed ObjectId', async () => {
      const res = await request(app)
        .get('/api/v1/complaints/not-a-valid-mongo-id')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid complaint id format/i);
    });
  });

  describe('Customer Data Isolation & Security', () => {
    beforeAll(async () => {
      // Customer 2 creates their own complaint
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          title: '[TEST-C] Double billed on annual subscription',
          description: 'Charged twice on my credit card on October 1st statement.',
          category: 'Billing and Payment',
          priority: 'MEDIUM'
        });
      complaint2Id = res.body.data.complaint._id;
    });

    it('should return only Customer 1 complaints when Customer 1 queries complaint list', async () => {
      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.results).toBe(1);
      expect(res.body.data.complaints[0]._id).toBe(complaint1Id);
    });

    it('should forbid Customer 1 from accessing Customer 2 complaint details (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${complaint2Id}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/forbidden/i);
    });
  });

  describe('Admin Assignment & Support Staff Workflow', () => {
    it('should allow Admin to assign complaint to support staff', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint1Id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          staffId: staffId,
          notes: 'Assigned to Suresh for field inspection'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.complaint.status).toBe('ASSIGNED');
      expect(res.body.data.complaint.assignedTo._id.toString()).toBe(staffId.toString());
      expect(res.body.data.complaint.statusHistory.length).toBeGreaterThanOrEqual(2);
    });

    it('should forbid non-admin (Customer) from assigning complaints', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint1Id}/assign`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ staffId: staffId });

      expect(res.status).toBe(403);
    });

    it('should allow assigned Support Staff to update status to IN_PROGRESS', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint1Id}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'IN_PROGRESS',
          notes: 'Dispatched line repair team to neighborhood junction box.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.complaint.status).toBe('IN_PROGRESS');
    });

    it('should allow staff to add internal note hidden from customer', async () => {
      const noteRes = await request(app)
        .post(`/api/v1/complaints/${complaint1Id}/notes`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          note: 'Fiber splicer confirmed physical cut near street pole #14.',
          isInternal: true
        });

      expect(noteRes.status).toBe(201);

      // Verify that Customer viewing complaint cannot see internal note
      const customerView = await request(app)
        .get(`/api/v1/complaints/${complaint1Id}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(customerView.status).toBe(200);
      const notes = customerView.body.data.complaint.notes;
      const internalNoteExists = notes.some((n) => n.note.includes('cut near street pole'));
      expect(internalNoteExists).toBe(false);
    });

    it('should allow staff to resolve complaint with resolution details', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint1Id}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'RESOLVED',
          resolutionDescription: 'Splice completed, optical power levels restored to -18dBm, modem verified online.',
          notes: 'Customer confirmed internet is working normally.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.complaint.status).toBe('RESOLVED');
      expect(res.body.data.complaint.resolution.description).toContain('Splice completed');
      expect(res.body.data.complaint.resolution.resolvedBy).toBeDefined();
    });

    it('should allow customer to reopen a resolved complaint', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint1Id}/status`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          status: 'OPEN',
          notes: 'Speeds are very slow after reconnection, under 2Mbps instead of 100Mbps.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.complaint.status).toBe('OPEN');
    });
  });

  describe('Admin Archival & Dashboard Analytics', () => {
    it('should provide aggregated dashboard metrics for admin and staff', async () => {
      const res = await request(app)
        .get('/api/v1/complaints/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalComplaints');
      expect(res.body.data).toHaveProperty('byStatus');
      expect(res.body.data).toHaveProperty('byPriority');
      expect(res.body.data).toHaveProperty('byCategory');
      expect(res.body.data).toHaveProperty('resolutionRate');
      expect(res.body.data.totalComplaints).toBeGreaterThanOrEqual(2);
    });

    it('should allow Admin to soft-delete / archive a complaint', async () => {
      const res = await request(app)
        .delete(`/api/v1/complaints/${complaint2Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/archived/i);

      // Verify archived complaint is excluded from default customer list
      const custList = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(custList.body.results).toBe(0);
    });
  });
});
