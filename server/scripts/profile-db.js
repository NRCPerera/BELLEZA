require('dotenv').config();

const mongoose = require('mongoose');
const Appointment = require('../src/models/Appointment');
const User = require('../src/models/User');
const Service = require('../src/models/Service');
const Staff = require('../src/models/Staff');

const summarize = (name, explanation) => {
  const stats = explanation.executionStats;
  const plan = explanation.queryPlanner.winningPlan;
  const root = plan.queryPlan || plan;
  const findIndex = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (node.indexName) return node.indexName;
    for (const value of Object.values(node)) {
      const found = findIndex(value);
      if (found) return found;
    }
    return null;
  };
  return {
    name,
    stage: root.stage,
    index: findIndex(root),
    returned: stats.nReturned,
    docsExamined: stats.totalDocsExamined,
    keysExamined: stats.totalKeysExamined,
    executionMs: stats.executionTimeMillis,
  };
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 8000,
    autoIndex: false,
  });

  const [sampleAppointment, sampleUser] = await Promise.all([
    Appointment.findOne().select('staff customer dayKey').lean(),
    User.findOne().select('email').lean(),
  ]);
  const staffId = sampleAppointment?.staff || new mongoose.Types.ObjectId();
  const customerId = sampleAppointment?.customer || new mongoose.Types.ObjectId();
  const dayKey = sampleAppointment?.dayKey || new Date().toISOString().slice(0, 10);

  const queries = [
    ['availability', Appointment.find({ staff: staffId, dayKey, status: { $ne: 'cancelled' } }).select('startTime endTime status')],
    ['admin-status-date', Appointment.find({ status: 'confirmed', date: { $gte: new Date('2020-01-01'), $lte: new Date('2035-01-01') } }).sort({ date: -1 })],
    ['customer-history', Appointment.find({ customer: customerId }).sort({ date: -1 })],
    ['active-services', Service.find({ isActive: true }).sort({ category: 1 })],
    ['active-staff', Staff.find({ isActive: true })],
    ['user-email', User.findOne({ email: sampleUser?.email || 'profile@example.invalid' })],
  ];

  for (const [name, query] of queries) {
    const explanation = await query.explain('executionStats');
    console.log(JSON.stringify(summarize(name, explanation)));
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(`Database profiling failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
