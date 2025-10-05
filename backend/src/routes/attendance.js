const express = require('express');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

// Request OTP for attendance
router.post('/request-otp', auth, async (req, res) => {
  try {
    const { sessionId, deviceInfo, location, proximity } = req.body;

    console.log('📱 OTP request for session:', sessionId);
    console.log('👤 Student:', req.user.name);

    // Find the actual session
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(400).json({ message: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Session is not currently active' });
    }

    // Check if already marked attendance
    const existingAttendance = await Attendance.findOne({
      student: req.user._id,
      'verification.deviceInfo.sessionId': sessionId
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }

    // Generate OTP
    const otp = '123456'; // Demo OTP
    const otpExpiry = new Date(Date.now() + 90 * 1000);

    // Store OTP
    const otpKey = `${req.user._id}`;
    otpStore[otpKey] = {
      otp,
      sessionId,
      session: session, // Store session info
      expiresAt: otpExpiry,
      deviceInfo,
      location,
      proximity,
      used: false
    };

    console.log('✅ OTP generated for real session:', session.title);

    res.json({
      message: 'OTP sent successfully',
      expiresIn: 90
    });

  } catch (error) {
    console.error('❌ OTP request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP and mark attendance
router.post('/verify', auth, async (req, res) => {
  try {
    const { otp, sessionId } = req.body;

    console.log('🔐 OTP verification started');
    console.log('👤 User:', req.user.name);
    console.log('🎯 Session ID:', sessionId);

    // Check if attendance already exists for this session
    const existingAttendance = await Attendance.findOne({
      student: req.user._id,
      session: sessionId
    });

    if (existingAttendance) {
      console.log('⚠️ Attendance already marked for this session');
      return res.status(400).json({
        message: 'Attendance already marked for this session',
        existingAttendance: {
          markedAt: existingAttendance.markedAt,
          status: existingAttendance.status
        }
      });
    }

    const key = `${req.user._id}`;
    const storedData = otpStore[key];

    if (!storedData || storedData.used || storedData.otp !== otp ||
      Date.now() > storedData.expiresAt || storedData.sessionId !== sessionId) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Mark as used
    otpStore[key].used = true;

    // Determine status based on timing (optional)
    const session = await Session.findById(sessionId);
    const sessionStart = new Date(session.startTime);
    const now = new Date();
    const minutesLate = Math.floor((now - sessionStart) / (1000 * 60));
    const status = minutesLate > 10 ? 'late' : 'present'; // Late if more than 10 minutes

    console.log('✅ OTP verified successfully');
    console.log('📅 Session start:', sessionStart);
    console.log('🕒 Current time:', now);
    console.log('⏰ Minutes late:', minutesLate);
    console.log('📊 Status:', status);

    // Create attendance record
    const attendance = new Attendance({
      student: req.user._id,
      session: sessionId,
      status: status,
      verification: {
        method: 'bluetooth',
        deviceInfo: {
          ...storedData.deviceInfo,
          sessionId: sessionId,
          sessionTitle: storedData.session.title,
          subject: storedData.session.subject,
          sessionCode: storedData.session.sessionCode
        },
        location: storedData.location,
        proximity: storedData.proximity,
        otp: {
          code: otp,
          verifiedAt: new Date()
        }
      }
    });

    await attendance.save();

    // Update session attendance count
    await Session.findByIdAndUpdate(sessionId, {
      $inc: { attendanceCount: 1 }
    });

    console.log('✅ Attendance marked successfully');

    res.json({
      message: `Attendance marked as ${status}!`,
      attendance: {
        status: status,
        markedAt: attendance.markedAt,
        markedTime: attendance.markedAt.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        session: {
          title: storedData.session.title,
          subject: storedData.session.subject
        }
      }
    });

  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Get attendance for a specific session (for teachers)
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log('👥 Loading attendance for session:', sessionId);

    // Find session and verify teacher owns it
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (req.user.role === 'teacher' && session.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get all attendance records for this session
    const attendanceRecords = await Attendance.find({ session: sessionId })
      .populate('student', 'name email rollNumber')
      .sort({ markedAt: -1 });

    // Calculate stats
    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.status === 'present').length,
      late: attendanceRecords.filter(r => r.status === 'late').length,
      absent: attendanceRecords.filter(r => r.status === 'absent').length
    };

    // Format attendance with better timestamps
    const formattedAttendance = attendanceRecords.map(record => ({
      _id: record._id,
      student: {
        name: record.student.name,
        email: record.student.email,
        rollNumber: record.student.rollNumber
      },
      status: record.status,
      markedAt: record.markedAt,
      markedTime: record.markedAt.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      verification: {
        method: record.verification.method,
        deviceInfo: record.verification.deviceInfo
      }
    }));

    console.log('✅ Attendance loaded:', stats);

    res.json({
      session: {
        title: session.title,
        subject: session.subject,
        room: session.room,
        startTime: session.startTime
      },
      attendance: formattedAttendance,
      stats
    });

  } catch (error) {
    console.error('❌ Session attendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance history
router.get('/history', auth, async (req, res) => {
  try {
    const attendance = await Attendance.find({ student: req.user._id })
      .limit(20)
      .sort({ markedAt: -1 });

    // Format attendance data for frontend
    const formattedAttendance = attendance.map(record => ({
      _id: record._id,
      status: record.status,
      markedAt: record.markedAt,
      session: {
        title: record.verification?.deviceInfo?.sessionTitle || 'Unknown Session',
        subject: record.verification?.deviceInfo?.subject || 'Unknown Subject'
      }
    }));

    res.json(formattedAttendance);
  } catch (error) {
    console.error('❌ History fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
