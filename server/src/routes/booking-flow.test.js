const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.COOKIE_SAME_SITE = 'lax';

const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const User = require('../models/User');
const appointmentsRouter = require('./appointments');

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/appointments', appointmentsRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('guest booking can be created, listed as unavailable, and cancelled by an admin', async () => {
  const workingHours = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    .map((day) => ({ day, start: '08:00', end: '18:00' }));
  const staff = await Staff.create({ name: 'Flow Tester', email: 'flow-staff@example.com', workingHours });
  const service = await Service.create({ name: 'Flow Service', category: 'Test', durationMinutes: 60, price: 100, assignedStaff: [staff._id] });
  const admin = await User.create({ name: 'Admin Tester', email: 'flow-admin@example.com', password: 'StrongPassword123', role: 'admin', csrfToken: 'csrf-test-token' });

  const future = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const created = await request(app).post('/api/appointments').send({
    staffId: staff._id.toString(), serviceId: service._id.toString(), date: future,
    startTime: '10:00', guestName: 'Booking Tester', guestPhone: '0771234567', guestEmail: 'booking@example.com',
  });
  expect(created.status).toBe(201);
  expect(created.body.bookingRef).toMatch(/^BZ-/);

  const slots = await request(app).get('/api/appointments/slots').query({ staffId: staff._id.toString(), serviceId: service._id.toString(), date: future });
  expect(slots.status).toBe(200);
  expect(slots.body).not.toContain('10:00');

  const token = jwt.sign({ id: admin._id, sessionVersion: 0 }, process.env.JWT_SECRET, { algorithm: 'HS256' });
  const cancelled = await request(app)
    .put(`/api/appointments/${created.body._id}/cancel`)
    .set('Cookie', [`auth_token=${token}`, 'csrf_token=csrf-test-token'])
    .set('X-CSRF-Token', 'csrf-test-token');
  expect(cancelled.status).toBe(200);
  expect(cancelled.body.status).toBe('cancelled');
  expect((await Appointment.findById(created.body._id).lean()).status).toBe('cancelled');
}, 30000);
