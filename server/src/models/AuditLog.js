const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  event: { type: String, required: true, maxlength: 100, index: true },
  targetType: { type: String, default: '', maxlength: 50 },
  targetId: { type: String, default: '', maxlength: 64 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, expires: 31536000 },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
