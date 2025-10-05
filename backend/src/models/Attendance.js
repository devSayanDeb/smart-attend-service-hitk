const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: false  // <- Now it's optional
  },
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'excused'],
    default: 'present'
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  markedBy: {
    type: String,
    enum: ['student', 'teacher', 'system'],
    default: 'student'
  },
  verification: {
    method: {
      type: String,
      enum: ['bluetooth', 'qr', 'manual', 'facial'],
      default: 'bluetooth'
    },
    deviceInfo: {
      userAgent: String,
      ipAddress: String,
      deviceFingerprint: String,
      bluetoothMAC: String
    },
    location: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      },
      accuracy: Number, // in meters
      timestamp: Date
    },
    proximity: {
      rssi: Number, // Bluetooth signal strength
      distance: Number, // estimated distance in meters
      beaconUUID: String
    },
    otp: {
      code: String,
      generatedAt: Date,
      verifiedAt: Date,
      attempts: {
        type: Number,
        default: 0
      }
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  isLate: {
    type: Boolean,
    default: false
  },
  minutesLate: {
    type: Number,
    default: 0
  },
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String,
    enum: ['duplicate_device', 'suspicious_location', 'rapid_succession', 'weak_signal', 'manual_review']
  },
  validated: {
    type: Boolean,
    default: true
  },
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  validatedAt: Date
}, {
  timestamps: true
});

// Compound index to prevent duplicate attendance
attendanceSchema.index({ student: 1, session: 1 }, { unique: true });

// Other indexes for queries
attendanceSchema.index({ session: 1, status: 1 });
attendanceSchema.index({ student: 1, markedAt: -1 });
attendanceSchema.index({ markedAt: -1 });
attendanceSchema.index({ flagged: 1 });

// Pre-save middleware to calculate lateness
attendanceSchema.pre('save', async function(next) {
  if (this.isNew && this.session) {
    try {
      const Session = mongoose.model('Session');
      const session = await Session.findById(this.session);
      
      if (session) {
        const markedTime = this.markedAt || new Date();
        const sessionStart = session.startTime;
        
        // Check if marked after session start time
        if (markedTime > sessionStart) {
          this.isLate = true;
          this.minutesLate = Math.ceil((markedTime - sessionStart) / 60000);
          
          // Update status based on lateness
          if (this.minutesLate > (session.lateEntryMinutes || 15)) {
            this.status = 'absent';
          } else {
            this.status = 'late';
          }
        }
      }
    } catch (error) {
      console.error('Error calculating lateness:', error);
    }
  }
  next();
});

// Static method to get attendance statistics
attendanceSchema.statics.getStats = async function(sessionId) {
  const stats = await this.aggregate([
    { $match: { session: mongoose.Types.ObjectId(sessionId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    total: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

// Method to check if attendance is suspicious
attendanceSchema.methods.isSuspicious = function() {
  const flags = [];
  
  // Check for weak Bluetooth signal
  if (this.verification.proximity.rssi && this.verification.proximity.rssi > -40) {
    flags.push('weak_signal');
  }
  
  // Check for estimated distance
  if (this.verification.proximity.distance && this.verification.proximity.distance > 20) {
    flags.push('suspicious_location');
  }
  
  // Check for multiple OTP attempts
  if (this.verification.otp.attempts > 3) {
    flags.push('multiple_attempts');
  }
  
  return flags;
};

module.exports = mongoose.model('Attendance', attendanceSchema);