const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('./socketService');

/**
 * Persist a notification to MongoDB and dispatch in real-time to the recipient's private room
 * @param {object} param
 * @param {string|import('mongoose').Types.ObjectId} param.recipient - Target User ID
 * @param {string|import('mongoose').Types.ObjectId} [param.complaint] - Associated Complaint ID
 * @param {'COMPLAINT_CREATED'|'COMPLAINT_ASSIGNED'|'STATUS_CHANGED'|'NEW_RESPONSE'|'SYSTEM_ALERT'} param.type
 * @param {string} param.title
 * @param {string} param.message
 * @returns {Promise<Notification>}
 */
const createNotification = async ({ recipient, complaint = null, type, title, message }) => {
  if (!recipient) {
    throw new Error('Recipient is required to create a notification.');
  }

  // 1) Persist to MongoDB first
  const notification = await Notification.create({
    recipient,
    complaint,
    type,
    title: title.trim(),
    message: message.trim(),
    isRead: false
  });

  const populated = await Notification.findById(notification._id)
    .populate('complaint', 'ticketNumber title status priority');

  // 2) Real-time dispatch strictly to authorized recipient's private room
  try {
    emitToUser(recipient, 'notification:new', populated);
  } catch (socketErr) {
    console.error('Socket emission warning:', socketErr.message);
  }

  return populated;
};

/**
 * Bulk create and dispatch notifications to multiple recipients
 * @param {Array<string|import('mongoose').Types.ObjectId>} recipients
 * @param {object} payload
 * @returns {Promise<Array<Notification>>}
 */
const notifyUsers = async (recipients, { complaint = null, type, title, message }) => {
  if (!Array.isArray(recipients) || recipients.length === 0) return [];

  // Deduplicate recipient IDs
  const uniqueRecipients = Array.from(new Set(recipients.map((id) => id.toString())));

  const createdNotifications = await Promise.all(
    uniqueRecipients.map((recipientId) =>
      createNotification({
        recipient: recipientId,
        complaint,
        type,
        title,
        message
      }).catch((err) => {
        console.error(`Failed to notify user ${recipientId}:`, err.message);
        return null;
      })
    )
  );

  return createdNotifications.filter(Boolean);
};

/**
 * Notify all active system administrators
 * @param {object} payload
 * @param {string|import('mongoose').Types.ObjectId} [excludeUserId] - Optional user to skip (e.g. action author)
 * @returns {Promise<Array<Notification>>}
 */
const notifyAdmins = async ({ complaint = null, type, title, message, excludeUserId = null }) => {
  try {
    const query = { role: 'admin', isActive: true };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }

    const admins = await User.find(query).select('_id');
    const adminIds = admins.map((admin) => admin._id);

    return await notifyUsers(adminIds, { complaint, type, title, message });
  } catch (error) {
    console.error('Failed to notify administrators:', error.message);
    return [];
  }
};

module.exports = {
  createNotification,
  notifyUsers,
  notifyAdmins
};
