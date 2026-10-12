const mongoose = require('mongoose');
const Notification = require('../models/Notification');

/**
 * Get paginated notifications for the authenticated user
 * Query params: page, limit, unreadOnly
 */
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const query = {
      recipient: req.user._id
    };

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, totalNotifications, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('complaint', 'ticketNumber title status priority category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user._id, isRead: false })
    ]);

    res.status(200).json({
      status: 'success',
      results: notifications.length,
      pagination: {
        total: totalNotifications,
        page: pageNum,
        pages: Math.ceil(totalNotifications / limitNum) || 1,
        limit: limitNum
      },
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get accurate count of unread notifications for the authenticated user
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    res.status(200).json({
      status: 'success',
      data: {
        unreadCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read (Enforcing recipient ownership)
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid notification ID format.'
      });
    }

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        status: 'fail',
        message: 'Notification not found.'
      });
    }

    // Ownership Enforcement
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You cannot modify another user\'s notification.'
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read.',
      data: {
        notification
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all unread notifications as read for the authenticated user
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.user._id,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read.',
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a notification (Enforcing recipient ownership)
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid notification ID format.'
      });
    }

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        status: 'fail',
        message: 'Notification not found.'
      });
    }

    // Ownership Enforcement
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You cannot delete another user\'s notification.'
      });
    }

    await Notification.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
