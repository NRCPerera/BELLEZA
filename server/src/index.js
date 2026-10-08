const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { loadEnv } = require('./config/env');
const { rejectNoSqlOperators } = require('./middleware/security');

dotenv.config();
const env = loadEnv();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 5000;
const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Render terminates TLS before forwarding requests to this service.
if (isProduction) app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'], mediaSrc: ["'self'", 'https://res.cloudinary.com'],
    connectSrc: ["'self'", ...clientOrigins], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"], formAction: ["'self'"], upgradeInsecureRequests: isProduction ? [] : null,
  }},
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));
app.use(morgan(isProduction ? 'combined' : 'dev', {
  skip: (req) => req.path === '/health' || req.path === '/api/health',
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || clientOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(cookieParser());
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(rejectNoSqlOperators);
app.use(hpp());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Please try again later.' } }));

const healthCheck = (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({ status: databaseReady ? 'ok' : 'degraded' });
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error(`MongoDB connection error: ${error.message}`);
});

app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/staff/me', require('./routes/staffMe'));
app.use('/api/staff/me/portfolio', require('./routes/portfolio'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/portfolio', require('./routes/portfolio'));

app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : (isProduction ? 'Internal server error' : err.message);

  // Do not log request bodies, headers, connection strings, or stack traces in production.
  if (isProduction) {
    console.error(`Request failed: ${req.method} ${req.path} (${status})`);
  } else {
    console.error(err);
  }

  res.status(status).json({
    message: message || 'Internal server error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

let server;
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down`);

  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Shutdown failed');
    process.exit(1);
  }
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

const start = async () => {
  const connection = await mongoose.connect(env.MONGODB_URI);
  console.log(`MongoDB connected to ${connection.connection.host}/${connection.connection.name}`);
  server = app.listen(port, '0.0.0.0', () => console.log(`API listening on port ${port}`));
};

start().catch((error) => {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
});
