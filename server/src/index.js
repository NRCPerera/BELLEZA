const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const morgan = require('morgan');

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 5000;
const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Render terminates TLS before forwarding requests to this service.
if (isProduction) app.set('trust proxy', 1);

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
app.use(cookieParser());

const healthCheck = (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({ status: databaseReady ? 'ok' : 'degraded' });
};

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
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    throw new Error('MONGODB_URI and JWT_SECRET must be configured');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  server = app.listen(port, () => console.log(`API listening on port ${port}`));
};

start().catch((error) => {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
});
