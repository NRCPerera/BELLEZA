const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { randomBytes } = require('crypto');
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

const requiredSeedEnv = ['MONGODB_URI', 'SEED_ADMIN_NAME', 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'];
const missingSeedEnv = requiredSeedEnv.filter((name) => !process.env[name]);
if (missingSeedEnv.length > 0) {
  throw new Error(`Missing required seed environment variables: ${missingSeedEnv.join(', ')}`);
}

if (process.env.SEED_ADMIN_PASSWORD.length < 12) {
  throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters');
}

const demoPassword = process.env.SEED_DEMO_PASSWORD || randomBytes(24).toString('base64url');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Staff.deleteMany({});
    await Service.deleteMany({});
    await Appointment.deleteMany({});
    console.log('Cleared existing data');

    // 1. Create admin user
    const admin = await User.create({
      name: process.env.SEED_ADMIN_NAME,
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      phone: process.env.SEED_ADMIN_PHONE || '',
      role: 'admin',
    });
    console.log('Admin user created');

    // Create sample customer
    const customer = await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: demoPassword,
      phone: '555-0101',
      role: 'customer',
    });

    const customer2 = await User.create({
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      password: demoPassword,
      phone: '555-0102',
      role: 'customer',
    });

    const staffUser = await User.create({
      name: 'Sophia Martinez',
      email: 'sophia@luxesalon.com',
      password: demoPassword,
      phone: '555-0201',
      role: 'staff',
      mustChangePassword: true,
    });
    console.log('✅ Sample customers created');

    // 2. Working hours template (Mon-Sat, 9am-6pm)
    const defaultWorkingHours = [
      { day: 'Monday', start: '09:00', end: '18:00' },
      { day: 'Tuesday', start: '09:00', end: '18:00' },
      { day: 'Wednesday', start: '09:00', end: '18:00' },
      { day: 'Thursday', start: '09:00', end: '18:00' },
      { day: 'Friday', start: '09:00', end: '18:00' },
      { day: 'Saturday', start: '10:00', end: '16:00' },
    ];

    const staff1 = await Staff.create({
      user: staffUser._id,
      name: 'Sophia Martinez',
      email: 'sophia@luxesalon.com',
      phone: '555-0201',
      bio: 'Master stylist with 10+ years of experience specializing in color transformations and precision cuts.',
      specialties: ['Hair Coloring', 'Precision Cuts', 'Balayage'],
      photo: '',
      workingHours: defaultWorkingHours,
      isActive: true,
    });

    const staff2 = await Staff.create({
      name: 'Emma Thompson',
      email: 'emma@luxesalon.com',
      phone: '555-0202',
      bio: 'Licensed esthetician passionate about skincare and helping clients achieve their best glow.',
      specialties: ['Facials', 'Skin Treatments', 'Chemical Peels'],
      photo: '',
      workingHours: defaultWorkingHours,
      isActive: true,
    });

    const staff3 = await Staff.create({
      name: 'Olivia Chen',
      email: 'olivia@luxesalon.com',
      phone: '555-0203',
      bio: 'Creative nail artist known for stunning nail art designs and meticulous attention to detail.',
      specialties: ['Nail Art', 'Gel Nails', 'Manicure & Pedicure'],
      photo: '',
      workingHours: defaultWorkingHours,
      isActive: true,
    });

    const staff4 = await Staff.create({
      name: 'Liam Brooks',
      email: 'liam@luxesalon.com',
      phone: '555-0204',
      bio: 'Award-winning stylist specializing in bridal and editorial hair styling.',
      specialties: ['Bridal Styling', 'Updos', 'Hair Extensions'],
      photo: '',
      workingHours: [
        { day: 'Tuesday', start: '10:00', end: '19:00' },
        { day: 'Wednesday', start: '10:00', end: '19:00' },
        { day: 'Thursday', start: '10:00', end: '19:00' },
        { day: 'Friday', start: '10:00', end: '19:00' },
        { day: 'Saturday', start: '09:00', end: '17:00' },
      ],
      isActive: true,
    });
    console.log('✅ 4 staff members created');

    // 3. Create services across 3 categories
    const service1 = await Service.create({
      name: 'Haircut & Styling',
      category: 'Hair',
      description: 'Professional haircut with wash, blow-dry, and styling tailored to your preference.',
      durationMinutes: 60,
      price: 65,
      assignedStaff: [staff1._id, staff4._id],
      isActive: true,
    });

    const service2 = await Service.create({
      name: 'Hair Coloring',
      category: 'Hair',
      description: 'Full hair color with premium products. Includes consultation, application, and styling.',
      durationMinutes: 120,
      price: 150,
      assignedStaff: [staff1._id],
      isActive: true,
    });

    const service3 = await Service.create({
      name: 'Deep Cleansing Facial',
      category: 'Skin',
      description: 'Rejuvenating facial treatment including cleansing, exfoliation, extraction, and hydrating mask.',
      durationMinutes: 60,
      price: 85,
      assignedStaff: [staff2._id],
      isActive: true,
    });

    const service4 = await Service.create({
      name: 'Anti-Aging Treatment',
      category: 'Skin',
      description: 'Advanced anti-aging treatment with collagen boost and LED light therapy.',
      durationMinutes: 90,
      price: 120,
      assignedStaff: [staff2._id],
      isActive: true,
    });

    const service5 = await Service.create({
      name: 'Gel Manicure',
      category: 'Nails',
      description: 'Long-lasting gel manicure with nail shaping, cuticle care, and your choice of gel color.',
      durationMinutes: 45,
      price: 45,
      assignedStaff: [staff3._id],
      isActive: true,
    });

    const service6 = await Service.create({
      name: 'Deluxe Pedicure',
      category: 'Nails',
      description: 'Luxury pedicure with foot soak, exfoliation, massage, and polish application.',
      durationMinutes: 60,
      price: 55,
      assignedStaff: [staff3._id],
      isActive: true,
    });
    console.log('✅ 6 services created across 3 categories');

    // 4. Create sample appointments
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    await Appointment.create([
      {
        customer: customer._id,
        staff: staff1._id,
        service: service1._id,
        date: tomorrow,
        startTime: '10:00',
        endTime: '11:00',
        status: 'confirmed',
        notes: 'First time client, wants a trim',
      },
      {
        customer: customer2._id,
        staff: staff2._id,
        service: service3._id,
        date: tomorrow,
        startTime: '14:00',
        endTime: '15:00',
        status: 'pending',
        notes: '',
      },
      {
        customer: customer._id,
        staff: staff3._id,
        service: service5._id,
        date: dayAfter,
        startTime: '11:00',
        endTime: '11:45',
        status: 'pending',
        notes: 'Prefers pink shades',
      },
      {
        customer: customer2._id,
        staff: staff1._id,
        service: service2._id,
        date: yesterday,
        startTime: '09:00',
        endTime: '11:00',
        status: 'completed',
        notes: 'Balayage - blonde highlights',
      },
      {
        customer: customer._id,
        staff: staff4._id,
        service: service1._id,
        date: lastWeek,
        startTime: '15:00',
        endTime: '16:00',
        status: 'cancelled',
        notes: '',
      },
    ]);
    console.log('✅ 5 sample appointments created');

    console.log('\n🎉 Seed completed successfully!');
    console.log('No default login credentials were created. Demo passwords are random unless SEED_DEMO_PASSWORD is supplied.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
