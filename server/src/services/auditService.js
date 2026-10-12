const AuditLog = require('../models/AuditLog');

/**
 * Filter and sanitize metadata to guarantee no passwords, tokens, or credentials are saved
 * @param {object} raw
 * @returns {object}
 */
const sanitizeMetadata = (raw = {}) => {
  if (!raw || typeof raw !== 'object') return {};
  const sanitized = { ...raw };

  const forbiddenKeys = [
    'password',
    'passwordConfirm',
    'token',
    'jwt',
    'authorization',
    'secret',
    'apiKey',
    'creditCard'
  ];

  for (const key of Object.keys(sanitized)) {
    if (forbiddenKeys.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      delete sanitized[key];
    }
  }

  return sanitized;
};

/**
 * Record an append-only audit event in MongoDB
 * @param {object} params
 * @param {import('mongoose').Types.ObjectId|string} [params.actor]
 * @param {'customer'|'staff'|'admin'|'system'} [params.actorRole]
 * @param {string} params.action - Allowed action from model allowlist
 * @param {'Complaint'|'User'|'Authentication'|'System'} params.resourceType
 * @param {string} [params.resourceId]
 * @param {string} params.description
 * @param {object} [params.changes] - Structured before-and-after object
 * @param {object} [params.metadata]
 * @param {'SUCCESS'|'FAILURE'} [params.outcome]
 * @param {import('express').Request} [params.req]
 * @returns {Promise<AuditLog>}
 */
const recordAudit = async ({
  actor = null,
  actorRole = null,
  action,
  resourceType,
  resourceId = null,
  description,
  changes = null,
  metadata = {},
  outcome = 'SUCCESS',
  req = null
}) => {
  try {
    let finalActor = actor;
    let finalActorRole = actorRole;
    let clientMetadata = {};

    if (req) {
      if (!finalActor && req.user) {
        finalActor = req.user._id;
      }
      if (!finalActorRole && req.user) {
        finalActorRole = req.user.role;
      }
      clientMetadata = {
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '',
        userAgent: req.headers['user-agent'] || '',
        method: req.method,
        path: req.originalUrl
      };
    }

    const mergedMetadata = sanitizeMetadata({
      ...clientMetadata,
      ...metadata
    });

    const auditEntry = await AuditLog.create({
      actor: finalActor,
      actorRole: finalActorRole || 'system',
      action,
      resourceType,
      resourceId: resourceId ? resourceId.toString() : null,
      description: description.trim(),
      changes: changes || null,
      metadata: mergedMetadata,
      outcome,
      requestId: req?.headers?.['x-request-id'] || null
    });

    return auditEntry;
  } catch (error) {
    console.error('Failed to record audit log:', error.message);
    throw error;
  }
};

module.exports = {
  recordAudit,
  sanitizeMetadata
};
