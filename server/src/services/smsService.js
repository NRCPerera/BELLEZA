const TEXTLK_SEND_URL = 'https://app.text.lk/api/v3/sms/send';

// Normalize LK numbers to Text.lk format: 947XXXXXXXX (no +)
const normalizeRecipient = (raw) => {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    digits = `94${digits.slice(1)}`;
  } else if (digits.startsWith('94') && digits.length === 11) {
    digits = digits;
  } else if (digits.length === 9) {
    digits = `94${digits}`;
  }
  return digits;
};

const isValidRecipient = (digits) => /^94[1-9]\d{8}$/.test(digits);

const isSmsConfigured = () => Boolean(process.env.TEXTLK_API_KEY && process.env.TEXTLK_SENDER_ID);

const getPublicBaseUrl = () => {
  const first = String(process.env.CLIENT_URL || '').split(',')[0].trim().replace(/\/+$/, '');
  return first;
};

const buildTrackLink = (bookingRef) => {
  const base = getPublicBaseUrl();
  const path = `/t/${bookingRef}`;
  return base ? `${base}${path}` : path;
};

const sendSms = async ({ to, message }) => {
  const recipient = normalizeRecipient(to);
  if (!isValidRecipient(recipient)) {
    console.warn(`SMS not sent: invalid recipient "${to}"`);
    return { skipped: true, reason: 'invalid-recipient' };
  }
  if (!isSmsConfigured()) {
    console.warn(`SMS not sent to ${recipient}: TEXTLK_API_KEY/SENDER_ID not configured`);
    return { skipped: true, reason: 'not-configured' };
  }
  try {
    const response = await fetch(TEXTLK_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.TEXTLK_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        recipient,
        sender_id: process.env.TEXTLK_SENDER_ID,
        type: 'plain',
        message,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status === 'error') {
      throw new Error(data.message || `Text.lk request failed (${response.status})`);
    }
    console.log(`SMS sent to ${recipient} (uid: ${data.data?.uid || 'n/a'})`);
    return { sent: true, uid: data.data?.uid, recipient };
  } catch (error) {
    console.error('SMS send error:', error.message);
    return { sent: false, error: error.message, recipient };
  }
};

const formatDate = (date) => {
  try {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(date);
  }
};

const sendBookingSms = async ({ guestPhone, guestName, serviceName, staffName, date, startTime, endTime, bookingRef, trackLink }) => {
  const link = trackLink || buildTrackLink(bookingRef);
  const message =
    `Belleza: Hi ${guestName || 'there'}, booking ${bookingRef || ''} received. ` +
    `${serviceName} with ${staffName} on ${formatDate(date)} at ${startTime}. View: ${link}`;
  const result = await sendSms({ to: guestPhone, message: message.trim() });
  if (result.skipped) console.log(`[booking ${bookingRef}] track link (SMS skipped: ${result.reason}): ${link}`);
  else console.log(`[booking ${bookingRef}] track link: ${link}`);
  return result;
};

const sendStatusSms = async ({ guestPhone, guestName, serviceName, date, startTime, status, bookingRef, trackLink }) => {
  const statusText = {
    confirmed: 'CONFIRMED',
    cancelled: 'CANCELLED',
    completed: 'COMPLETED',
    'no-show': 'marked as NO-SHOW',
  }[status];
  if (!statusText) return { skipped: true, reason: 'unknown-status' };
  const link = trackLink || buildTrackLink(bookingRef);
  const message =
    `Belleza: Hi ${guestName || 'there'}, booking ${bookingRef || serviceName} on ${formatDate(date)} at ${startTime} is ${statusText}. View: ${link}`;
  const result = await sendSms({ to: guestPhone, message: message.trim() });
  if (result.skipped) console.log(`[booking ${bookingRef}] status ${status} link (SMS skipped: ${result.reason}): ${link}`);
  return result;
};

module.exports = {
  sendSms,
  sendBookingSms,
  sendStatusSms,
  normalizeRecipient,
  isSmsConfigured,
  buildTrackLink,
};
