const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const { validateFileBuffer, MAX_ATTACHMENTS_PER_COMPLAINT } = require('../utils/fileValidator');
const { storeFile, getFileStream, deleteFile } = require('../services/storageService');
const { recordAudit } = require('../services/auditService');

/**
 * Check if a user is authorized to access a given complaint
 * @param {object} complaint
 * @param {object} user
 * @returns {boolean}
 */
const isAuthorizedForComplaint = (complaint, user) => {
  if (!complaint || !user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'customer') {
    return complaint.customer.toString() === user._id.toString();
  }
  if (user.role === 'staff') {
    // Staff can access if assigned, or if reviewing queue
    if (!complaint.assignedTo) return true;
    return complaint.assignedTo.toString() === user._id.toString();
  }
  return false;
};

/**
 * Upload one or more evidence attachments to a complaint
 * POST /api/v1/complaints/:id/attachments
 */
const uploadAttachments = async (req, res, next) => {
  const storedKeysToCleanup = [];

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid complaint ID format.'
      });
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'Complaint not found.'
      });
    }

    // Authorization check
    if (req.user.role === 'customer') {
      if (complaint.customer.toString() !== req.user._id.toString()) {
        await recordAudit({
          actor: req.user._id,
          actorRole: req.user.role,
          action: 'ATTACHMENT_ACCESS_DENIED',
          resourceType: 'Complaint',
          resourceId: complaint._id.toString(),
          description: `Unauthorized attachment upload attempt on complaint #${complaint.ticketNumber}`,
          outcome: 'FAILURE',
          req
        }).catch(() => {});

        return res.status(403).json({
          status: 'fail',
          message: 'Forbidden: You do not have permission to attach files to this complaint.'
        });
      }

      if (['RESOLVED', 'CLOSED'].includes(complaint.status)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Cannot attach evidence to a resolved or closed complaint. Please reopen the complaint first.'
        });
      }
    } else if (req.user.role === 'staff') {
      if (complaint.assignedTo && complaint.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          status: 'fail',
          message: 'Forbidden: You are not assigned to investigate this complaint.'
        });
      }
    }

    // Collect files from Multer (handles single `req.file` or array `req.files`)
    const rawFiles = [];
    if (req.file) rawFiles.push(req.file);
    if (req.files && Array.isArray(req.files)) rawFiles.push(...req.files);

    if (rawFiles.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No file was uploaded. Please attach a valid file.'
      });
    }

    // Check attachment count limit
    const existingCount = complaint.attachments?.length || 0;
    if (existingCount + rawFiles.length > MAX_ATTACHMENTS_PER_COMPLAINT) {
      return res.status(400).json({
        status: 'fail',
        message: `Maximum attachment limit exceeded. A complaint can have at most ${MAX_ATTACHMENTS_PER_COMPLAINT} attachments (currently has ${existingCount}).`
      });
    }

    const newAttachmentDocs = [];

    // Validate and store each file
    for (const rawFile of rawFiles) {
      const validation = validateFileBuffer(rawFile);
      if (!validation.valid) {
        // Rollback already stored files in this transaction
        for (const key of storedKeysToCleanup) {
          await deleteFile(key).catch(() => {});
        }
        return res.status(400).json({
          status: 'fail',
          message: validation.error
        });
      }

      // Store in private storage
      const stored = await storeFile(rawFile.buffer, validation.safeName);
      storedKeysToCleanup.push(stored.storageKey);

      newAttachmentDocs.push({
        originalName: validation.safeName,
        storageKey: stored.storageKey,
        mimeType: validation.verifiedMime,
        size: validation.size,
        uploadedBy: req.user._id,
        uploadedAt: new Date(),
        description: req.body.description ? req.body.description.trim() : '',
        checksum: validation.checksum
      });
    }

    // Append to complaint attachments in MongoDB
    complaint.attachments.push(...newAttachmentDocs);
    await complaint.save();

    // Audit Logging
    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'ATTACHMENT_UPLOADED',
      resourceType: 'Complaint',
      resourceId: complaint._id.toString(),
      description: `Uploaded ${newAttachmentDocs.length} attachment(s) to complaint #${complaint.ticketNumber}`,
      changes: {
        fileNames: newAttachmentDocs.map((a) => a.originalName),
        totalAttachments: complaint.attachments.length
      },
      req
    }).catch(() => {});

    // Populate uploader details
    const updatedComplaint = await Complaint.findById(complaint._id)
      .populate('attachments.uploadedBy', 'name email role');

    // Return newly uploaded attachments with safe metadata (storageKey stripped)
    const savedDocs = updatedComplaint.attachments.slice(-newAttachmentDocs.length);

    res.status(201).json({
      status: 'success',
      message: `${newAttachmentDocs.length} evidence attachment(s) uploaded successfully.`,
      data: {
        attachments: savedDocs
      }
    });
  } catch (error) {
    // Cleanup any orphaned files on disk
    for (const key of storedKeysToCleanup) {
      await deleteFile(key).catch(() => {});
    }
    next(error);
  }
};

