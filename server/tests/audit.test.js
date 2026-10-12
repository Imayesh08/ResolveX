import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { connectDB, closeDB } from '../src/config/db';
import User from '../src/models/User';
import Complaint from '../src/models/Complaint';
import AuditLog from '../src/models/AuditLog';
import { signToken } from '../src/utils/jwt';
import { sanitizeMetadata, recordAudit } from '../src/services/auditService';

describe('Audit Logs and Accountability System Tests', () => {
  let adminUser;
  let adminToken;
  let staffUser;
  let staffToken;
  let customerUser;
  let customerToken;
  let otherCustomer;
  let otherCustomerToken;
  let testComplaint;

  beforeAll(async () => {
    await connectDB();

    // Clean up test data
    await User.deleteMany({ email: /@test-audit\.local$/ });
    await AuditLog.deleteMany({});
    await Complaint.deleteMany({ title: /^\[AUDIT-TEST\]/ });

    // Seed Admin
    adminUser = await User.create({
      name: 'Audit Admin',
      email: 'admin@test-audit.local',
      password: 'Password123!',
      role: 'admin',
      department: 'Administration',
      phone: '+919876500001'
    });
    adminToken = signToken(adminUser._id, adminUser.role);

    // Seed Staff
    staffUser = await User.create({
      name: 'Audit Staff',
      email: 'staff@test-audit.local',
      password: 'Password123!',
      role: 'staff',
      department: 'Technical Support',
      phone: '+919876500002'
    });
    staffToken = signToken(staffUser._id, staffUser.role);

    // Seed Customer 1
    customerUser = await User.create({
      name: 'Audit Customer',
      email: 'customer@test-audit.local',
      password: 'Password123!',
      role: 'customer',
      phone: '+919876500003'
    });
    customerToken = signToken(customerUser._id, customerUser.role);

    // Seed Customer 2
    otherCustomer = await User.create({
      name: 'Other Customer',
      email: 'other@test-audit.local',
      password: 'Password123!',
      role: 'customer',
      phone: '+919876500004'
    });
    otherCustomerToken = signToken(otherCustomer._id, otherCustomer.role);
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-audit\.local$/ });
    await AuditLog.deleteMany({});
    await Complaint.deleteMany({ title: /^\[AUDIT-TEST\]/ });
    await closeDB();
  });

  describe('1. Model Validation and Security Sanitization', () => {
    it('should strip passwords, tokens, and sensitive secrets in sanitizeMetadata', () => {
      const raw = {
        email: 'test@example.com',
        password: 'SuperSecretPassword',
        token: 'eyJhbGciOiJIUzI1Ni...',
        apiKey: 'key_123456789',
        safeData: 'visible'
      };
      const cleaned = sanitizeMetadata(raw);
      expect(cleaned.email).toBe('test@example.com');
      expect(cleaned.safeData).toBe('visible');
      expect(cleaned.password).toBeUndefined();
      expect(cleaned.token).toBeUndefined();
      expect(cleaned.apiKey).toBeUndefined();
    });

    it('should reject audit entries with disallowed actions', async () => {
      await expect(
        AuditLog.create({
          action: 'INVALID_ACTION_NAME',
          resourceType: 'Complaint',
          description: 'Testing invalid action'
        })
      ).rejects.toThrow();
    });

    it('should reject audit entries with invalid resource types', async () => {
      await expect(
        AuditLog.create({
          action: 'COMPLAINT_CREATED',
          resourceType: 'InvalidResource',
          description: 'Testing invalid resource'
        })
      ).rejects.toThrow();
    });

    it('should reject audit entries missing description', async () => {
      await expect(
        AuditLog.create({
          action: 'COMPLAINT_CREATED',
          resourceType: 'Complaint'
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Complaint Operation Audit Triggers', () => {
    it('should record COMPLAINT_CREATED when a customer files a complaint', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: '[AUDIT-TEST] Internet connection down',
          description: 'Fiber optics line damaged during maintenance',
          category: 'Technical Issue',
          priority: 'HIGH'
        });

      expect(res.status).toBe(201);
      testComplaint = res.body.data.complaint;

      const log = await AuditLog.findOne({
        action: 'COMPLAINT_CREATED',
        resourceId: testComplaint._id.toString()
      });

      expect(log).toBeDefined();
      expect(log.actorRole).toBe('customer');
      expect(log.actor.toString()).toBe(customerUser._id.toString());
      expect(log.changes.priority).toBe('HIGH');
    });

    it('should record COMPLAINT_ASSIGNED when admin assigns complaint to staff', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${testComplaint._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          staffId: staffUser._id,
          notes: 'Assigned to senior technical staff'
        });

      expect(res.status).toBe(200);

      const log = await AuditLog.findOne({
        action: 'COMPLAINT_ASSIGNED',
        resourceId: testComplaint._id.toString()
      });

      expect(log).toBeDefined();
      expect(log.actorRole).toBe('admin');
      expect(log.changes.assignedTo.after).toBe(staffUser._id.toString());
    });

    it('should record COMPLAINT_STATUS_CHANGED when staff updates status', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${testComplaint._id}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'RESOLVED',
          resolutionDescription: 'Fiber line spliced and optical power verified'
        });

      expect(res.status).toBe(200);

      const log = await AuditLog.findOne({
        action: 'COMPLAINT_STATUS_CHANGED',
        resourceId: testComplaint._id.toString(),
        'changes.status.after': 'RESOLVED'
      });

      expect(log).toBeDefined();
      expect(log.actorRole).toBe('staff');
      expect(log.changes.status.before).toBe('ASSIGNED');
      expect(log.changes.status.after).toBe('RESOLVED');
    });

    it('should record COMPLAINT_REOPENED when customer reopens their complaint', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${testComplaint._id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          status: 'OPEN',
          notes: 'Speeds are still lower than expected'
        });

      expect(res.status).toBe(200);

      const log = await AuditLog.findOne({
        action: 'COMPLAINT_REOPENED',
        resourceId: testComplaint._id.toString()
      });

      expect(log).toBeDefined();
      expect(log.actorRole).toBe('customer');
      expect(log.changes.status.after).toBe('OPEN');
    });

    it('should record COMPLAINT_ARCHIVED when admin archives complaint', async () => {
      const res = await request(app)
        .delete(`/api/v1/complaints/${testComplaint._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const log = await AuditLog.findOne({
        action: 'COMPLAINT_ARCHIVED',
        resourceId: testComplaint._id.toString()
      });

      expect(log).toBeDefined();
      expect(log.actorRole).toBe('admin');
      expect(log.changes.isArchived.after).toBe(true);
    });
  });

  describe('3. User Management Audit Triggers', () => {
    let provisionedUser;

    it('should record USER_CREATED when admin provisions a new staff member', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Audit Provisioned Staff',
          email: 'provisioned@test-audit.local',
          password: 'Password123!',
          role: 'staff',
          department: 'Billing',
          phone: '+919876500099'
        });

      expect(res.status).toBe(201);
      provisionedUser = res.body.data.user;

      const log = await AuditLog.findOne({
        action: 'USER_CREATED',
        resourceId: provisionedUser._id.toString()
      });

      expect(log).toBeDefined();
      expect(log.actorRole).toBe('admin');
      expect(log.changes.email).toBe('provisioned@test-audit.local');
    });

    it('should record USER_ROLE_CHANGED when admin changes user role', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${provisionedUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'admin'
        });

      expect(res.status).toBe(200);

      const log = await AuditLog.findOne({
        action: 'USER_ROLE_CHANGED',
        resourceId: provisionedUser._id.toString()
      });

      expect(log).toBeDefined();
      expect(log.changes.role.before).toBe('staff');
      expect(log.changes.role.after).toBe('admin');
    });

    it('should record USER_DELETED when admin deactivates user', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${provisionedUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const log = await AuditLog.findOne({
        action: 'USER_DELETED',
        resourceId: provisionedUser._id.toString()
      });

      expect(log).toBeDefined();
      expect(log.changes.isActive.after).toBe(false);
    });
  });

  describe('4. Authentication Audit Triggers', () => {
    it('should record AUTH_LOGIN_FAILED on invalid credentials without exposing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test-audit.local',
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);

      const log = await AuditLog.findOne({
        action: 'AUTH_LOGIN_FAILED',
        'metadata.email': 'admin@test-audit.local'
      });

      expect(log).toBeDefined();
      expect(log.outcome).toBe('FAILURE');
      expect(log.metadata.password).toBeUndefined();
    });

    it('should record AUTH_LOGIN_SUCCESS on valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test-audit.local',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);

      const log = await AuditLog.findOne({
        action: 'AUTH_LOGIN_SUCCESS',
        actor: adminUser._id
      });

      expect(log).toBeDefined();
      expect(log.outcome).toBe('SUCCESS');
      expect(log.metadata.email).toBe('admin@test-audit.local');
    });
  });

  describe('5. Access Control & Endpoints', () => {
    it('should forbid non-admins from accessing system-wide audit logs', async () => {
      const customerRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(customerRes.status).toBe(403);

      const staffRes = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(staffRes.status).toBe(403);
    });

    it('should allow Admin to retrieve system-wide audit logs with filters and pagination', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.logs)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.summary).toBeDefined();
    });

    it('should allow Admin to retrieve system audit metrics', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.totalEvents).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.actionCounts)).toBe(true);
    });

    it('should allow customer to access audit trail of their own complaint', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${testComplaint._id}/audit-trail`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.auditTrail)).toBe(true);
      expect(res.body.data.auditTrail.length).toBeGreaterThan(0);
    });

    it('should deny customer from accessing audit trail of another customer complaint', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${testComplaint._id}/audit-trail`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('6. Append-Only Immutability Enforcement', () => {
    it('should reject POST, PUT, PATCH, and DELETE operations on /api/v1/audit-logs with 405', async () => {
      const postRes = await request(app)
        .post('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'COMPLAINT_CREATED' });
      expect(postRes.status).toBe(405);

      const putRes = await request(app)
        .put('/api/v1/audit-logs/fakeid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'tampering' });
      expect(putRes.status).toBe(405);

      const patchRes = await request(app)
        .patch('/api/v1/audit-logs/fakeid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'tampering' });
      expect(patchRes.status).toBe(405);

      const deleteRes = await request(app)
        .delete('/api/v1/audit-logs/fakeid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(405);
    });
  });
});
