const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getUser, createUser, getUserByEmail } = require('../utils/database');

const router = express.Router();

// Register new user (for extension users)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('extensionId').isLength({ min: 32, max: 32 }).matches(/^[a-z]{32}$/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, extensionId } = req.body;

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user
    const userId = uuidv4();
    const user = await createUser({
      id: userId,
      email,
      extensionId,
      plan: 'free',
      analysesUsed: 0,
      analysesLimit: parseInt(process.env.MAX_FREE_ANALYSES_PER_USER) || 3,
      createdAt: new Date().toISOString()
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, plan: user.plan },
      process.env.JWT_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRY || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        analysesUsed: user.analysesUsed,
        analysesLimit: user.analysesLimit
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login existing user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('extensionId').isLength({ min: 32, max: 32 }).matches(/^[a-z]{32}$/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, extensionId } = req.body;

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify extension ID matches
    if (user.extensionId !== extensionId) {
      return res.status(401).json({ error: 'Extension ID mismatch' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, plan: user.plan },
      process.env.JWT_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRY || '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        analysesUsed: user.analysesUsed,
        analysesLimit: user.analysesLimit
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await getUser(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        analysesUsed: user.analysesUsed,
        analysesLimit: user.analysesLimit,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

module.exports = router;
module.exports.authenticateToken = authenticateToken;