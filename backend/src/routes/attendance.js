const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');

console.log('📂 Loading ENHANCED attendance.js with ANTI-PROXY security - v3.0');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Enhanced OTP generation with security
const generateSecureOTP = (studentId, sessionId) => {
  const timestamp = Date.now();
  const data = `${studentId}-${sessionId}-${timestamp}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  
  const otp = parseInt(hash.substring(0, 8), 16).toString().substring(0, 6).padStart(6, '0');
  
  return {
    otp,
    expiresAt: new Date(Date.now() + 90000), // 90 seconds expiry
    generatedAt: new Date()
  };
};

// Validate Bluetooth proximity (real implementation)
const validateBluetoothProximity = (proximityData) => {
  if (!proximityData || !proximityData.beaconUUID || !proximityData.rssi) {
    return { valid: false, reason: 'No Bluetooth beacon detected' };
  }
  
  // Real proximity validation
  const rssi = proximityData.rssi;
  const distance = proximityData.distance;
  
  // RSSI should be between -30 to -80 (close proximity)
  if (rssi > -30 || rssi < -80) {
    return { valid: false, reason: `Too far from teacher's beacon (RSSI: ${rssi})` };
  }
  
  // Distance should be less than 15 meters for classroom
  if (distance > 15) {
    return { valid: false, reason: `Distance too far: ${distance.toFixed(1)}m (max 15m)` };
  }
  
  return { valid: true, reason: 'Bluetooth proximity validated' };
};

