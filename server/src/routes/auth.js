const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { audit } = require('../services/auditLog');

const router = express.Router();

const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  maxAge: 8 * 60 * 60 * 1000,
});

const csrfCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  maxAge: 8 * 60 * 60 * 1000,
});

// Generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user._id, sessionVersion: user.sessionVersion }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' });
};

const passwordPolicy = body('newPassword')
  .isString().isLength({ min: 12, max: 128 }).withMessage('Password must be 12 to 128 characters')
  .matches(/[a-z]/).withMessage('Password must include a lowercase letter')
  .matches(/[A-Z]/).withMessage('Password must include an uppercase letter')
  .matches(/[0-9]/).withMessage('Password must include a number');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many sign-in attempts. Please try again later.' } });
const dummyHash = bcrypt.hashSync('not-a-real-password', 12);

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  mustChangePassword: user.mustChangePassword,
});

// @route   POST /api/auth/register
// @desc    Customer self-registration disabled (guest booking via mobile)
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
  loginLimiter,
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

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail }).select('+password +sessionVersion +csrfToken +failedLoginAttempts +lockUntil');
      if (!user || user.role === 'customer') {
        await bcrypt.compare(password, dummyHash);
        await audit('auth.login_failed', { metadata: { email: normalizedEmail, reason: 'invalid_credentials' } });
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      if (user.lockUntil && user.lockUntil > new Date()) return res.status(401).json({ message: 'Invalid email or password' });

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          user.failedLoginAttempts = 0;
        }
        await user.save({ validateBeforeSave: false });
        await audit('auth.login_failed', { actor: user._id, metadata: { reason: 'invalid_credentials' } });
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      // Upgrade hashes created before the cost-12 policy on successful sign-in.
      // Legacy weak passwords are instead forced through the password-change flow.
      if (bcrypt.getRounds(user.password) < 12) {
        if (password.length >= 12) user.password = password;
        else user.mustChangePassword = true;
      }
      user.csrfToken = crypto.randomBytes(32).toString('hex');
      await user.save({ validateBeforeSave: false });
      const token = generateToken(user);
      res.cookie('auth_token', token, authCookieOptions());
      res.cookie('csrf_token', user.csrfToken, csrfCookieOptions());
      audit('auth.login_success', { actor: user._id, metadata: { role: user.role } });

      res.json({
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
router.post('/logout', authenticate, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $inc: { sessionVersion: 1 }, $set: { csrfToken: '' } });
  const { maxAge, ...options } = authCookieOptions();
  res.clearCookie('auth_token', options);
  const { maxAge: csrfMaxAge, ...csrfOptions } = csrfCookieOptions();
  res.clearCookie('csrf_token', csrfOptions);
  audit('auth.logout', { actor: req.user._id });
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
    passwordPolicy,
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user._id).select('+password +sessionVersion +csrfToken');
      const isMatch = await user.comparePassword(req.body.currentPassword);

      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      user.password = req.body.newPassword;
      user.mustChangePassword = false;
      user.sessionVersion += 1;
      user.csrfToken = crypto.randomBytes(32).toString('hex');
      await user.save();
      const token = generateToken(user);
      res.cookie('auth_token', token, authCookieOptions());
      res.cookie('csrf_token', user.csrfToken, csrfCookieOptions());
      audit('auth.password_changed', { actor: user._id });

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
