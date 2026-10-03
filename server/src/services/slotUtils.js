const timeToMinutes = (timeStr) => {
  const [hours, minutes] = String(timeStr).split(':').map(Number);
  return hours * 60 + minutes;
};

const overlapsRange = (aStart, aEnd, bStart, bEnd) => {
  const s1 = typeof aStart === 'string' ? timeToMinutes(aStart) : aStart;
  const e1 = typeof aEnd === 'string' ? timeToMinutes(aEnd) : aEnd;
  const s2 = typeof bStart === 'string' ? timeToMinutes(bStart) : bStart;
  const e2 = typeof bEnd === 'string' ? timeToMinutes(bEnd) : bEnd;
  return s1 < e2 && e1 > s2;
};

const dayBoundsUTC = (dateInput) => {
  const startOfDay = new Date(dateInput);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(dateInput);
  endOfDay.setUTCHours(23, 59, 59, 999);
  return { startOfDay, endOfDay };
};

// Day key in YYYY-MM-DD derived from the caller's calendar date string.
// Avoids UTC-shift bugs for Asia/Colombo (UTC+5:30): "2026-10-05" stays 2026-10-05.
const toDayKey = (dateInput) => {
  if (typeof dateInput === 'string') {
    const m = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return new Date(dateInput).toISOString().split('T')[0];
};

const isValidDayKey = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());

const isPastDate = (dateInput) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(dateInput);
  target.setUTCHours(0, 0, 0, 0);
  return target < today;
};

// Current time in Asia/Colombo for same-day cutoff checks
const getColomboNow = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return {
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
};

// Reject same-day slots that already passed (with lead buffer for prep)
const isPastSlotToday = (dayKey, startTime, leadMinutes = 30, now = new Date()) => {
  const colombo = getColomboNow(now);
  if (dayKey !== colombo.dateStr) return false;
  const [h, m] = String(startTime).split(':').map(Number);
  return h * 60 + m <= colombo.minutes + leadMinutes;
};

module.exports = { timeToMinutes, overlapsRange, dayBoundsUTC, isPastDate, toDayKey, isValidDayKey, getColomboNow, isPastSlotToday };
