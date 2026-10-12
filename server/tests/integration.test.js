import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Complaint from '../src/models/Complaint.js';

describe('Phase 6 End-to-End Workflow & Integration Tests (12-Step Acceptance Criteria)', () => {
  let customer1Token;
  let customer1Id;
  let customer2Token;
  let customer2Id;
  let staffToken;
  let staffId;
  let adminToken;
  let adminId;

  let activeTicketId;
  let activeTicketNumber;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: /@test-e2e\.local$/ });
    await Complaint.deleteMany({ title: /^\[E2E\]/ });

    // 1. Provision Admin
    const admin = await User.create({
      name: 'E2E Chief Admin',
      email: 'admin@test-e2e.local',
      password: 'AdminPassword123!',
      role: 'admin',
      department: 'Administration'
    });
    adminId = admin._id;
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test-e2e.local', password: 'AdminPassword123!' });
    adminToken = adminLogin.body.token;

    // 2. Provision Staff
    const staff = await User.create({
      name: 'E2E Support Engineer',
      email: 'staff@test-e2e.local',
      password: 'StaffPassword123!',
      role: 'staff',
      department: 'Technical Support'
    });
    staffId = staff._id;
    const staffLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@test-e2e.local', password: 'StaffPassword123!' });
    staffToken = staffLogin.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-e2e\.local$/ });
    await Complaint.deleteMany({ title: /^\[E2E\]/ });
  });

  // Step 4 & 5: Customer registers, logs in, and submits a complaint
  it('Step 4 & 5: Customer registers, logs in, and submits a complaint', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Ganesh Customer',
        email: 'ganesh@test-e2e.local',
        password: 'CustomerPass123!',
        phone: '9840991122'
      });

    expect(regRes.status).toBe(201);
    customer1Token = regRes.body.token;
    customer1Id = regRes.body.data.user.id;

    // Customer submits a complaint
    const complaintRes = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        title: '[E2E] Broadband fiber link LOS red indicator flashing',
        description: 'Complete optical loss of signal observed since morning thunderstorm.',
        category: 'Technical Issue',
        priority: 'HIGH'
      });

    expect(complaintRes.status).toBe(201);
    expect(complaintRes.body.data.complaint.ticketNumber).toMatch(/^RX-\d{8}-\d{4}$/);
    expect(complaintRes.body.data.complaint.status).toBe('OPEN');

    activeTicketId = complaintRes.body.data.complaint._id;
    activeTicketNumber = complaintRes.body.data.complaint.ticketNumber;
  });

  // Step 6: Verify complaint is saved in MongoDB
  it('Step 6: Verify complaint is saved and retrievable from MongoDB', async () => {
    const dbComplaint = await Complaint.findById(activeTicketId);
    expect(dbComplaint).toBeDefined();
    expect(dbComplaint.ticketNumber).toBe(activeTicketNumber);
    expect(dbComplaint.customer.toString()).toBe(customer1Id.toString());
    expect(dbComplaint.statusHistory.length).toBe(1);
  });

  // Step 7: Administrator assigns the complaint to support staff
  it('Step 7: Administrator logs in and assigns complaint to support staff', async () => {
    const assignRes = await request(app)
      .patch(`/api/v1/complaints/${activeTicketId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        staffId: staffId,
        notes: 'Assigned to Support Engineer for optical splice check'
      });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.complaint.status).toBe('ASSIGNED');
    expect(assignRes.body.data.complaint.assignedTo._id.toString()).toBe(staffId.toString());
    expect(assignRes.body.data.complaint.statusHistory.length).toBe(2);
  });

  // Step 8: Assigned staff member updates status and adds investigation note
  it('Step 8: Assigned staff updates status to IN_PROGRESS and adds internal note', async () => {
    // 1. Advance status to IN_PROGRESS
    const statusRes = await request(app)
      .patch(`/api/v1/complaints/${activeTicketId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        status: 'IN_PROGRESS',
        notes: 'Technician arriving at local telecom pillar.'
      });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.complaint.status).toBe('IN_PROGRESS');

    // 2. Add internal note
    const noteRes = await request(app)
      .post(`/api/v1/complaints/${activeTicketId}/notes`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        note: 'Pillar B-12 fuse tripped due to lightning surge.',
        isInternal: true
      });

    expect(noteRes.status).toBe(201);
  });

  // Step 9: Customer verifies updated status and verifies internal notes are hidden
  it('Step 9: Customer verifies updated status and that internal notes are hidden', async () => {
    const res = await request(app)
      .get(`/api/v1/complaints/${activeTicketId}`)
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.complaint.status).toBe('IN_PROGRESS');
    // Ensure audit history contains the progression
    expect(res.body.data.complaint.statusHistory.length).toBe(3);

    // Verify customer cannot see staff internal note
    const internalNotes = res.body.data.complaint.notes.filter((n) => n.isInternal === true);
    expect(internalNotes.length).toBe(0);
  });

  // Step 10: Staff marks complaint RESOLVED with technical details
  it('Step 10: Staff marks complaint RESOLVED with technical resolution details', async () => {
    const res = await request(app)
      .patch(`/api/v1/complaints/${activeTicketId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        status: 'RESOLVED',
        resolutionDescription: 'Replaced pillar optical surge fuse and re-calibrated receiver light level to -19dBm.',
        notes: 'Pillar circuit stabilized and verified online.'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.complaint.status).toBe('RESOLVED');
    expect(res.body.data.complaint.resolution.description).toContain('Replaced pillar optical surge fuse');
  });

  // Step 11: Unauthorized customer cannot access this complaint (403 Forbidden)
  it('Step 11: Customer 2 cannot access Customer 1 complaint (Customer isolation enforced)', async () => {
    // Register customer 2
    const cust2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Sneha Customer Two',
        email: 'sneha@test-e2e.local',
        password: 'CustomerPass123!'
      });

    customer2Token = cust2Res.body.token;

    // Customer 2 attempts to query activeTicketId
    const res = await request(app)
      .get(`/api/v1/complaints/${activeTicketId}`)
      .set('Authorization', `Bearer ${customer2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/forbidden/i);
  });

  // Step 12: Customer can reopen eligible resolved complaint
  it('Step 12: Customer can reopen resolved complaint', async () => {
    const res = await request(app)
      .patch(`/api/v1/complaints/${activeTicketId}/status`)
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        status: 'OPEN',
        notes: 'Connection dropped again within 1 hour of technician departure.'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.complaint.status).toBe('OPEN');
    expect(res.body.data.complaint.statusHistory.length).toBeGreaterThanOrEqual(5);
  });

  // Step 13: Administrator archives the complaint
  it('Step 13: Administrator can archive the complaint for soft-deletion', async () => {
    const res = await request(app)
      .delete(`/api/v1/complaints/${activeTicketId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/archived/i);

    const archivedDb = await Complaint.findById(activeTicketId);
    expect(archivedDb.isArchived).toBe(true);
  });
});
