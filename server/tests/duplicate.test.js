import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { connectDB, closeDB } from '../src/config/db';
import User from '../src/models/User';
import Complaint from '../src/models/Complaint';
import AuditLog from '../src/models/AuditLog';
import { signToken } from '../src/utils/jwt';
import {
  normalizeAndTokenize,
  computeTF,
  buildIDF,
  calculateCosineSimilarity,
  evaluateComplaintSimilarity,
  findDuplicates,
  DEFAULT_CONFIG
} from '../src/services/duplicateDetectionService';

describe('Duplicate Complaint Detection & Management Tests', () => {
  let customerA;
  let tokenA;
  let customerB;
  let tokenB;
  let staffUser;
  let staffToken;
  let adminUser;
  let adminToken;
  let baseComplaint;
  let similarComplaint;

  beforeAll(async () => {
    await connectDB();

    // Clean up any test records
    await User.deleteMany({ email: /@test-dup\.local$/ });
    await Complaint.deleteMany({ title: /^\[DUP-TEST\]/ });
    await AuditLog.deleteMany({ action: /^COMPLAINT_DUPLICATE_/ });

    // Seed test users
    adminUser = await User.create({
      name: 'Dup Admin',
      email: 'admin@test-dup.local',
      password: 'Password123!',
      role: 'admin',
      department: 'Administration',
      phone: '+919999111222'
    });
    adminToken = signToken(adminUser._id, adminUser.role);

    staffUser = await User.create({
      name: 'Dup Staff',
      email: 'staff@test-dup.local',
      password: 'Password123!',
      role: 'staff',
      department: 'Technical Support',
      phone: '+919999111333'
    });
    staffToken = signToken(staffUser._id, staffUser.role);

    customerA = await User.create({
      name: 'Dup Customer A',
      email: 'customera@test-dup.local',
      password: 'Password123!',
      role: 'customer',
      department: 'General',
      phone: '+919999111444'
    });
    tokenA = signToken(customerA._id, customerA.role);

    customerB = await User.create({
      name: 'Dup Customer B',
      email: 'customerb@test-dup.local',
      password: 'Password123!',
      role: 'customer',
      department: 'General',
      phone: '+919999111555'
    });
    tokenB = signToken(customerB._id, customerB.role);

    // Seed existing base complaint owned by Customer A
    baseComplaint = await Complaint.create({
      title: '[DUP-TEST] Payment debited but order confirmation failed',
      description: 'My bank account was charged 1500 rupees but the system threw an error and the order was not placed.',
      category: 'Billing and Payment',
      priority: 'HIGH',
      status: 'OPEN',
      customer: customerA._id
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-dup\.local$/ });
    await Complaint.deleteMany({ title: /^\[DUP-TEST\]/ });
    await AuditLog.deleteMany({ action: /^COMPLAINT_DUPLICATE_/ });
    await closeDB();
  });

  // ==========================================
  // 1. UNIT TESTS: ALGORITHM & SIMILARITY
  // ==========================================
  describe('Unit Tests: Normalization and Similarity Calculation', () => {
    it('normalizes text and strips stop words while preserving keywords and numbers', () => {
      const text = 'The payment for order #RX-9942 was deducted from my account on 2026-10-12!';
      const tokens = normalizeAndTokenize(text);

      expect(tokens).toContain('payment');
      expect(tokens).toContain('order');
      expect(tokens).toContain('rx-9942');
      expect(tokens).toContain('debit');
      expect(tokens).toContain('account');
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('for');
      expect(tokens).not.toContain('was');
      expect(tokens).not.toContain('from');
      expect(tokens).not.toContain('my');
      expect(tokens).not.toContain('on');
    });

    it('safely handles empty, null, or undefined text', () => {
      expect(normalizeAndTokenize('')).toEqual([]);
      expect(normalizeAndTokenize(null)).toEqual([]);
      expect(normalizeAndTokenize(undefined)).toEqual([]);
      expect(normalizeAndTokenize('    ')).toEqual([]);
    });

    it('calculates high similarity for similar problem statements', () => {
      const q = {
        title: 'Payment debited but order not confirmed',
        description: 'Bank account was charged but order is not placed in system.',
        category: 'Billing and Payment'
      };
      const candidate = {
        title: 'Payment deducted from account but order failed',
        description: 'Account was charged money but order not confirmed.',
        category: 'Billing and Payment',
        createdAt: new Date()
      };

      const titleIdf = buildIDF([
        normalizeAndTokenize(q.title),
        normalizeAndTokenize(candidate.title)
      ]);
      const descIdf = buildIDF([
        normalizeAndTokenize(q.description),
        normalizeAndTokenize(candidate.description)
      ]);

      const evalResult = evaluateComplaintSimilarity(q, candidate, titleIdf, descIdf);
      expect(evalResult.score).toBeGreaterThanOrEqual(0.55);
      expect(evalResult.categoryMatch).toBe(true);
      expect(evalResult.matchedTerms.length).toBeGreaterThan(0);
    });

    it('calculates low similarity for unrelated complaints', () => {
      const q = {
        title: 'Payment debited but order not confirmed',
        description: 'Bank account was charged but order is not placed.',
        category: 'Billing and Payment'
      };
      const candidate = {
        title: 'Courier delivery package was torn and damaged',
        description: 'The physical shipment box was crushed upon delivery.',
        category: 'Delivery',
        createdAt: new Date()
      };

      const titleIdf = buildIDF([
        normalizeAndTokenize(q.title),
        normalizeAndTokenize(candidate.title)
      ]);
      const descIdf = buildIDF([
        normalizeAndTokenize(q.description),
        normalizeAndTokenize(candidate.description)
      ]);

      const evalResult = evaluateComplaintSimilarity(q, candidate, titleIdf, descIdf);
      expect(evalResult.score).toBeLessThan(0.4);
    });

    it('penalizes similarity when complaints belong to incompatible categories', () => {
      const q = {
        title: 'Login authentication failure on web portal',
        description: 'System throws error code 500 when logging in.',
        category: 'Account Access'
      };
      const candidateMatchingCat = {
        title: 'Login authentication error on portal',
        description: 'System throws error 500 when logging in.',
        category: 'Account Access',
        createdAt: new Date()
      };
      const candidateMismatchCat = {
        title: 'Login authentication error on portal',
        description: 'System throws error 500 when logging in.',
        category: 'Delivery', // Mismatched category
        createdAt: new Date()
      };

      const allTitles = [
        normalizeAndTokenize(q.title),
        normalizeAndTokenize(candidateMatchingCat.title)
      ];
      const allDescs = [
        normalizeAndTokenize(q.description),
        normalizeAndTokenize(candidateMatchingCat.description)
      ];
      const titleIdf = buildIDF(allTitles);
      const descIdf = buildIDF(allDescs);

      const scoreMatching = evaluateComplaintSimilarity(q, candidateMatchingCat, titleIdf, descIdf).score;
      const scoreMismatched = evaluateComplaintSimilarity(q, candidateMismatchCat, titleIdf, descIdf).score;

      expect(scoreMismatched).toBeLessThan(scoreMatching);
    });

    it('prevents false positives from generic words alone', () => {
      const q = {
        title: 'Please help me with this problem',
        description: 'I need some help please thank you very much.',
        category: 'Other'
      };
      const candidate = {
        title: 'Please help me with this issue',
        description: 'Thank you for your help and support.',
        category: 'Other',
        createdAt: new Date()
      };

      const allTitles = [normalizeAndTokenize(q.title), normalizeAndTokenize(candidate.title)];
      const allDescs = [normalizeAndTokenize(q.description), normalizeAndTokenize(candidate.description)];
      const titleIdf = buildIDF(allTitles);
      const descIdf = buildIDF(allDescs);

      const evalResult = evaluateComplaintSimilarity(q, candidate, titleIdf, descIdf);
      // Because generic words were stripped as stop words, score should stay safely low
      expect(evalResult.score).toBeLessThan(0.4);
    });
  });

  // ==========================================
  // 2. API TESTS: CHECK DUPLICATES ENDPOINT
  // ==========================================
  describe('API Tests: POST /api/v1/complaints/check-duplicates', () => {
    it('requires authentication to check for duplicates', async () => {
      const res = await request(app)
        .post('/api/v1/complaints/check-duplicates')
        .send({
          title: '[DUP-TEST] Payment debited from card',
          description: 'Amount debited but order failed.',
          category: 'Billing and Payment'
        });

      expect(res.status).toBe(401);
    });

    it('validates input length and rejects malformed request', async () => {
      const res = await request(app)
        .post('/api/v1/complaints/check-duplicates')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Hi', // Too short (< 5 chars)
          category: 'Billing and Payment'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Title is required/i);
    });

    it('returns potential matches for similar complaint input', async () => {
      const res = await request(app)
        .post('/api/v1/complaints/check-duplicates')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: '[DUP-TEST] Payment debited but order confirmation failed',
          description: 'Bank was charged 1500 rupees but order was not placed.',
          category: 'Billing and Payment'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.matches).toBeDefined();
      expect(Array.isArray(res.body.data.matches)).toBe(true);

      const found = res.body.data.matches.find(
        (m) => m.ticketNumber === baseComplaint.ticketNumber
      );
      expect(found).toBeDefined();
      expect(found.similarityScore).toBeGreaterThanOrEqual(0.55);
      expect(found.canView).toBe(true); // Customer A owns baseComplaint
    });

    it('enforces privacy: does not leak full private details to another customer', async () => {
      // Customer B checks duplicate against Customer A's baseComplaint
      const res = await request(app)
        .post('/api/v1/complaints/check-duplicates')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          title: '[DUP-TEST] Payment debited but order confirmation failed',
          description: 'Bank was charged money but order failed.',
          category: 'Billing and Payment'
        });

      expect(res.status).toBe(200);
      const found = res.body.data.matches.find(
        (m) => m.ticketNumber === baseComplaint.ticketNumber
      );
      expect(found).toBeDefined();
      expect(found.canView).toBe(false); // Customer B cannot inspect Customer A's complaint
      expect(found.complaintId).toBeUndefined(); // ID withheld to prevent enumeration
      expect(found).not.toHaveProperty('customer');
      expect(found).not.toHaveProperty('notes');
    });

    it('excludes specified complaint when excludeComplaintId is provided', async () => {
      const res = await request(app)
        .post('/api/v1/complaints/check-duplicates')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: '[DUP-TEST] Payment debited but order confirmation failed',
          description: 'Bank was charged 1500 rupees but order was not placed.',
          category: 'Billing and Payment',
          excludeComplaintId: baseComplaint._id.toString()
        });

      expect(res.status).toBe(200);
      const found = res.body.data.matches.find(
        (m) => m.ticketNumber === baseComplaint.ticketNumber
      );
      expect(found).toBeUndefined();
    });
  });

  // ==========================================
  // 3. RELATIONSHIP TESTS: MARK & UNMARK DUPLICATE
  // ==========================================
  describe('Relationship Tests: Link and Unlink Confirmed Duplicates', () => {
    beforeAll(async () => {
      // Create a second complaint to serve as duplicate
      similarComplaint = await Complaint.create({
        title: '[DUP-TEST] Second ticket regarding debited payment',
        description: 'Repeating my previous issue: money was charged from bank but no order placed.',
        category: 'Billing and Payment',
        priority: 'MEDIUM',
        status: 'OPEN',
        customer: customerA._id
      });
    });

    it('rejects duplicate linking by unauthorized customer', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${similarComplaint._id}/mark-duplicate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          primaryComplaintId: baseComplaint._id.toString(),
          reason: 'Customer trying to self-link'
        });

      expect(res.status).toBe(403);
    });

    it('rejects self-linking of a complaint to itself', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${baseComplaint._id}/mark-duplicate`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          primaryComplaintId: baseComplaint._id.toString(),
          reason: 'Linking to self'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be marked as a duplicate of itself/i);
    });

    it('allows support staff to confirm and link a duplicate', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${similarComplaint._id}/mark-duplicate`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          primaryComplaintId: baseComplaint._id.toString(),
          reason: 'Identical payment failure reported multiple times'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.complaint.isDuplicate).toBe(true);
      expect(res.body.data.complaint.duplicateOf._id.toString()).toBe(baseComplaint._id.toString());
      expect(res.body.data.complaint.duplicateReason).toBe('Identical payment failure reported multiple times');

      // Verify audit log entry was created
      const auditLog = await AuditLog.findOne({
        action: 'COMPLAINT_DUPLICATE_LINKED',
        resourceId: similarComplaint._id.toString()
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.actorRole).toBe('staff');
    });

    it('prevents redundant duplicate linking', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${similarComplaint._id}/mark-duplicate`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          primaryComplaintId: baseComplaint._id.toString(),
          reason: 'Trying to link again'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already confirmed as a duplicate/i);
    });

    it('prevents circular relationships (linking to a ticket that is already a duplicate)', async () => {
      const thirdComplaint = await Complaint.create({
        title: '[DUP-TEST] Third payment issue complaint',
        description: 'Third complaint regarding the same payment issue.',
        category: 'Billing and Payment',
        customer: customerA._id
      });

      // Attempting to link thirdComplaint to similarComplaint (which is already a duplicate)
      const res = await request(app)
        .post(`/api/v1/complaints/${thirdComplaint._id}/mark-duplicate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          primaryComplaintId: similarComplaint._id.toString(),
          reason: 'Creating a chain'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already marked as a duplicate/i);
    });

    it('allows authorized staff to remove a duplicate relationship', async () => {
      const res = await request(app)
        .delete(`/api/v1/complaints/${similarComplaint._id}/mark-duplicate`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.complaint.isDuplicate).toBe(false);
      expect(res.body.data.complaint.duplicateOf).toBeNull();

      // Verify audit log entry
      const auditLog = await AuditLog.findOne({
        action: 'COMPLAINT_DUPLICATE_UNLINKED',
        resourceId: similarComplaint._id.toString()
      });
      expect(auditLog).toBeDefined();
    });
  });

  // ==========================================
  // 4. ADMIN ANALYTICS TESTS
  // ==========================================
  describe('Admin Analytics: GET /api/v1/complaints/stats/duplicates', () => {
    it('restricts duplicate analytics to administrators', async () => {
      const resStaff = await request(app)
        .get('/api/v1/complaints/stats/duplicates')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(resStaff.status).toBe(403);

      const resCustomer = await request(app)
        .get('/api/v1/complaints/stats/duplicates')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resCustomer.status).toBe(403);
    });

    it('returns database-derived duplicate telemetry to administrators', async () => {
      // Re-link similarComplaint so we have at least 1 duplicate
      await request(app)
        .post(`/api/v1/complaints/${similarComplaint._id}/mark-duplicate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          primaryComplaintId: baseComplaint._id.toString(),
          reason: 'Confirmed duplicate for analytics test'
        });

      const res = await request(app)
        .get('/api/v1/complaints/stats/duplicates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.totalDuplicates).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.data.duplicateRate).toBe('number');
      expect(Array.isArray(res.body.data.duplicatesByCategory)).toBe(true);
      expect(Array.isArray(res.body.data.duplicatesByMonth)).toBe(true);
    });
  });
});
