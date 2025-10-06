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
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'late', 'absent'],
    default: 'present'
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  markedTime: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  // Enhanced security fields
  otpData: {
    otp: String,
    generatedAt: Date,
    expiresAt: Date,
    attempts: { type: Number, default: 0 }
  },
  deviceFingerprint: {
    userAgent: String,
    screenResolution: String,
    timezone: String,
    language: String,
    platform: String,
    deviceId: String,
    canvasFingerprint: String,
    webglFingerprint: mongoose.Schema.Types.Mixed
  },
  proximityData: {
    rssi: Number,
    distance: Number,
    beaconUUID: String,
    detectedAt: Date
  },
  geolocationData: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    timestamp: Date
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate attendance
attendanceSchema.index({ student: 1, session: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
