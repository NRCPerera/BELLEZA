const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendWithResend = async (mailOptions) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailOptions.from,
      to: [mailOptions.to],
      subject: mailOptions.subject,
      html: mailOptions.html,
    }),
  });

  if (!response.ok) throw new Error(`Resend request failed (${response.status})`);
};

// Absolute logo URL for email clients (relative paths don't work in email)
const logoUrl = () => {
  const base = String(process.env.CLIENT_URL || '').split(',')[0].trim().replace(/\/+$/, '');
  return base ? `${base}/logo.jpg` : '';
};

const logoImg = (alt) => {
  const url = logoUrl();
  return url
    ? `<img src="${url}" alt="${alt || 'Belleza'}" style="height:64px; background:#ffffff; border-radius:12px; padding:6px 12px;" />`
    : '';
};

// Resend is the production default. SMTP remains available for local or legacy deployments.
const sendEmail = async (mailOptions) => {
  if (process.env.RESEND_API_KEY) return sendWithResend(mailOptions);
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return createTransporter().sendMail(mailOptions);
  }
  console.warn('Email not sent: no email provider is configured');
};

const sendBookingConfirmation = async (appointment) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: appointment.customerEmail,
      subject: 'Your appointment at Luxe Salon is confirmed!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fdf2f8; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #e11d48, #f43f5e); padding: 32px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 28px; }
            .header p { color: #fecdd3; margin: 8px 0 0; font-size: 14px; }
            .content { padding: 32px; }
            .greeting { font-size: 18px; color: #1f2937; margin-bottom: 16px; }
            .details { background: #fdf2f8; border-radius: 12px; padding: 24px; margin: 16px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fce7f3; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #6b7280; font-size: 14px; }
            .detail-value { color: #1f2937; font-weight: 600; font-size: 14px; }
            .footer { padding: 24px 32px; background: #fdf2f8; text-align: center; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoImg('Belleza')}
              <h1>✨ Luxe Salon</h1>
              <p>Your beauty appointment is booked!</p>
            </div>
            <div class="content">
              <p class="greeting">Hi ${appointment.customerName},</p>
              <p style="color: #4b5563;">Your appointment has been successfully booked. Here are the details:</p>
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Service</span>
                  <span class="detail-value">${appointment.serviceName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Stylist</span>
                  <span class="detail-value">${appointment.staffName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date</span>
                  <span class="detail-value">${appointment.date}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time</span>
                  <span class="detail-value">${appointment.startTime} - ${appointment.endTime}</span>
                </div>
              </div>
              <p style="color: #4b5563; font-size: 14px;">We look forward to seeing you! If you need to make any changes, please log in to your account or contact us directly.</p>
            </div>
            <div class="footer">
              <p>Luxe Salon &bull; Where beauty meets luxury</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await sendEmail(mailOptions);
    console.log(`Booking confirmation email sent to ${appointment.customerEmail}`);
  } catch (error) {
    console.error('Error sending booking confirmation email:', error.message);
    // Don't throw - email failure shouldn't break the booking
  }
};

const sendStatusUpdateEmail = async (appointment, newStatus) => {
  try {
    const statusMessages = {
      confirmed: {
        subject: 'Your Luxe Salon appointment is confirmed! ✅',
        message: 'Great news! Your appointment has been confirmed by our team.',
        color: '#10b981',
      },
      cancelled: {
        subject: 'Your Luxe Salon appointment has been cancelled',
        message: 'Your appointment has been cancelled. If this was a mistake, please book a new appointment or contact us.',
        color: '#ef4444',
      },
      completed: {
        subject: 'Thanks for visiting Luxe Salon! 💖',
        message: 'Thank you for choosing Luxe Salon. We hope you loved your experience!',
        color: '#6b7280',
      },
    };

    const statusInfo = statusMessages[newStatus];
    if (!statusInfo) return;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: appointment.customerEmail,
      subject: statusInfo.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fdf2f8; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #e11d48, #f43f5e); padding: 32px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 28px; }
            .content { padding: 32px; }
            .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; color: #fff; font-weight: 600; font-size: 14px; background: ${statusInfo.color}; }
            .footer { padding: 24px 32px; background: #fdf2f8; text-align: center; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoImg('Belleza')}
              <h1>✨ Luxe Salon</h1>
            </div>
            <div class="content">
              <p style="font-size: 18px; color: #1f2937;">Hi ${appointment.customerName},</p>
              <p style="color: #4b5563;">${statusInfo.message}</p>
              <p style="margin: 16px 0;">Status: <span class="status-badge">${newStatus.toUpperCase()}</span></p>
              <div style="background: #fdf2f8; border-radius: 12px; padding: 16px; margin: 16px 0;">
                <p style="margin: 4px 0; color: #4b5563;"><strong>Service:</strong> ${appointment.serviceName}</p>
                <p style="margin: 4px 0; color: #4b5563;"><strong>Date:</strong> ${appointment.date}</p>
                <p style="margin: 4px 0; color: #4b5563;"><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
              </div>
            </div>
            <div class="footer">
              <p>Luxe Salon &bull; Where beauty meets luxury</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await sendEmail(mailOptions);
    console.log(`Status update email (${newStatus}) sent to ${appointment.customerEmail}`);
  } catch (error) {
    console.error('Error sending status update email:', error.message);
  }
};

module.exports = { sendBookingConfirmation, sendStatusUpdateEmail };
