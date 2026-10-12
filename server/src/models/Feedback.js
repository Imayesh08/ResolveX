const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required']
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
      validate: {
        validator: function (v) {
          return Number.isInteger(v);
        },
        message: 'Rating must be an integer between 1 and 5'
      }
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Enforce unique feedback per complaint at database level
feedbackSchema.index({ complaint: 1 }, { unique: true });
feedbackSchema.index({ customer: 1, createdAt: -1 });

const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