// 🚫 ANTI-PROXY REQUEST-OTP ENDPOINT
router.post('/request-otp', authenticateToken, async (req, res) => {
  try {
    const { sessionId, deviceFingerprint, proximityData } = req.body;
    const studentId = req.user.id || req.user.userId || req.user._id;
    
    console.log(`🔐 SECURE OTP request - Student: ${studentId}, Session: ${sessionId}`);
    console.log(`🔒 Device ID: ${deviceFingerprint?.deviceId}`);
    
    // 1. Check if session exists and is active
    const session = await Session.findById(sessionId);
    if (!session || session.status !== 'active') {
      return res.status(400).json({ message: 'Session not active' });
    }
    
    // 2. 🚫 ANTI-PROXY: Check for device reuse in this session
    console.log('🕵️ Checking for proxy attendance...');
    const existingDeviceAttendance = await Attendance.find({
      session: sessionId,
      'deviceFingerprint.deviceId': deviceFingerprint.deviceId,
      isVerified: true
    }).populate('student', 'name rollNumber');
    
    if (existingDeviceAttendance.length > 0) {
      const existingStudent = existingDeviceAttendance[0].student;
      console.log(`🚨 SECURITY ALERT: Device already used by ${existingStudent.name}`);
      return res.status(403).json({ 
        message: `🚨 SECURITY ALERT: This device was already used by ${existingStudent.name} (${existingStudent.rollNumber}) for this session. Proxy attendance is not allowed.`,
        securityBlock: true,
        existingStudent: {
          name: existingStudent.name,
          rollNumber: existingStudent.rollNumber
        }
      });
    }
    
    // 3. 📡 BLUETOOTH VALIDATION (Enhanced)
    console.log('📡 Validating Bluetooth proximity...');
    const bluetoothValidation = validateBluetoothProximity(proximityData);
    
    if (!bluetoothValidation.valid) {
      console.log(`❌ Bluetooth validation failed: ${bluetoothValidation.reason}`);
      return res.status(400).json({ 
        message: `📡 Bluetooth Error: ${bluetoothValidation.reason}`,
        bluetoothRequired: true
      });
    }
    
    console.log(`✅ Bluetooth proximity validated: ${bluetoothValidation.reason}`);
    
    // 4. Check for existing recent OTP request (prevent spam)
    const existingOTP = await Attendance.findOne({
      student: studentId,
      session: sessionId,
      'otpData.expiresAt': { $gt: new Date() }
    });
    
    if (existingOTP && !existingOTP.isVerified) {
      return res.status(400).json({ 
        message: 'OTP already sent. Please wait before requesting again.',
        waitTime: Math.ceil((existingOTP.otpData.expiresAt - new Date()) / 1000)
      });
    }
    
    // 5. Generate secure OTP
    const otpData = generateSecureOTP(studentId, sessionId);
    
    // 6. Store with enhanced security data
    let attendanceRecord = await Attendance.findOne({
      student: studentId,
      session: sessionId
    });
    
    if (attendanceRecord) {
      // Update existing record
      attendanceRecord.otpData = otpData;
      attendanceRecord.deviceFingerprint = deviceFingerprint;
      attendanceRecord.proximityData = proximityData;
      attendanceRecord.securityChecks = {
        deviceValidation: 'passed',
        bluetoothValidation: 'passed',
        proximityValidation: bluetoothValidation.reason
      };
      await attendanceRecord.save();
    } else {
      // Create new record
      attendanceRecord = new Attendance({
        student: studentId,
        session: sessionId,
        otpData,
        deviceFingerprint,
        proximityData,
        isVerified: false,
        securityChecks: {
          deviceValidation: 'passed',
          bluetoothValidation: 'passed', 
          proximityValidation: bluetoothValidation.reason
        }
      });
      await attendanceRecord.save();
    }
    
    console.log(`✅ SECURE OTP Generated: ${otpData.otp} for student ${studentId}`);
    console.log(`🔒 Security validated - Device: ${deviceFingerprint.deviceId}, Proximity: OK`);
    
    res.json({
      message: 'OTP generated successfully with security validation',
      otp: otpData.otp,
      expiresIn: 90,
      sessionInfo: {
        title: session.title,
        subject: session.subject,
        room: session.room
      },
      security: {
        deviceValidated: true,
        bluetoothValidated: true,
        proximityValidated: true
      }
    });
    
  } catch (error) {
    console.error('❌ Error generating secure OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enhanced verify OTP endpoint (keeping existing functionality)
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { otp, sessionId } = req.body;
    const studentId = req.user.id || req.user.userId || req.user._id;

    console.log(`🔐 Verifying OTP: ${otp} for student: ${studentId}`);

    if (!studentId) {
      console.log('❌ No student ID found in token for verification');
      return res.status(400).json({ message: 'Invalid token - no user ID' });
    }

    // Find attendance record
    const attendanceRecord = await Attendance.findOne({
      student: studentId,
      session: sessionId
    }).populate('student', 'name rollNumber');

    if (!attendanceRecord) {
      return res.status(400).json({ message: 'No OTP request found. Please request OTP first.' });
    }

    // Check if already verified
    if (attendanceRecord.isVerified) {
      return res.status(400).json({ message: 'Attendance already marked for this session.' });
    }

    // Check OTP expiry
    if (new Date() > attendanceRecord.otpData.expiresAt) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    // Verify OTP
    if (attendanceRecord.otpData.otp !== otp) {
      attendanceRecord.otpData.attempts = (attendanceRecord.otpData.attempts || 0) + 1;
      await attendanceRecord.save();
      
      if (attendanceRecord.otpData.attempts >= 3) {
        return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
      }
      
      return res.status(400).json({ 
        message: `Invalid OTP. ${3 - attendanceRecord.otpData.attempts} attempts remaining.` 
      });
    }

    // Get session to determine late status
    const session = await Session.findById(sessionId);
    const now = new Date();
    const sessionStart = new Date(session.startTime);
    const lateThreshold = new Date(sessionStart.getTime() + 15 * 60000);

    // Mark as verified and determine status
    attendanceRecord.isVerified = true;
    attendanceRecord.markedAt = now;
    attendanceRecord.markedTime = now.toLocaleTimeString();
    attendanceRecord.status = now > lateThreshold ? 'late' : 'present';

    await attendanceRecord.save();

    console.log(`✅ Attendance marked: ${attendanceRecord.status.toUpperCase()} for ${attendanceRecord.student.name}`);

    res.json({
      message: `Attendance marked successfully as ${attendanceRecord.status.toUpperCase()}!`,
      attendance: {
        status: attendanceRecord.status,
        markedAt: attendanceRecord.markedAt,
        markedTime: attendanceRecord.markedTime,
        student: attendanceRecord.student,
        session: session.title
      }
    });

  } catch (error) {
    console.error('❌ OTP verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// Get attendance history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.id || req.user.userId || req.user._id;
    
    console.log('📊 Loading attendance history for student:', studentId);

    const attendanceHistory = await Attendance.find({ 
      student: studentId,
      isVerified: true 
    })
    .populate('session', 'title subject course room startTime')
    .sort({ markedAt: -1 });

    console.log('📊 Found attendance records:', attendanceHistory.length);

    res.json({
      message: 'Attendance history retrieved successfully',
      data: attendanceHistory
    });

  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get session attendance (for teachers)
router.get('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('📊 Fetching attendance for session:', sessionId);
    
    const session = await Session.findById(sessionId);
    if (!session) {
      console.log('❌ Session not found');
      return res.status(404).json({ message: 'Session not found' });
    }

    console.log('📋 Session found:', session.title);

    const attendanceRecords = await Attendance.find({ 
      session: sessionId,
      isVerified: true 
    }).populate('student', 'name rollNumber email');

    console.log('📊 Found attendance records:', attendanceRecords.length);

    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(record => record.status === 'present').length,
      late: attendanceRecords.filter(record => record.status === 'late').length,
      absent: 0
    };

    console.log('📊 Attendance stats:', stats);

    res.json({
      message: 'Session attendance retrieved successfully',
      data: {
        session,
        attendance: attendanceRecords,
        stats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching session attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Test endpoint
router.get('/test-otp', (req, res) => {
  console.log('🧪 Test endpoint hit - ANTI-PROXY system loaded!');
  res.json({ message: 'Enhanced ANTI-PROXY system v3.0 loaded successfully!' });
});

module.exports = router;