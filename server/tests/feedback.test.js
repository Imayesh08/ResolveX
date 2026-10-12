import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import { connectDB, closeDB } from '../src/config/db';
import User from '../src/models/User';
import Complaint from '../src/models/Complaint';
import Feedback from '../src/models/Feedback';
import { signToken } from '../src/utils/jwt';

describe('Customer Feedback and CSAT Ratings Integration & Security Tests', () => {
  let customerUser1;
  let customerToken1;
  let customerUser2;
  let customerToken2;
  let staffUser;
  let staffToken;
  let adminUser;
  let adminToken;

  let resolvedComplaint;
  let openComplaint;

  beforeAll(async () => {
    await connectDB();

    // Clean up test collections
    await User.deleteMany({ email: /@test-feedback\.local$/ });
    await Feedback.deleteMany({});
    await Complaint.deleteMany({ title: /^\[FB-TEST\]/ });

    // Seed test users
    adminUser = await User.create({
      name: 'Feedback Admin',
      email: 'admin@test-feedback.local',
      password: 'Password123!',
      role: 'admin',
      department: 'Administration',
      phone: '+919999900010'
    });
    adminToken = signToken(adminUser._id, adminUser.role);

    staffUser = await User.create({
      name: 'Feedback Staff',
      email: 'staff@test-feedback.local',
      password: 'Password123!',
      role: 'staff',
      department: 'Technical Support',
      phone: '+919999900020'
    });
    staffToken = signToken(staffUser._id, staffUser.role);

    customerUser1 = await User.create({
      name: 'Feedback Customer One',
      email: 'customer1@test-feedback.local',
      password: 'Password123!',
      role: 'customer',
      phone: '+919999900030'
    });
    customerToken1 = signToken(customerUser1._id, customerUser1.role);

    customerUser2 = await User.create({
      name: 'Feedback Customer Two',
      email: 'customer2@test-feedback.local',
      password: 'Password123!',
      role: 'customer',
      phone: '+919999900040'
    });
    customerToken2 = signToken(customerUser2._id, customerUser2.role);

    // Create test complaints
    resolvedComplaint = await Complaint.create({
      title: '[FB-TEST] Resolved Server Downtime Issue',
      description: 'Production cluster resumed operational baseline after restart.',
      category: 'Technical Issue',
      priority: 'HIGH',
      status: 'RESOLVED',
      customer: customerUser1._id,
      assignedTo: staffUser._id,
      resolution: {
        description: 'Completed failover recovery.',
        resolvedAt: new Date(),
        resolvedBy: staffUser._id
      }
    });

    openComplaint = await Complaint.create({
      title: '[FB-TEST] Open Billing Discrepancy',
      description: 'Incorrect monthly tier charged on renewal invoice.',
      category: 'Billing and Payment',
      priority: 'MEDIUM',
      status: 'OPEN',
      customer: customerUser1._id
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-feedback\.local$/ });
    await Feedback.deleteMany({});
    await Complaint.deleteMany({ title: /^\[FB-TEST\]/ });
  });

  describe('1. Model and Rating Input Validation', () => {
    it('should reject feedback without a rating', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${resolvedComplaint._id}/feedback`)
        .set('Authorization', `Bearer ${customerToken1}`)
        .send({ comment: 'Great job!' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Rating must be an integer between 1 and 5/i);
    });

    it('should reject ratings outside the 1 to 5 integer range', async () => {
      // Test rating 0
      const resZero = await request(app)
        .post(`/api/v1/complaints/${resolvedComplaint._id}/feedback`)
        .set('Authorization', `Bearer ${customerToken1}`)
        .send({ rating: 0 });
      expect(resZero.status).toBe(400);

      // Test rating 6
      const resSix = await request(app)
        .post(`/api/v1/complaints/${resolvedComplaint._id}/feedback`)
        .set('Authorization', `Bearer ${customerToken1}`)
        .send({ rating: 6 });
      expect(resSix.status).toBe(400);

      // Test decimal rating 4.5
      const resDecimal = await request(app)
        .post(`/api/v1/complaints/${resolvedComplaint._id}/feedback`)
        .set('Authorization', `Bearer ${customerToken1}`)
        .send({ rating: 4.5 });
      expect(resDecimal.status).toBe(400);
    });
  });

  describe('2. Complaint State and Authorization Safeguards', () => {
    it('should reject feedback submission for an OPEN complaint (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${openComplaint._id}/feedback`)
        .set('Authorization', `Bearer ${customerToken1}`)
        .send({ rating: 5, comment: 'Premature feedback' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/only be submitted for resolved complaints/i);
    });

    it('should prevent unauthorized customer from submitting feedback for another user complaint (403)', async () => {
      // Customer 2 attempts to submit feedback for Customer 1's resolved complaint
      const res = await request(app)
        .post(`/api/v1/complaints/${resolvedComplaint._id}/feedback`)
        .set('Authorization', `Bearer ${customerToken2}`)
        .send({ rating: 5, comment: 'Impersonated feedback' });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Only the customer who owns this complaint/i);
    });

    it('should reject unauthenticated submission with 401', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${resolvedComplaint._id}/feedback`)
        .send({ rating: 5 });

      expect(res.status).toBe(401);
    });
  });

  describe('3. Successful Submission & Duplicate Prevention', () => {
    it('should allow complaint owner to submit valid feedback (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/complaints/${resolvedComplaint._id}/feedback`)
        .set('Authorization', `Bearer ${customerToken1}`)
        .send({
          rating: 5,
          comment: 'Outstanding and prompt resolution by the support specialist!'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.feedback.rating).toBe(5);
      expect(res.body.data.feedback.comment).toBe('Outstanding and prompt resolution by the support specialist!');
      expect(res.body.data.feedback.customer._id.toString()).toBe(customerUser1._id.toString());

      // Verify persistence in MongoDB
      const persisted = await Feedback.findOne({ complaint: resolvedComplaint._id });
      expect(persisted).toBeDefined();
      expect(persisted.rating).toBe(5);
    });

    it('should prevent duplicate feedback submissions for the same complaint (400)', async () => {
      const duplicateRes = await request(app)
        .post(`/api/v1/complaints/${resolvedComplaint._id}/feedback`)
        .set('Authorization', `Bearer ${customerToken1}`)
        .send({
          rating: 4,
          comment: 'Duplicate attempt'
        });

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.status).toBe('fail');
      expect(duplicateRes.body.message).toMatch(/already been submitted/i);
    });

    it('GET /api/v1/complaints/:id/feedback should retrieve submitted feedback for authorized customer', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${resolvedComplaint._id}/feedback`)
        .set('Authorization', `Bearer ${customerToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.feedback.rating).toBe(5);
    });

    it('GET /api/v1/complaints/:id/feedback should prevent non-owner customer from inspecting feedback (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/complaints/${resolvedComplaint._id}/feedback`)
        .set('Authorization', `Bearer ${customerToken2}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('fail');
    });
  });

  describe('4. Admin Customer Satisfaction & Feedback Analytics', () => {
    it('should forbid non-admin users from accessing /api/v1/feedback/analytics (403)', async () => {
      const customerRes = await request(app)
        .get('/api/v1/feedback/analytics')
        .set('Authorization', `Bearer ${customerToken1}`);
      expect(customerRes.status).toBe(403);

      const staffRes = await request(app)
        .get('/api/v1/feedback/analytics')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(staffRes.status).toBe(403);
    });

    it('GET /api/v1/feedback/analytics should provide real calculated metrics to Admin', async () => {
      const res = await request(app)
        .get('/api/v1/feedback/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      const data = res.body.data;
      expect(data.totalFeedback).toBeGreaterThanOrEqual(1);
      expect(typeof data.averageRating).toBe('number');
      expect(data.averageRating).toBeGreaterThanOrEqual(1);
      expect(data.ratingDistribution).toBeDefined();
      expect(data.ratingDistribution['5']).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(data.recentFeedback)).toBe(true);
      expect(data.recentFeedback.length).toBeGreaterThanOrEqual(1);
    });
  });
});
