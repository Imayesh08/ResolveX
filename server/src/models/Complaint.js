const mongoose = require('mongoose');

// Subdocument schema for tracking full audit trail of status transitions
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [
        'OPEN',
        'ASSIGNED',
        'IN_PROGRESS',
        'WAITING_FOR_CUSTOMER',
        'RESOLVED',
        'CLOSED'
      ]
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

// Subdocument schema for internal staff notes and customer comments
const noteSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    note: {
      type: String,
      required: [true, 'Note text cannot be empty'],
      trim: true
    },
    isInternal: {
      type: Boolean,
      default: false // true = staff/admin only; false = visible to customer
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

// Subdocument schema for complaint evidence attachments
const attachmentSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    storageKey: {
      type: String,
      required: true,
      select: false // Never returned in default queries
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    checksum: {
      type: String,
      default: null
    }
  },
  {
    _id: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.storageKey;
        return ret;
      }
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.storageKey;
        return ret;
      }
    }
  }
);

const complaintSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
      type: String,
      required: [true, 'Detailed description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'Technical Issue',
          'Billing and Payment',
          'Product or Service',
          'Account Access',
          'Delivery',
          'Other'
        ],
        message: '{VALUE} is not a supported complaint category'
      }
    },
    priority: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        message: '{VALUE} is not a valid priority level'
      },
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: {
        values: [
          'OPEN',
          'ASSIGNED',
          'IN_PROGRESS',
          'WAITING_FOR_CUSTOMER',
          'RESOLVED',
          'CLOSED'
        ],
        message: '{VALUE} is not a valid status'
      },
      default: 'OPEN'
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Complaint must belong to a registered customer'],
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    resolution: {
      description: {
        type: String,
        trim: true,
        default: ''
      },
      resolvedAt: {
        type: Date,
        default: null
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      }
    },
    statusHistory: [statusHistorySchema],
    notes: [noteSchema],
    attachments: [attachmentSchema],
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    // Confirmed Duplicate Relationship Fields
    isDuplicate: {
      type: Boolean,
      default: false,
      index: true
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
      index: true
    },
    duplicateReason: {
      type: String,
      trim: true,
      default: ''
    },
    duplicateMarkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    duplicateMarkedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for linking all child duplicate complaints pointing to this complaint
complaintSchema.virtual('linkedDuplicates', {
  ref: 'Complaint',
  localField: '_id',
  foreignField: 'duplicateOf'
});

// Compound indexes for optimal queries and dashboard analytics
complaintSchema.index({ customer: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ isArchived: 1, status: 1 });
complaintSchema.index({ isDuplicate: 1, category: 1 });

// Helper function to generate ticket numbers like RX-20261011-8492
function generateTicketNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RX-${dateStr}-${randomSuffix}`;
}

// Pre-save hook: auto-generate unique ticket number and initial status history
complaintSchema.pre('save', function (next) {
  if (this.isNew) {
    if (!this.ticketNumber) {
      this.ticketNumber = generateTicketNumber();
    }
    // If statusHistory is empty on creation, seed initial OPEN record
    if (this.statusHistory.length === 0) {
      this.statusHistory.push({
        status: this.status,
        changedBy: this.customer,
        notes: 'Complaint submitted by customer',
        changedAt: new Date()
      });
    }
  }
  next();
});

const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
