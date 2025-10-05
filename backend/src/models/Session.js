const mongoose = require('mongoose');
const crypto = require('crypto');

const sessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Session title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  course: {
    type: String,
    required: [true, 'Course is required'],
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: String,
    trim: true
  },
  building: {
    type: String,
    trim: true
  },
  beaconUUID: {
    type: String,
    required: true,
    unique: true
  },
  sessionCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'paused', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  attendanceCount: {
    type: Number,
    default: 0
  },
  maxAttendance: {
    type: Number,
    default: 100
  },
  allowLateEntry: {
    type: Boolean,
    default: true
  },
  lateEntryMinutes: {
    type: Number,
    default: 15
  },
  proximityRadius: {
    type: Number,
    default: 10, // meters
    min: 5,
    max: 50
  },
  otpSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    length: {
      type: Number,
      default: 6,
      min: 4,
      max: 8
    },
    expiryMinutes: {
      type: Number,
      default: 1.5 // 90 seconds
    }
  },
  settings: {
    requireDeviceVerification: {
      type: Boolean,
      default: true
    },
    allowMultipleDevices: {
      type: Boolean,
      default: false
    },
    recordLocation: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    totalStudents: {
      type: Number,
      default: 0
    },
    expectedAttendance: {
      type: Number,
      default: 0
    },
    actualStartTime: Date,
    actualEndTime: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
sessionSchema.index({ teacher: 1, startTime: -1 });
sessionSchema.index({ beaconUUID: 1 });
sessionSchema.index({ sessionCode: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ startTime: 1, endTime: 1 });

// Pre-save middleware to generate unique identifiers
sessionSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate beacon UUID if not provided
    if (!this.beaconUUID) {
      this.beaconUUID = crypto.randomUUID();
    }
    
    // Generate session code if not provided
    if (!this.sessionCode) {
      this.sessionCode = this.generateSessionCode();
    }
    
    // Calculate duration if not provided
    if (!this.duration && this.startTime && this.endTime) {
      this.duration = Math.ceil((this.endTime - this.startTime) / 60000); // minutes
    }
  }
  next();
});

// Generate unique session code
sessionSchema.methods.generateSessionCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Check if session is active
sessionSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && now >= this.startTime && now <= this.endTime;
};

// Check if late entry is allowed
sessionSchema.methods.allowsLateEntry = function() {
  if (!this.allowLateEntry) return false;
  
  const now = new Date();
  const lateEntryDeadline = new Date(this.startTime.getTime() + (this.lateEntryMinutes * 60000));
  
  return now <= lateEntryDeadline;
};

// Virtual for attendance percentage
sessionSchema.virtual('attendancePercentage').get(function() {
  if (!this.metadata.expectedAttendance || this.metadata.expectedAttendance === 0) {
    return 0;
  }
  return Math.round((this.attendanceCount / this.metadata.expectedAttendance) * 100);
});

module.exports = mongoose.model('Session', sessionSchema);