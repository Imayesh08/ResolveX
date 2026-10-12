const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { connectDB, closeDB } = require('../config/db');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB for data seeding...');
    await connectDB();

    console.log('Clearing existing demo collections...');
    await User.deleteMany({ email: /@resolvex\.local$/ });
    await Complaint.deleteMany({});

    console.log('Creating standard demo users...');
    // 1. Administrator
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@resolvex.local',
      password: 'Admin123!',
      role: 'admin',
      department: 'Administration',
      phone: '9840011111'
    });

    // 2. Technical Support Staff
    const staffTech = await User.create({
      name: 'Priya Technical Specialist',
      email: 'priya.staff@resolvex.local',
      password: 'Staff123!',
      role: 'staff',
      department: 'Technical Support',
      phone: '9840022222'
    });

    // 3. Billing Support Staff
    const staffBilling = await User.create({
      name: 'Suresh Billing Lead',
      email: 'suresh.staff@resolvex.local',
      password: 'Staff123!',
      role: 'staff',
      department: 'Billing',
      phone: '9840033333'
    });

    // 4. Customer One
    const customer1 = await User.create({
      name: 'Aravind Swaminathan',
      email: 'aravind.customer@resolvex.local',
      password: 'Customer123!',
      role: 'customer',
      phone: '9840044444'
    });

    // 5. Customer Two
    const customer2 = await User.create({
      name: 'Kavitha Ramanathan',
      email: 'kavitha.customer@resolvex.local',
      password: 'Customer123!',
      role: 'customer',
      phone: '9840055555'
    });

    console.log('Creating initial realistic complaints with audit history...');

    // Complaint 1: Broadband Outage (In Progress, assigned to Priya)
    const complaint1 = new Complaint({
      ticketNumber: 'RX-20261011-1001',
      title: 'High latency and intermittent optical connection dropouts',
      description: 'Fiber internet connection disconnects every 15-20 minutes during work hours. Power indicator on modem stays amber for 2 minutes before reconnecting.',
      category: 'Technical Issue',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      customer: customer1._id,
      assignedTo: staffTech._id,
      statusHistory: [
        {
          status: 'OPEN',
          changedBy: customer1._id,
          notes: 'Complaint submitted by customer via portal',
          changedAt: new Date(Date.now() - 3600000 * 5)
        },
        {
          status: 'ASSIGNED',
          changedBy: admin._id,
          notes: 'Assigned to Technical Support specialist Priya for telemetry analysis',
          changedAt: new Date(Date.now() - 3600000 * 4)
        },
        {
          status: 'IN_PROGRESS',
          changedBy: staffTech._id,
          notes: 'Field technician dispatched to check neighborhood splitter node #4',
          changedAt: new Date(Date.now() - 3600000 * 2)
        }
      ],
      notes: [
        {
          author: staffTech._id,
          note: 'Telemetry logs show optical receiver SNR fluctuating between 14dB and 28dB.',
          isInternal: true,
          createdAt: new Date(Date.now() - 3600000 * 2)
        },
        {
          author: staffTech._id,
          note: 'Our engineering team is at the junction box resolving line noise.',
          isInternal: false,
          createdAt: new Date(Date.now() - 3600000 * 1)
        }
      ]
    });
    await complaint1.save();

    // Complaint 2: Double Invoicing (Resolved by Suresh)
    const complaint2 = new Complaint({
      ticketNumber: 'RX-20261011-1002',
      title: 'Erroneous duplicate charge on monthly enterprise subscription',
      description: 'The recurring invoice for October 2026 was debited twice from credit card ending in 4092.',
      category: 'Billing and Payment',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      customer: customer2._id,
      assignedTo: staffBilling._id,
      resolution: {
        description: 'Duplicate transaction #TXN-984021 refunded through payment gateway. Credit note #CN-204 issued to customer account.',
        resolvedAt: new Date(Date.now() - 3600000 * 1),
        resolvedBy: staffBilling._id
      },
      statusHistory: [
        {
          status: 'OPEN',
          changedBy: customer2._id,
          notes: 'Complaint submitted with attached bank statement reference',
          changedAt: new Date(Date.now() - 3600000 * 8)
        },
        {
          status: 'ASSIGNED',
          changedBy: admin._id,
          notes: 'Assigned to Suresh (Billing Operations)',
          changedAt: new Date(Date.now() - 3600000 * 7)
        },
        {
          status: 'IN_PROGRESS',
          changedBy: staffBilling._id,
          notes: 'Payment reconciliation verified with gateway',
          changedAt: new Date(Date.now() - 3600000 * 4)
        },
        {
          status: 'RESOLVED',
          changedBy: staffBilling._id,
          notes: 'Refund confirmed and transaction receipt emailed to customer',
          changedAt: new Date(Date.now() - 3600000 * 1)
        }
      ],
      notes: [
        {
          author: staffBilling._id,
          note: 'Refund ARN number: 994820184920 issued.',
          isInternal: true,
          createdAt: new Date(Date.now() - 3600000 * 2)
        }
      ]
    });
    await complaint2.save();

    // Complaint 3: Portal Login Access (Open, Unassigned)
    const complaint3 = new Complaint({
      ticketNumber: 'RX-20261011-1003',
      title: 'Password reset link not delivering OTP email',
      description: 'Requesting OTP to reset secondary email address times out without delivering verification code.',
      category: 'Account Access',
      priority: 'URGENT',
      status: 'OPEN',
      customer: customer1._id,
      assignedTo: null,
      statusHistory: [
        {
          status: 'OPEN',
          changedBy: customer1._id,
          notes: 'Complaint created by customer',
          changedAt: new Date(Date.now() - 3600000 * 1)
        }
      ],
      notes: []
    });
    await complaint3.save();

    console.log('====================================================');
    console.log(' ResolveX Database Seeded Successfully!');
    console.log('----------------------------------------------------');
    console.log(' Demo Credentials for CAT-II Assessment Viva:');
    console.log(' 1. Administrator:');
    console.log('    Email:    admin@resolvex.local');
    console.log('    Password: Admin123!');
    console.log(' 2. Support Staff (Technical Support):');
    console.log('    Email:    priya.staff@resolvex.local');
    console.log('    Password: Staff123!');
    console.log(' 3. Support Staff (Billing Operations):');
    console.log('    Email:    suresh.staff@resolvex.local');
    console.log('    Password: Staff123!');
    console.log(' 4. Customer:');
    console.log('    Email:    aravind.customer@resolvex.local');
    console.log('    Password: Customer123!');
    console.log(' 5. Customer 2:');
    console.log('    Email:    kavitha.customer@resolvex.local');
    console.log('    Password: Customer123!');
    console.log('====================================================');

    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('Data seeding failed:', error);
    process.exit(1);
  }
};

seedData();
