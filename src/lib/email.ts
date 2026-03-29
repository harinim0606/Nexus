import nodemailer from 'nodemailer';

const hasSmtp =
  Boolean(process.env.SMTP_USER) && Boolean(process.env.SMTP_PASS) && Boolean(process.env.SMTP_HOST) !== false;

const transporter = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!transporter) {
    // Local/dev fallback: don't block flows if SMTP isn't configured.
    console.log(`[NEXUS email mock] to=${to} subject=${subject}\n${html}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@nexus.com',
    to,
    subject,
    html,
  });
};

export const sendMagicLink = async (email: string, token: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const link = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`;
  if (!transporter) {
    console.log(`[NEXUS magic link] ${email}\n  Open: ${link}\n  Token: ${token}`);
  }
  const html = `
    <h1>Magic Login Link</h1>
    <p>Click the link below to log in to NEXUS:</p>
    <a href="${link}">Login</a>
    <p>This link expires in 10 minutes.</p>
  `;
  await sendEmail(email, 'NEXUS Magic Login', html);
};

export const sendRegistrationConfirmation = async (email: string, eventName: string) => {
  return sendRegistrationConfirmationWithStatus(email, eventName, 'REGISTERED');
};

export const sendRegistrationConfirmationWithStatus = async (
  email: string,
  eventName: string,
  status: 'REGISTERED' | 'WAITLIST'
) => {
  const html =
    status === 'REGISTERED'
      ? `
    <h1>Registration Confirmed</h1>
    <p>You have successfully registered for ${eventName}.</p>
    <p>Your QR code unlocks in the app starting 10 minutes before the event for check-in.</p>
  `
      : `
    <h1>Added to Waitlist</h1>
    <p>You are currently on the waitlist for ${eventName}.</p>
    <p>If spots open up, you will be promoted automatically and receive your QR code before the event.</p>
  `;

  await sendEmail(email, 'NEXUS Event Registration', html);
};

/** Sent when a waitlisted user is auto-promoted after a registered user cancels. */
export const sendWaitlistPromotionEmail = async (email: string, eventName: string) => {
  const html = `
    <h1>You&apos;re confirmed</h1>
    <p>A spot opened up for <strong>${eventName}</strong>. You have been <strong>promoted from the waitlist</strong> to a confirmed registration.</p>
    <p>Open NEXUS to view your event QR for check-in (available before the event starts).</p>
  `;
  await sendEmail(email, `NEXUS — Promoted from waitlist: ${eventName}`, html);
};

export const sendAnnouncementEmail = async (to: string, subject: string, message: string) => {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px;">
      <h2 style="margin: 0 0 12px;">${subject}</h2>
      <p style="color: #334155; white-space: pre-wrap;">${message}</p>
      <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">Sent from NEXUS</p>
    </div>
  `;
  await sendEmail(to, subject, html);
};