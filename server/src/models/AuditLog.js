const mongoose = require('mongoose');

const ALLOWED_ACTIONS = [
  // Complaint lifecycle
  'COMPLAINT_CREATED',
  'COMPLAINT_ASSIGNED',
  'COMPLAINT_REASSIGNED',
  'COMPLAINT_STATUS_CHANGED',
  'COMPLAINT_PRIORITY_CHANGED',
  'COMPLAINT_UPDATED',
  'COMPLAINT_REOPENED',
  'COMPLAINT_ARCHIVED',
  // User governance
  'USER_CREATED',
  'USER_ROLE_CHANGED',
  'USER_STATUS_CHANGED',
  'USER_UPDATED',
  'USER_DELETED',
  // Authentication & session
  'AUTH_LOGIN_SUCCESS',
  'AUTH_LOGIN_FAILED',
  'AUTH_LOGOUT',
  // Evidence & Attachments
  'ATTACHMENT_UPLOADED',
  'ATTACHMENT_DELETED',
  'ATTACHMENT_ACCESS_DENIED',
  // Duplicate Detection & Linking
  'COMPLAINT_DUPLICATE_LINKED',
  'COMPLAINT_DUPLICATE_UNLINKED'
];

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    actorRole: {
      type: String,
      enum: {
        values: ['customer', 'staff', 'admin', 'system'],
        message: '{VALUE} is not a valid actor role'
      },
      default: 'system',
      index: true
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      enum: {
        values: ALLOWED_ACTIONS,
        message: '{VALUE} is not a permitted audit action'
      },
      index: true
    },
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: {
        values: ['Complaint', 'User', 'Authentication', 'System', 'Attachment'],
        message: '{VALUE} is not a supported resource type'
      },
      index: true
    },
    resourceId: {
      type: String,
      default: null,
      index: true
    },
    description: {
      type: String,
      required: [true, 'Audit event description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    outcome: {
      type: String,
      enum: {
        values: ['SUCCESS', 'FAILURE'],
        message: '{VALUE} is not a valid audit outcome'
      },
      default: 'SUCCESS',
      index: true
    },
    requestId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Immutable: created at only
  }
);

// Compound indexes for optimal admin filtering and complaint audit history queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ outcome: 1, createdAt: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
