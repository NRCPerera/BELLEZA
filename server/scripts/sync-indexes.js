require('dotenv').config();

const mongoose = require('mongoose');
const models = [
  require('../src/models/Appointment'),
  require('../src/models/User'),
  require('../src/models/Service'),
  require('../src/models/Staff'),
  require('../src/models/SlotBlock'),
  require('../src/models/PortfolioPhoto'),
  require('../src/models/BookingLock'),
];

async function main() {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI, { maxPoolSize: 2, serverSelectionTimeoutMS: 8000, autoIndex: false });
  for (const model of models) {
    const diff = await model.diffIndexes();
    console.log(JSON.stringify({ model: model.modelName, apply, ...diff }));
    if (apply) await model.syncIndexes();
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(`Index sync failed: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
