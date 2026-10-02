const mongoose = require('mongoose');
const Service = require('../models/Service');

// Keep a staff member's bookable services and display specialties in sync.
const syncStaffServices = async (staff, serviceIds) => {
  if (serviceIds === undefined) return staff;

  if (!Array.isArray(serviceIds)) {
    const error = new Error('Services must be provided as a list');
    error.statusCode = 400;
    throw error;
  }

  const ids = [...new Set(serviceIds.map(String))];
  if (!ids.every((id) => mongoose.isValidObjectId(id))) {
    const error = new Error('One or more selected services are invalid');
    error.statusCode = 400;
    throw error;
  }

  const services = await Service.find({ _id: { $in: ids }, isActive: true }).select('name');
  if (services.length !== ids.length) {
    const error = new Error('One or more selected services are unavailable');
    error.statusCode = 400;
    throw error;
  }

  const servicesById = new Map(services.map((service) => [service._id.toString(), service]));

  await Service.updateMany(
    { assignedStaff: staff._id },
    { $pull: { assignedStaff: staff._id } }
  );
  if (ids.length > 0) {
    await Service.updateMany(
      { _id: { $in: ids } },
      { $addToSet: { assignedStaff: staff._id } }
    );
  }

  staff.specialties = ids.map((id) => servicesById.get(id).name);
  await staff.save();
  return staff;
};

module.exports = { syncStaffServices };
