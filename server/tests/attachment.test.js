import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import app from '../src/app';
import { connectDB, closeDB } from '../src/config/db';
import User from '../src/models/User';
import Complaint from '../src/models/Complaint';
import AuditLog from '../src/models/AuditLog';
import { signToken } from '../src/utils/jwt';
import { deleteFile } from '../src/services/storageService';

describe('Complaint Evidence and Attachments Subsystem Tests', () => {
  let customerUser;
  let customerToken;
  let otherCustomer;
  let otherCustomerToken;
  let staffUser;
  let staffToken;
  let adminUser;
  let adminToken;
  let testComplaint;

  // Pre-fabricated valid binary file buffers
  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const validPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const validWebpBuffer = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from('WEBP'),
    Buffer.from('VP8 ')
  ]);
  const validTxtBuffer = Buffer.from('Error trace log output:\nConnection timed out at port 443\nStatus: 504 Gateway Timeout\n');

  beforeAll(async () => {
    await connectDB();

    // Clean up test data
    await User.deleteMany({ email: /@test-attach\.local$/ });
    await Complaint.deleteMany({ title: /^\[ATTACH-TEST\]/ });
    await AuditLog.deleteMany({ action: /^ATTACHMENT_/ });

    // Seed Admin
    adminUser = await User.create({
      name: 'Attach Admin',
      email: 'admin@test-attach.local',
      password: 'Password123!',
      role: 'admin',
      department: 'Administration',
      phone: '+919999000011'
    });
    adminToken = signToken(adminUser._id, adminUser.role);

    // Seed Staff
    staffUser = await User.create({
      name: 'Attach Staff',
      email: 'staff@test-attach.local',
      password: 'Password123!',
      role: 'staff',
      department: 'Technical Support',
      phone: '+919999000012'
    });
    staffToken = signToken(staffUser._id, staffUser.role);

    // Seed Customer 1 (Owner)
    customerUser = await User.create({
      name: 'Attach Customer',
      email: 'customer@test-attach.local',
      password: 'Password123!',
      role: 'customer',
      phone: '+919999000013'
    });
    customerToken = signToken(customerUser._id, customerUser.role);

    // Seed Customer 2 (Other)
    otherCustomer = await User.create({
      name: 'Other Customer',
      email: 'other@test-attach.local',
      password: 'Password123!',
      role: 'customer',
      phone: '+919999000014'
    });
    otherCustomerToken = signToken(otherCustomer._id, otherCustomer.role);

    // Seed base complaint
    testComplaint = await Complaint.create({
      title: '[ATTACH-TEST] Hardware failure on server node',
      description: 'Photos and diagnostic log files attached for hardware investigation',
      category: 'Technical Issue',
      priority: 'HIGH',
      status: 'OPEN',
      customer: customerUser._id
    });
  });

  afterAll(async () => {
    // Clean up files created during test
    if (testComplaint) {
      const cmp = await Complaint.findById(testComplaint._id).select('+attachments.storageKey');
      if (cmp && cmp.attachments) {
        for (const a of cmp.attachments) {
          if (a.storageKey) await deleteFile(a.storageKey).catch(() => {});
        }
      }
    }
    await User.deleteMany({ email: /@test-attach\.local$/ });
    await Complaint.deleteMany({ title: /^\[ATTACH-TEST\]/ });
    await AuditLog.deleteMany({ action: /^ATTACHMENT_/ });
    await closeDB();
  });

  describe('1. File Type, Magic Number & Security Validation', () => {
    it('should reject unsupported file extensions (e.g. .exe, .sh, .zip)', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${testComplaint._id}/attachments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .attach('files', Buffer.from('malicious payload'), 'exploit.exe');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Unsupported file extension/i);
    });

    it('should reject file extension vs magic number signature mismatch (e.g. PDF named as PNG)', async () => {
      // Named screenshot.png but containing ASCII / PDF content
      const fakePng = Buffer.from('This is not a real PNG image file header.');
      const res = await request(app)
        .post(`/api/v1/complaints/${testComplaint._id}/attachments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .attach('files', fakePng, 'screenshot.png');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/File signature mismatch/i);
    });

    it('should reject zero-byte empty files', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${testComplaint._id}/attachments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .attach('files', Buffer.alloc(0), 'empty.jpg');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/empty|zero-byte/i);
    });

    it('should reject oversized files (> 5 MB)', async () => {
      // 5.5 MB buffer
      const oversized = Buffer.alloc(5.5 * 1024 * 1024, 0x41);
      const res = await request(app)
        .post(`/api/v1/complaints/${testComplaint._id}/attachments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .attach('files', oversized, 'huge.pdf');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/exceeds/i);
    });
  });

  describe('2. Valid Uploads & Storage Abstraction', () => {
    let uploadedAttachmentId;

    it('should accept valid PNG and PDF files and record audit log', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${testComplaint._id}/attachments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .field('description', 'Screenshot of error and invoice receipt')
        .attach('files', validPngBuffer, 'screenshot_error.png')
        .attach('files', validPdfBuffer, 'invoice_receipt.pdf');

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.attachments).toBeDefined();
      expect(res.body.data.attachments.length).toBe(2);

      const first = res.body.data.attachments[0];
      uploadedAttachmentId = first._id;

      expect(first.originalName).toBe('screenshot_error.png');
      expect(first.mimeType).toBe('image/png');
      expect(first.size).toBe(validPngBuffer.length);
      expect(first.checksum).toBeDefined();
      // Crucial security requirement: storageKey must never be exposed
      expect(first.storageKey).toBeUndefined();

      // Verify audit log
      const log = await AuditLog.findOne({
        action: 'ATTACHMENT_UPLOADED',
        resourceId: testComplaint._id.toString()
      });
      expect(log).toBeDefined();
      expect(log.actorRole).toBe('customer');
    });

    it('should accept valid WebP and diagnostic text log files', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${testComplaint._id}/attachments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .attach('files', validWebpBuffer, 'diagram.webp')
        .attach('files', validTxtBuffer, 'system_error.log');

      expect(res.status).toBe(201);
      expect(res.body.data.attachments.length).toBe(2);
    });

    it('should reject uploads exceeding the maximum 5 attachments limit', async () => {
      // Currently has 4 attachments (2 + 2), attempting to add 2 more should exceed 5
      const res = await request(app)
        .post(`/api/v1/complaints/${testComplaint._id}/attachments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .attach('files', validJpegBuffer, 'one.jpg')
        .attach('files', validJpegBuffer, 'two.jpg');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Maximum attachment limit exceeded/i);
    });
  });

  describe('3. Access Control & Authorization Enforcement', () => {
    let targetAttachmentId;

    beforeAll(async () => {
      const cmp = await Complaint.findById(testComplaint._id);
      targetAttachmentId = cmp.attachments[0]._id.toString();
    });

    it('should reject unauthenticated access', async () => {
      const res = await request(app).get(`/api/v1/complaints/${testComplaint._id}/attachments`);
      expect(res.status).toBe(401);
    });

    it('should allow complaint owner to list attachment metadata', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${testComplaint._id}/attachments`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.attachments)).toBe(true);
      // Ensure private keys are never returned
      res.body.data.attachments.forEach((a) => {
        expect(a.storageKey).toBeUndefined();
      });
    });

    it('should deny other customer from viewing or downloading attachments (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${testComplaint._id}/attachments/${targetAttachmentId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(403);

      // Verify audit log recorded denied access
      const log = await AuditLog.findOne({
        action: 'ATTACHMENT_ACCESS_DENIED',
        actor: otherCustomer._id
      });
      expect(log).toBeDefined();
    });

    it('should deny other customer from uploading attachments to foreign complaints (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${testComplaint._id}/attachments`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .attach('files', validJpegBuffer, 'intruder.jpg');

      expect(res.status).toBe(403);
    });

    it('should allow assigned staff and administrators to stream and download attachments', async () => {
      // Assign staff to this complaint
      testComplaint.assignedTo = staffUser._id;
      await testComplaint.save();

      // Staff download
      const staffRes = await request(app)
        .get(`/api/v1/complaints/${testComplaint._id}/attachments/${targetAttachmentId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(staffRes.status).toBe(200);
      expect(staffRes.headers['x-content-type-options']).toBe('nosniff');
      expect(staffRes.headers['content-type']).toBe('image/png');

      // Admin download with forced download parameter
      const adminRes = await request(app)
        .get(`/api/v1/complaints/${testComplaint._id}/attachments/${targetAttachmentId}?download=true`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.headers['content-disposition']).toMatch(/^attachment;/);
    });
  });

  describe('4. Lifecycle Retention & Deletion Rules', () => {
    let attachmentToDeleteId;

    beforeAll(async () => {
      // Add a fresh single attachment for deletion test
      testComplaint.status = 'OPEN';
      await testComplaint.save();

      const cmp = await Complaint.findById(testComplaint._id);
      attachmentToDeleteId = cmp.attachments[0]._id.toString();
    });

    it('should forbid support staff from deleting customer evidence', async () => {
      const res = await request(app)
        .delete(`/api/v1/complaints/${testComplaint._id}/attachments/${attachmentToDeleteId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/cannot delete/i);
    });

    it('should prevent customer from deleting attachments once complaint is no longer OPEN', async () => {
      // Advance status to IN_PROGRESS
      testComplaint.status = 'IN_PROGRESS';
      await testComplaint.save();

      const res = await request(app)
        .delete(`/api/v1/complaints/${testComplaint._id}/attachments/${attachmentToDeleteId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/locked and cannot be deleted/i);
    });

    it('should allow customer to delete their attachment when complaint is OPEN', async () => {
      // Revert status to OPEN
      testComplaint.status = 'OPEN';
      await testComplaint.save();

      const res = await request(app)
        .delete(`/api/v1/complaints/${testComplaint._id}/attachments/${attachmentToDeleteId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Verify deletion in AuditLog
      const log = await AuditLog.findOne({
        action: 'ATTACHMENT_DELETED',
        resourceId: testComplaint._id.toString()
      });
      expect(log).toBeDefined();
    });

    it('should allow administrator to delete an attachment under administrative retention', async () => {
      const cmp = await Complaint.findById(testComplaint._id);
      const remainingId = cmp.attachments[0]._id.toString();

      const res = await request(app)
        .delete(`/api/v1/complaints/${testComplaint._id}/attachments/${remainingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should return 404 when deleting a non-existent attachment ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/complaints/${testComplaint._id}/attachments/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
