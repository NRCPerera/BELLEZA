const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://salon-proj-mu.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

// Middleware
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests and configured frontend origins.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/staff/me', require('./routes/staffMe'));
app.use('/api/staff/me/portfolio', require('./routes/portfolio'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/portfolio', require('./routes/portfolio'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Luxe Salon API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
