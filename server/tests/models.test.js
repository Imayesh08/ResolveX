import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, closeDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Complaint from '../src/models/Complaint.js';

describe('Phase 2 Database & Models Integration Tests', () => {
  let testCustomer;
  let testStaff;

  beforeAll(async () => {
    // Connect to database
    await connectDB();
    // Clean up any lingering test records
    await User.deleteMany({ email: /@test-models\.local$/ });
    await Complaint.deleteMany({ title: /^\[TEST\]/ });
  });

  afterAll(async () => {
    // Teardown: Clean test documents
    await User.deleteMany({ email: /@test-models\.local$/ });
    await Complaint.deleteMany({ title: /^\[TEST\]/ });
  });

  describe('User Model Schema & Validation', () => {
    it('should create and save a new user with password hashed', async () => {
      const rawPassword = 'SecretPassword123!';
      testCustomer = await User.create({
        name: 'Aravind Swaminathan',
        email: 'aravind@test-models.local',
        password: rawPassword,
        role: 'customer',
        phone: '9876543210'
      });

      expect(testCustomer._id).toBeDefined();
      expect(testCustomer.name).toBe('Aravind Swaminathan');
      expect(testCustomer.email).toBe('aravind@test-models.local');
      expect(testCustomer.role).toBe('customer');
      // Password must be hashed with bcrypt, NOT stored in plain text
      expect(testCustomer.password).not.toBe(rawPassword);
      expect(testCustomer.password).toMatch(/^\$2[aby]\$/);

      // Verify comparePassword method
      const isMatch = await testCustomer.comparePassword(rawPassword);
      const isWrongMatch = await testCustomer.comparePassword('WrongPassword');
      expect(isMatch).toBe(true);
      expect(isWrongMatch).toBe(false);
    });

    it('should create support staff user with appropriate department', async () => {
      testStaff = await User.create({
        name: 'Priya Support',
        email: 'priya.staff@test-models.local',
        password: 'StaffPassword456!',
        role: 'staff',
        department: 'Technical Support'
      });

      expect(testStaff._id).toBeDefined();
      expect(testStaff.role).toBe('staff');
      expect(testStaff.department).toBe('Technical Support');
    });

    it('should fail validation when email format is invalid', async () => {
      await expect(
        User.create({
          name: 'Invalid Email User',
          email: 'invalid-email-without-domain',
          password: 'Password123'
        })
      ).rejects.toThrow(/valid email address/i);
    });

    it('should enforce unique constraint on email address', async () => {
      await expect(
        User.create({
          name: 'Duplicate User',
          email: 'aravind@test-models.local',
          password: 'Password123'
        })
      ).rejects.toThrow(/(E11000|duplicate key)/i);
    });
  });

  describe('Complaint Model Schema & Relationships', () => {
    let createdComplaint;

    it('should create a complaint with auto-generated ticketNumber and initial status history', async () => {
      createdComplaint = await Complaint.create({
        title: '[TEST] Broadband connection dropping intermittently',
        description: 'Connection drops every 15 minutes during peak working hours. Router reset does not resolve it.',
        category: 'Technical Issue',
        priority: 'HIGH',
        customer: testCustomer._id
      });

      expect(createdComplaint._id).toBeDefined();
      expect(createdComplaint.ticketNumber).toMatch(/^RX-\d{8}-\d{4}$/);
      expect(createdComplaint.status).toBe('OPEN');
      expect(createdComplaint.priority).toBe('HIGH');
      expect(createdComplaint.isArchived).toBe(false);

      // Verify automatic statusHistory audit record
      expect(createdComplaint.statusHistory.length).toBe(1);
      expect(createdComplaint.statusHistory[0].status).toBe('OPEN');
      expect(createdComplaint.statusHistory[0].changedBy.toString()).toBe(testCustomer._id.toString());
    });

    it('should reject invalid complaint category and priority values', async () => {
      await expect(
        Complaint.create({
          title: '[TEST] Invalid Complaint Data',
          description: 'This complaint contains unsupported category and priority.',
          category: 'Invalid Nonexistent Category',
          priority: 'SUPER_CRITICAL',
          customer: testCustomer._id
        })
      ).rejects.toThrow();
    });

    it('should correctly populate customer and staff references', async () => {
      // Assign staff to complaint
      createdComplaint.assignedTo = testStaff._id;
      createdComplaint.status = 'ASSIGNED';
      createdComplaint.statusHistory.push({
        status: 'ASSIGNED',
        changedBy: testStaff._id,
        notes: 'Assigned to Technical Support specialist'
      });
      await createdComplaint.save();

      const populated = await Complaint.findById(createdComplaint._id)
        .populate('customer', 'name email role')
        .populate('assignedTo', 'name email department');

      expect(populated.customer.name).toBe('Aravind Swaminathan');
      expect(populated.customer.email).toBe('aravind@test-models.local');
      expect(populated.assignedTo.name).toBe('Priya Support');
      expect(populated.assignedTo.department).toBe('Technical Support');
    });

    it('should append internal notes and maintain full status audit trail', async () => {
      // Add staff internal note
      createdComplaint.notes.push({
        author: testStaff._id,
        note: 'Checked line diagnostics; high SNR fluctuation observed on port 4.',
        isInternal: true
      });

      // Update status to IN_PROGRESS
      createdComplaint.status = 'IN_PROGRESS';
      createdComplaint.statusHistory.push({
        status: 'IN_PROGRESS',
        changedBy: testStaff._id,
        notes: 'Diagnostic underway with telecom field team'
      });
      await createdComplaint.save();

      const updated = await Complaint.findById(createdComplaint._id);
      expect(updated.notes.length).toBe(1);
      expect(updated.notes[0].isInternal).toBe(true);
      expect(updated.statusHistory.length).toBe(3); // OPEN -> ASSIGNED -> IN_PROGRESS
      expect(updated.statusHistory[2].status).toBe('IN_PROGRESS');
    });

    it('should support resolution details and soft deletion / archival', async () => {
      createdComplaint.status = 'RESOLVED';
      createdComplaint.resolution = {
        description: 'Port configuration refreshed and cable splice repaired.',
        resolvedAt: new Date(),
        resolvedBy: testStaff._id
      };
      createdComplaint.statusHistory.push({
        status: 'RESOLVED',
        changedBy: testStaff._id,
        notes: 'Resolved after line stabilization'
      });
      createdComplaint.isArchived = true;
      await createdComplaint.save();

      const resolved = await Complaint.findById(createdComplaint._id);
      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolution.description).toContain('Port configuration refreshed');
      expect(resolved.isArchived).toBe(true);
    });
  });
});
