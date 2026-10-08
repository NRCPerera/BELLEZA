const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { csrfProtection } = require('./security');

// Protect routes - verify JWT token
const authenticate = async (req, res, next) => {
  let token;

  token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = await User.findById(decoded.id).select('+sessionVersion +csrfToken');
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (decoded.sessionVersion !== req.user.sessionVersion) return res.status(401).json({ message: 'Authentication required' });
    if (req.user.mustChangePassword && !req.originalUrl.endsWith('/auth/me') && !req.originalUrl.endsWith('/auth/change-password')) {
      return res.status(403).json({ message: 'Password change required', code: 'PASSWORD_CHANGE_REQUIRED' });
    }
    return csrfProtection(req, res, next);
  } catch (error) {
    return res.status(401).json({ message: 'Authentication required' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to access this resource' });
  }

  next();
};

// Backwards-compatible aliases for any external route modules.
const protect = authenticate;
const adminOnly = authorize('admin');

module.exports = { authenticate, authorize, protect, adminOnly };
