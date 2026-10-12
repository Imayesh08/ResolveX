import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { connectDB, closeDB } from '../src/config/db';
import User from '../src/models/User';
import Complaint from '../src/models/Complaint';
import Notification from '../src/models/Notification';
import { signToken, verifyToken } from '../src/utils/jwt';
import { createNotification, notifyAdmins } from '../src/services/notificationService';

describe('Real-Time Notification System Integration & Security Tests', () => {
  let customerUser;
  let customerToken;
  let staffUser;
  let staffToken;
  let adminUser;
  let adminToken;
  let testComplaint;

  beforeAll(async () => {
    await connectDB();

    // Clean up any lingering test records
    await User.deleteMany({ email: /@test-notif\.local$/ });
    await Notification.deleteMany({});
    await Complaint.deleteMany({ title: /^\[NOTIF-TEST\]/ });

    // Seed test users
    adminUser = await User.create({
      name: 'Notif Admin',
      email: 'admin@test-notif.local',
      password: 'Password123!',
      role: 'admin',
      department: 'Administration',
      phone: '+919999900001'
    });
    adminToken = signToken(adminUser._id, adminUser.role);

    staffUser = await User.create({
      name: 'Notif Staff',
      email: 'staff@test-notif.local',
      password: 'Password123!',
      role: 'staff',
      department: 'Technical Support',
      phone: '+919999900002'
    });
    staffToken = signToken(staffUser._id, staffUser.role);

    customerUser = await User.create({
      name: 'Notif Customer',
      email: 'customer@test-notif.local',
      password: 'Password123!',
      role: 'customer',
      phone: '+919999900003'
    });
    customerToken = signToken(customerUser._id, customerUser.role);
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-notif\.local$/ });
    await Notification.deleteMany({
      recipient: { $in: [adminUser?._id, staffUser?._id, customerUser?._id] }
    });
    await Complaint.deleteMany({ title: /^\[NOTIF-TEST\]/ });
  });

  describe('1. Notification Model Validation', () => {
    it('should fail to save notification without required fields', async () => {
      const invalidNotif = new Notification({});
      let err;
      try {
        await invalidNotif.validate();
      } catch (error) {
        err = error;
      }
      expect(err).toBeDefined();
      expect(err.errors.recipient).toBeDefined();
      expect(err.errors.type).toBeDefined();
      expect(err.errors.title).toBeDefined();
      expect(err.errors.message).toBeDefined();
    });

    it('should reject invalid notification type enum values', async () => {
      const invalidType = new Notification({
        recipient: customerUser._id,
        type: 'INVALID_EVENT_TYPE',
        title: 'Test Title',
        message: 'Test Message'
      });
      let err;
      try {
        await invalidType.validate();
      } catch (error) {
        err = error;
      }
      expect(err).toBeDefined();
      expect(err.errors.type).toBeDefined();
    });

    it('should save a valid notification with default isRead false', async () => {
      const validNotif = await Notification.create({
        recipient: customerUser._id,
        type: 'COMPLAINT_CREATED',
        title: 'Ticket Created',
        message: 'Your ticket was registered.'
      });
      expect(validNotif._id).toBeDefined();
      expect(validNotif.isRead).toBe(false);
      expect(validNotif.createdAt).toBeDefined();
    });
  });

  describe('2. Authenticated Notification API Endpoints', () => {
    let customerNotif1;
    let customerNotif2;
    let staffNotif;

    beforeAll(async () => {
      customerNotif1 = await Notification.create({
        recipient: customerUser._id,
        type: 'COMPLAINT_CREATED',
        title: 'Customer Ticket 1',
        message: 'First notification message',
        isRead: false
      });

      customerNotif2 = await Notification.create({
        recipient: customerUser._id,
        type: 'STATUS_CHANGED',
        title: 'Customer Ticket 2',
        message: 'Second notification message',
        isRead: false
      });

      staffNotif = await Notification.create({
        recipient: staffUser._id,
        type: 'COMPLAINT_ASSIGNED',
        title: 'Staff Assignment',
        message: 'Staff assignment message',
        isRead: false
      });
    });

    it('should reject unauthenticated request to /api/v1/notifications with 401', async () => {
      const res = await request(app).get('/api/v1/notifications');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
    });

    it('GET /api/v1/notifications should return only recipient-owned notifications', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.notifications)).toBe(true);

      // Verify strict recipient scoping: none belonging to staffUser
      const notifIds = res.body.data.notifications.map((n) => n._id);
      expect(notifIds).toContain(customerNotif1._id.toString());
      expect(notifIds).toContain(customerNotif2._id.toString());
      expect(notifIds).not.toContain(staffNotif._id.toString());
    });

    it('GET /api/v1/notifications/unread-count should return accurate unread count', async () => {
      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(2);
    });

    it('PATCH /api/v1/notifications/:id/read should mark notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${customerNotif1._id}/read`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.notification.isRead).toBe(true);
      expect(res.body.data.notification.readAt).toBeDefined();

      // Verify persisted state in MongoDB
      const updated = await Notification.findById(customerNotif1._id);
      expect(updated.isRead).toBe(true);
    });

    it('PATCH /api/v1/notifications/:id/read should prevent user from modifying other user notification (403)', async () => {
      // Customer tries to mark staff's notification as read
      const res = await request(app)
        .patch(`/api/v1/notifications/${staffNotif._id}/read`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/cannot modify another user's notification/i);
    });

    it('PATCH /api/v1/notifications/read-all should mark all user unread notifications as read', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Verify unread count is now 0
      const countRes = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(countRes.body.data.unreadCount).toBe(0);
    });

    it('DELETE /api/v1/notifications/:id should prevent deleting other user notification (403)', async () => {
      const res = await request(app)
        .delete(`/api/v1/notifications/${staffNotif._id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('fail');
    });

    it('DELETE /api/v1/notifications/:id should delete owned notification', async () => {
      const res = await request(app)
        .delete(`/api/v1/notifications/${customerNotif1._id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      const deleted = await Notification.findById(customerNotif1._id);
      expect(deleted).toBeNull();
    });
  });

  describe('3. Workflow Triggered Notifications (Complaint Creation, Assignment, Status Updates)', () => {
    it('creating complaint should generate notifications for customer and administrators', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: '[NOTIF-TEST] Wi-Fi Connection Latency Issue',
          description: 'Experiencing elevated latency during peak morning hours on lab router.',
          category: 'Technical Issue',
          priority: 'HIGH'
        });

      expect(res.status).toBe(201);
      testComplaint = res.body.data.complaint;

      // Check customer confirmation notification
      const customerNotif = await Notification.findOne({
        recipient: customerUser._id,
        complaint: testComplaint._id,
        type: 'COMPLAINT_CREATED'
      });
      expect(customerNotif).toBeDefined();
      expect(customerNotif.title).toMatch(/Complaint Logged/i);

      // Check admin alert notification
      const adminNotif = await Notification.findOne({
        recipient: adminUser._id,
        complaint: testComplaint._id,
        type: 'COMPLAINT_CREATED'
      });
      expect(adminNotif).toBeDefined();
      expect(adminNotif.title).toMatch(/New Complaint/i);
    });

    it('assigning complaint should generate notifications for assigned staff and customer', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${testComplaint._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          staffId: staffUser._id,
          notes: 'Assigned to senior network engineer'
        });

      expect(res.status).toBe(200);

      // Verify staff notification
      const staffNotif = await Notification.findOne({
        recipient: staffUser._id,
        complaint: testComplaint._id,
        type: 'COMPLAINT_ASSIGNED'
      });
      expect(staffNotif).toBeDefined();
      expect(staffNotif.title).toMatch(/New Complaint Assignment/i);

      // Verify customer notification
      const custNotif = await Notification.findOne({
        recipient: customerUser._id,
        complaint: testComplaint._id,
        type: 'COMPLAINT_ASSIGNED'
      });
      expect(custNotif).toBeDefined();
      expect(custNotif.message).toMatch(new RegExp(staffUser.name, 'i'));
    });

    it('updating complaint status to IN_PROGRESS should notify customer', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${testComplaint._id}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'IN_PROGRESS',
          notes: 'Commenced packet loss diagnostics'
        });

      expect(res.status).toBe(200);

      const custNotif = await Notification.findOne({
        recipient: customerUser._id,
        complaint: testComplaint._id,
        type: 'STATUS_CHANGED',
        message: /IN_PROGRESS/
      });
      expect(custNotif).toBeDefined();
    });

    it('resolving complaint should notify customer with resolved status', async () => {
      const res = await request(app)
        .patch(`/api/v1/complaints/${testComplaint._id}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'RESOLVED',
          resolutionDescription: 'Replaced SFP fiber transceiver module on switch.'
        });

      expect(res.status).toBe(200);

      const custNotif = await Notification.findOne({
        recipient: customerUser._id,
        complaint: testComplaint._id,
        type: 'STATUS_CHANGED',
        title: /Complaint Resolved/i
      });
      expect(custNotif).toBeDefined();
    });

    it('customer adding public note should notify assigned staff', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${testComplaint._id}/notes`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          note: 'Thank you, speed has been restored to normal levels.'
        });

      expect(res.status).toBe(201);

      const staffNotif = await Notification.findOne({
        recipient: staffUser._id,
        complaint: testComplaint._id,
        type: 'NEW_RESPONSE'
      });
      expect(staffNotif).toBeDefined();
    });
  });
});
