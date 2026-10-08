const AuditLog = require('../models/AuditLog');

const audit = (event, { actor, targetType, targetId, metadata } = {}) =>
  AuditLog.create({ event, actor: actor || null, targetType: targetType || '', targetId: targetId ? String(targetId) : '', metadata: metadata || {} })
    .catch(() => {});

module.exports = { audit };
