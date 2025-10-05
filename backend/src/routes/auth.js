const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, rollNumber, role, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { rollNumber: rollNumber || null }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user (password will be hashed automatically by the User model)
    const user = new User({
      name,
      email,
      rollNumber: rollNumber || undefined,
      role,
      password // This will be hashed by the pre-save middleware
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login - FIXED VERSION
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    console.log('🔄 Login attempt for:', identifier); // Debug log
    
    // Find user by email or rollNumber and include password field
    const user = await User.findOne({
      $or: [{ email: identifier }, { rollNumber: identifier }]
    }).select('+password'); // Important: explicitly select password field

    console.log('👤 User found:', user ? 'Yes' : 'No'); // Debug log

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('🔐 Comparing passwords...'); // Debug log
    
    // Check password using the model method
    const isMatch = await user.comparePassword(password);
    console.log('✅ Password match:', isMatch); // Debug log
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
