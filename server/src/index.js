const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const compression = require('compression');
const pinoHttp = require('pino-http');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { loadEnv } = require('./config/env');
const { rejectNoSqlOperators } = require('./middleware/security');
const logger = require('./services/logger');

dotenv.config();
const env = loadEnv();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 5000;
const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Log only queries slow enough to act on; never log parameter values.
mongoose.plugin((schema) => {
  schema.pre(/^find|^count|^aggregate/, function queryTimer() { this._startedAt = process.hrtime.bigint(); });
  schema.post(/^find|^count|^aggregate/, function queryTiming(_result, next) {
    if (this._startedAt) {
      const durationMs = Number(process.hrtime.bigint() - this._startedAt) / 1e6;
      if (durationMs >= Number(process.env.SLOW_QUERY_MS || 100)) {
        logger.warn({ model: this.model?.modelName, operation: this.op, durationMs: Math.round(durationMs) }, 'slow MongoDB query');
      }
    }
    next();
  });
});

// Render terminates TLS before forwarding requests to this service.
if (isProduction) app.set('trust proxy', 1);

app.disable('x-powered-by');
app.set('etag', 'strong');
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'], mediaSrc: ["'self'", 'https://res.cloudinary.com'],
    connectSrc: ["'self'", ...clientOrigins], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"], formAction: ["'self'"], upgradeInsecureRequests: isProduction ? [] : null,
  }},
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));
app.use(pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/api/health' },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}));
app.use(compression({ threshold: 1024 }));
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
  res.set('Cache-Control', 'no-store');
  res.status(databaseReady ? 200 : 503).json({ status: databaseReady ? 'ok' : 'degraded' });
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
  logger.error({ err: error }, 'MongoDB connection error');
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
    req.log.error({ status }, 'request failed');
  } else {
    req.log.error({ err }, 'request failed');
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
  logger.info({ signal }, 'shutting down');

  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'shutdown failed');
    process.exit(1);
  }
};

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

const start = async () => {
  const connection = await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    minPoolSize: 0,
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    maxIdleTimeMS: 60000,
    autoIndex: !isProduction,
  });
  logger.info({ database: connection.connection.name }, 'MongoDB connected');
  server = app.listen(port, '0.0.0.0', () => logger.info({ port }, 'API listening'));
};

start().catch((error) => {
  logger.fatal({ err: error }, 'startup failed');
  process.exit(1);
});
