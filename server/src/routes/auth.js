const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  mustChangePassword: user.mustChangePassword,
});

// @route   POST /api/auth/register
// @desc    Customer self-registration disabled (guest booking via mobile + SMS)
// @access  Disabled
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim(),
  ],
  (req, res) => res.status(410).json({ message: 'Customer registration is disabled. Book as a guest with your mobile number.' })
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Customer login removed: guest booking via mobile + SMS. Staff/admin only.
      if (user.role === 'customer') {
        return res.status(403).json({ message: 'Customer login is disabled. Book as a guest with your mobile number.' });
      }

      const token = generateToken(user._id);
      res.cookie('auth_token', token, authCookieOptions());

      res.json({
        token,
        user: publicUser(user),
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/logout
// @desc    Clear the API authentication cookie
router.post('/logout', (req, res) => {
  const { maxAge, ...options } = authCookieOptions();
  res.clearCookie('auth_token', options);
  res.json({ message: 'Logged out' });
});

// @route   GET /api/auth/me
// @desc    Get current user from JWT
// @access  Private
router.get('/me', authenticate, (req, res) => {
  res.json(publicUser(req.user));
});

// @route   POST /api/auth/change-password
// @desc    Change the authenticated user's password
// @access  Private
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user._id).select('+password');
      const isMatch = await user.comparePassword(req.body.currentPassword);

      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      user.password = req.body.newPassword;
      user.mustChangePassword = false;
      await user.save();

      res.json({
        message: 'Password changed successfully',
        user: publicUser(user),
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
