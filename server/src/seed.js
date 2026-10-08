const mongoose = require('mongoose');
const dotenv = require('dotenv');

const User = require('./models/User');
const Staff = require('./models/Staff');
const Service = require('./models/Service');
const Appointment = require('./models/Appointment');

dotenv.config();

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seeding is disabled in production');
}

if (process.env.ALLOW_SEED !== 'true') {
  throw new Error('Set ALLOW_SEED=true to run the destructive development seed');
}

const requiredSeedEnv = [
  'MONGODB_URI',
  'SEED_ADMIN_NAME',
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
  'SEED_PRIYANANDA_PASSWORD',
  'SEED_SASANKA_PASSWORD',
];

const missingSeedEnv = requiredSeedEnv.filter((name) => !process.env[name]);

if (missingSeedEnv.length > 0) {
  throw new Error(
    `Missing required seed environment variables: ${missingSeedEnv.join(', ')}`
  );
}

for (const name of requiredSeedEnv.filter((name) => name.endsWith('_PASSWORD'))) {
  const minLength = name === 'SEED_ADMIN_PASSWORD' ? 12 : 8;
  if (process.env[name].length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters`);
  }
}

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // ============================================================
    // CLEAR ALL EXISTING DATA
    // ============================================================

    await User.deleteMany({});
    await Staff.deleteMany({});
    await Service.deleteMany({});
    await Appointment.deleteMany({});

    console.log('Cleared existing data');

    // ============================================================
    // 1. CREATE ADMIN USER
    // ============================================================

    await User.create({
      name: process.env.SEED_ADMIN_NAME,
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      phone: process.env.SEED_ADMIN_PHONE || '',
      role: 'admin',
    });

    console.log('Admin user created');

    // ============================================================
    // 2. WORKING HOURS
    // ============================================================

    const defaultWorkingHours = [
      { day: 'Monday', start: '10:00', end: '21:00' },
      { day: 'Tuesday', start: '09:30', end: '21:00' },
      { day: 'Wednesday', start: '09:30', end: '21:00' },
      { day: 'Thursday', start: '09:30', end: '21:00' },
      { day: 'Friday', start: '09:30', end: '21:00' },
      { day: 'Saturday', start: '09:30', end: '22:00' },
      { day: 'Sunday', start: '09:30', end: '22:00' },
    ];

    // ============================================================
    // 3. CREATE ONLY THE TWO STAFF MEMBERS
    // ============================================================

    const staffUser1 = await User.create({
      name: 'Priyananda',
      email: 'priyananda@belleza.lk',
      password: process.env.SEED_PRIYANANDA_PASSWORD,
      role: 'staff',
      mustChangePassword: true,
    });

    const staffUser2 = await User.create({
      name: 'Sasanka Prabath',
      email: 'sasanka.prabath@belleza.lk',
      password: process.env.SEED_SASANKA_PASSWORD,
      role: 'staff',
      mustChangePassword: true,
    });

    const staff1 = await Staff.create({
      user: staffUser1._id,
      name: 'Priyananda',
      email: 'priyananda@belleza.lk',
      phone: '',
      bio: '',
      specialties: [],
      photo: '',
      workingHours: defaultWorkingHours,
      isActive: true,
    });

    const staff2 = await Staff.create({
      user: staffUser2._id,
      name: 'Sasanka Prabath',
      email: 'sasanka.prabath@belleza.lk',
      phone: '',
      bio: '',
      specialties: [],
      photo: '',
      workingHours: defaultWorkingHours,
      isActive: true,
    });

    console.log('2 staff members created with linked staff login users');

    // ============================================================
    // 4. CREATE SERVICES
    // ============================================================
    //
    // Prices are in LKR. Every service now has a price.
    // Both staff members are assigned to all services.
    // ============================================================

    const services = [
      {
        name: 'Hair Cut',
        category: 'Hair',
        description: '',
        durationMinutes: 60,
        price: 750,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Hair & Beard',
        category: 'Hair',
        description: '',
        durationMinutes: 60,
        price: 1500,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Beard',
        category: 'Hair',
        description: '',
        durationMinutes: 30,
        price: 700,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Hair, Beard & Scrub',
        category: 'Hair',
        description: '',
        durationMinutes: 60,
        price: 1700,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Head Massage',
        category: 'Hair',
        description: '',
        durationMinutes: 30,
        price: 500,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Hair Setting for Men',
        category: 'Hair',
        description: '',
        durationMinutes: 30,
        price: 1000,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: "Ladies' Hair Cut",
        category: 'Hair',
        description: '',
        durationMinutes: 60,
        price: 2500,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Eyebrow Shape',
        category: 'Beauty',
        description: '',
        durationMinutes: 15,
        price: 300,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Cleanup',
        category: 'Beauty',
        description: '',
        durationMinutes: 45,
        price: 2000,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Facial',
        category: 'Beauty',
        description: '',
        durationMinutes: 60,
        price: 3000,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Blow-dry Setting',
        category: 'Hair',
        description: '',
        durationMinutes: 30,
        price: 1500,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Oil Treatment',
        category: 'Hair',
        description: '',
        durationMinutes: 60,
        price: 2500,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Conditioner Treatment',
        category: 'Hair',
        description: '',
        durationMinutes: 60,
        price: 2500,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Hair Colour',
        category: 'Hair',
        description: '',
        durationMinutes: 120,
        price: 5000,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Hair Straightening',
        category: 'Hair',
        description: '',
        durationMinutes: 120,
        price: 5000,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Keratin Treatment',
        category: 'Hair',
        description: '',
        durationMinutes: 120,
        price: 7500,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },

      {
        name: 'Perm',
        category: 'Hair',
        description: '',
        durationMinutes: 120,
        price: 5000,
        assignedStaff: [staff1._id, staff2._id],
        isActive: true,
      },
    ];

    // Safety net: any service that still has no price gets a temporary one
    // so nothing is saved with a null price. Currently none are affected.
    const TEMP_PRICE = 1000;
    services.forEach((service) => {
      if (service.price === null || service.price === undefined) {
        console.warn(`No price set for "${service.name}" - using temporary price ${TEMP_PRICE}`);
        service.price = TEMP_PRICE;
      }
    });

    await Service.insertMany(services);

    console.log(`${services.length} services created`);

    // ============================================================
    // 5. NO CUSTOMERS
    // 6. NO APPOINTMENTS
    // ============================================================

    console.log('No demo customers created');
    console.log('No sample appointments created');

    console.log('\n========================================');
    console.log('🎉 Seed completed successfully!');
    console.log('========================================');
    console.log('Staff: 2');
    console.log('Staff login users: 2');
    console.log(`Services: ${services.length}`);
    console.log('Customers: 0');
    console.log('Appointments: 0');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
