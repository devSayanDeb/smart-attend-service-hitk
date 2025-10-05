const express = require('express');
const Session = require('../models/Session');
const { auth, authorize } = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

// Create new session (teacher only)
router.post('/', auth, async (req, res) => {
  try {
    console.log('📝 Session creation request from:', req.user.name);
    console.log('📋 Session data:', req.body);
    
    // Check if user is teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can create sessions' });
    }

    const { title, subject, course, room, duration, startTime, endTime } = req.body;
    
    // Generate unique identifiers
    const beaconUUID = crypto.randomUUID();
    const sessionCode = generateSessionCode();
    
    const sessionData = {
      title,
      subject,
      course,
      room,
      teacher: req.user._id,
      beaconUUID,
      sessionCode,
      startTime: startTime || new Date(),
      endTime: endTime || new Date(Date.now() + (duration || 60) * 60000),
      duration: duration || 60,
      status: 'scheduled'
    };

    console.log('💾 Creating session with data:', sessionData);
    
    const session = new Session(sessionData);
    await session.save();
    
    console.log('✅ Session created successfully:', session._id);
    
    // Populate teacher info for response
    await session.populate('teacher', 'name email');
    
    res.status(201).json(session);
    
  } catch (error) {
    console.error('❌ Session creation error:', error);
    res.status(400).json({ 
      message: 'Failed to create session', 
      error: error.message,
      details: error.errors
    });
  }
});

// Get user sessions
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'teacher') {
      query.teacher = req.user._id;
    }
    
    const sessions = await Session.find(query)
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(sessions);
  } catch (error) {
    console.error('❌ Sessions fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start session
router.post('/:id/start', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can start sessions' });
    }

    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      { 
        status: 'active',
        'metadata.actualStartTime': new Date()
      },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found or unauthorized' });
    }
    
    console.log('▶️ Session started:', session.title);
    res.json(session);
  } catch (error) {
    console.error('❌ Start session error:', error);
    res.status(400).json({ message: 'Failed to start session', error: error.message });
  }
});

// End session
router.post('/:id/end', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can end sessions' });
    }

    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      { 
        status: 'ended',
        'metadata.actualEndTime': new Date()
      },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found or unauthorized' });
    }
    
    console.log('⏹️ Session ended:', session.title);
    res.json(session);
  } catch (error) {
    console.error('❌ End session error:', error);
    res.status(400).json({ message: 'Failed to end session', error: error.message });
  }
});

// Helper function to generate session code
function generateSessionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = router;