/**
 * List metadata for all attachments on a complaint
 * GET /api/v1/complaints/:id/attachments
 */
const getAttachments = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid complaint ID format.'
      });
    }

    const complaint = await Complaint.findById(id)
      .populate('attachments.uploadedBy', 'name email role');

    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'Complaint not found.'
      });
    }

    // Authorization check
    if (!isAuthorizedForComplaint(complaint, req.user)) {
      await recordAudit({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'ATTACHMENT_ACCESS_DENIED',
        resourceType: 'Complaint',
        resourceId: complaint._id.toString(),
        description: `Unauthorized attempt to list attachments on complaint #${complaint.ticketNumber}`,
        outcome: 'FAILURE',
        req
      }).catch(() => {});

      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You do not have permission to view attachments for this complaint.'
      });
    }

    res.status(200).json({
      status: 'success',
      results: complaint.attachments.length,
      data: {
        attachments: complaint.attachments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * View or download an authorized attachment file
 * GET /api/v1/complaints/:id/attachments/:attachmentId
 */
const getAttachmentFile = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(attachmentId)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid ID format.'
      });
    }

    // Explicitly select storageKey because schema sets select: false
    const complaint = await Complaint.findById(id).select('+attachments.storageKey');

    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'Complaint not found.'
      });
    }

    // Authorization check
    if (!isAuthorizedForComplaint(complaint, req.user)) {
      await recordAudit({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'ATTACHMENT_ACCESS_DENIED',
        resourceType: 'Complaint',
        resourceId: complaint._id.toString(),
        description: `Unauthorized file access attempt for attachment ${attachmentId} on complaint #${complaint.ticketNumber}`,
        outcome: 'FAILURE',
        req
      }).catch(() => {});

      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You do not have permission to access this attachment.'
      });
    }

    const attachment = complaint.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({
        status: 'fail',
        message: 'Attachment not found on this complaint.'
      });
    }

    const fileStreamData = getFileStream(attachment.storageKey);
    if (!fileStreamData) {
      return res.status(404).json({
        status: 'fail',
        message: 'Attachment binary file not found in storage.'
      });
    }

    const isDownload = req.query.download === 'true' || attachment.mimeType === 'text/plain';
    const dispositionType = isDownload ? 'attachment' : 'inline';
    const safeAsciiName = attachment.originalName.replace(/[^a-zA-Z0-9._\-]/g, '_');

    // Secure response headers
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Length', attachment.size);
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    fileStreamData.stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an attachment following lifecycle and role permissions
 * DELETE /api/v1/complaints/:id/attachments/:attachmentId
 */
const deleteAttachment = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(attachmentId)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid ID format.'
      });
    }

    const complaint = await Complaint.findById(id).select('+attachments.storageKey');
    if (!complaint) {
      return res.status(404).json({
        status: 'fail',
        message: 'Complaint not found.'
      });
    }

    const attachment = complaint.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({
        status: 'fail',
        message: 'Attachment not found.'
      });
    }

    // Lifecycle & Role Permissions:
    // 1) Customer: can only delete their own attachments while complaint remains OPEN
    if (req.user.role === 'customer') {
      if (complaint.customer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          status: 'fail',
          message: 'Forbidden: You do not own this complaint.'
        });
      }
      if (complaint.status !== 'OPEN') {
        return res.status(400).json({
          status: 'fail',
          message: 'Attachments are locked and cannot be deleted once complaint investigation has commenced.'
        });
      }
      if (attachment.uploadedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          status: 'fail',
          message: 'Forbidden: You can only remove attachments uploaded by yourself.'
        });
      }
    } else if (req.user.role === 'staff') {
      // Support staff cannot delete evidence to preserve customer integrity
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: Support staff cannot delete evidence attachments.'
      });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: Insufficient privileges.'
      });
    }

    const deletedStorageKey = attachment.storageKey;
    const deletedOriginalName = attachment.originalName;

    // Delete from private disk
    await deleteFile(deletedStorageKey).catch(() => {});

    // Remove from MongoDB
    complaint.attachments.pull(attachmentId);
    await complaint.save();

    // Audit Logging
    await recordAudit({
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'ATTACHMENT_DELETED',
      resourceType: 'Complaint',
      resourceId: complaint._id.toString(),
      description: `Removed evidence attachment "${deletedOriginalName}" from complaint #${complaint.ticketNumber}`,
      changes: {
        deletedAttachmentId: attachmentId,
        fileName: deletedOriginalName,
        remainingAttachments: complaint.attachments.length
      },
      req
    }).catch(() => {});

    res.status(200).json({
      status: 'success',
      message: `Attachment "${deletedOriginalName}" deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadAttachments,
  getAttachments,
  getAttachmentFile,
  deleteAttachment
};
