import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

/** Sender display name + address (Gmail SMTP) */
const EMAIL_FROM =
  process.env.EMAIL_FROM?.trim() ||
  process.env.SMTP_FROM?.trim() ||
  'NEXUS Events <nexus0ffi26@gmail.com>';

function requireSmtp(): nodemailer.Transporter {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'Email is not configured. Set SMTP_USER, SMTP_PASS (Gmail App Password), and optionally SMTP_HOST, SMTP_PORT, EMAIL_FROM in .env'
    );
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

let _transporter: nodemailer.Transporter | null = null;
function transporter(): nodemailer.Transporter {
  if (!_transporter) _transporter = requireSmtp();
  return _transporter;
}

function layout(title: string, inner: string) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 40px rgba(15,23,42,0.08);">
        <tr><td style="padding:28px 28px 8px;background:linear-gradient(135deg,#1e40af,#4f46e5);color:#fff;">
          <p style="margin:0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;opacity:0.9">NEXUS Events</p>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:700;">${title}</h1>
        </td></tr>
        <tr><td style="padding:24px 28px 32px;color:#0f172a;font-size:15px;line-height:1.6;">
          ${inner}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;">
          This message was sent by NEXUS. If you did not request it, you can ignore this email.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendHtml(to: string, subject: string, html: string) {
  await transporter().sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  });
}

export type EmailAttachment = { filename: string; content: Buffer; contentType?: string; cid?: string };

export async function sendEmailWithAttachments(
  to: string,
  subject: string,
  html: string,
  attachments: EmailAttachment[]
) {
  await transporter().sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
      cid: a.cid,
    })),
  });
}

export async function sendSignupOtpEmail(email: string, code: string) {
  const html = layout(
    'Verify your email',
    `<p style="margin:0 0 16px;">Welcome! Use this code to verify your account:</p>
    <p style="margin:0 0 20px;font-size:32px;font-weight:800;letter-spacing:0.25em;color:#1e40af;text-align:center;">${code}</p>
    <p style="margin:0;color:#64748b;font-size:14px;">This code expires in <strong>30 minutes</strong>. You need a verified email before using your dashboard.</p>`
  );
  await sendHtml(email, 'NEXUS — Your verification code', html);
}

export async function sendMagicLink(email: string, token: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const link = `${base}/auth/verify?token=${encodeURIComponent(token)}`;
  const html = layout(
    'Sign in to NEXUS',
    `<p style="margin:0 0 20px;">Use the button below to sign in securely. No password required.</p>
    <p style="margin:0 0 20px;text-align:center;">
      <a href="${link}" style="display:inline-block;padding:14px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">Log in to NEXUS</a>
    </p>
    <p style="margin:0 0 12px;font-size:13px;color:#64748b;word-break:break-all;">Or copy this link:<br><a href="${link}" style="color:#2563eb;">${link}</a></p>
    <p style="margin:0;color:#64748b;font-size:14px;">This link expires in <strong>15 minutes</strong>.</p>`
  );
  await sendHtml(email, 'NEXUS — Your login link', html);
}

export type EventEmailDetails = {
  name: string;
  date: Date;
  time: string;
  venue: string;
};

function formatEventWhen(e: EventEmailDetails) {
  try {
    const d = new Date(e.date);
    return `${d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · ${e.time}`;
  } catch {
    return `${e.date} · ${e.time}`;
  }
}

/** Confirmed registration — no QR yet (sent shortly before event). */
export async function sendRegistrationConfirmedEmail(to: string, event: EventEmailDetails) {
  const when = formatEventWhen(event);
  const html = layout(
    'You\u2019re registered',
    `<p style="margin:0 0 16px;font-size:18px;">Registration confirmed</p>
    <p style="margin:0 0 16px;">You have a confirmed seat for <strong>${event.name}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr><td style="padding:8px 0;color:#64748b;width:100px;">When</td><td style="padding:8px 0;"><strong>${when}</strong></td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Venue</td><td style="padding:8px 0;"><strong>${event.venue}</strong></td></tr>
    </table>
    <p style="margin:16px 0 0;padding:14px;background:#eff6ff;border-radius:10px;border:1px solid #bfdbfe;color:#1e3a8a;font-size:14px;">
      Your <strong>QR entry code</strong> will be emailed automatically in the window shortly before the event (when check-in opens), so you can enter without any manual steps.
    </p>`
  );
  await sendHtml(to, `Registration Confirmed 🎉 — ${event.name}`, html);
}

export async function sendWaitlistEmail(to: string, event: EventEmailDetails) {
  const when = formatEventWhen(event);
  const html = layout(
    'You\u2019re on the waitlist',
    `<p style="margin:0 0 16px;">Thank you for your interest in <strong>${event.name}</strong>.</p>
    <p style="margin:0 0 16px;">This event is currently <strong>full</strong>, so your registration is on the <strong>waitlist</strong>.</p>
    <p style="margin:0 0 12px;font-size:14px;color:#64748b;">Schedule: ${when}<br>Venue: ${event.venue}</p>
    <p style="margin:16px 0 0;padding:14px;background:#fffbeb;border-radius:10px;border:1px solid #fcd34d;color:#92400e;font-size:14px;">
      We automatically review open seats <strong>24 hours before the event starts</strong>. If a place becomes yours, you will receive a <strong>final confirmation email</strong>. If not, you will receive a polite update after that window.
    </p>`
  );
  await sendHtml(to, `You are on the Waitlist ⏳ — ${event.name}`, html);
}

export async function sendSeatConfirmedFromWaitlistEmail(to: string, event: EventEmailDetails) {
  const when = formatEventWhen(event);
  const html = layout(
    'You\u2019re in',
    `<p style="margin:0 0 16px;">Good news — you&apos;ve been <strong>confirmed</strong> for <strong>${event.name}</strong> from the waitlist.</p>
    <p style="margin:0 0 12px;font-size:14px;color:#64748b;">${when}<br>${event.venue}</p>
    <p style="margin:16px 0 0;padding:14px;background:#ecfdf5;border-radius:10px;border:1px solid #6ee7b7;color:#065f46;font-size:14px;">
      Your entry QR will be emailed automatically shortly before check-in opens. We look forward to seeing you there!
    </p>`
  );
  await sendHtml(to, `Seat confirmed — ${event.name}`, html);
}

export async function sendWaitlistApologyEmail(to: string, event: EventEmailDetails) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const html = layout(
    `Update: ${event.name}`,
    `<p style="margin:0 0 16px;">Thank you for holding a spot on the waitlist for <strong>${event.name}</strong>.</p>
    <p style="margin:0 0 16px;">Unfortunately we were not able to assign you a seat before the final confirmation time.</p>
    <p style="margin:0 0 20px;">We hope you&apos;ll join us for another event soon.</p>
    <p style="margin:0;text-align:center;"><a href="${base}/explore-events" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Browse events</a></p>`
  );
  await sendHtml(to, `Waitlist update — ${event.name}`, html);
}

/** PNG from data URL, attached as entry-qr.png */
export async function sendEntryQrEmail(to: string, eventName: string, qrPngDataUrl: string) {
  const m = qrPngDataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!m) throw new Error('QR must be a PNG data URL');
  const buf = Buffer.from(m[1], 'base64');
  const html = layout(
    'Your entry QR code',
    `<p style="margin:0 0 12px;">Your check-in QR for <strong>${eventName}</strong> is attached. Show it at the gate.</p>
    <p style="margin:0;color:#64748b;font-size:14px;">You can also open this email on your phone and zoom the attachment if needed.</p>`
  );
  await sendEmailWithAttachments(to, `Your Entry QR Code 🎟️ — ${eventName}`, html, [
    { filename: 'entry-qr.png', content: buf, contentType: 'image/png' },
  ]);
}

export async function sendCertificateEmail(
  to: string,
  eventName: string,
  participantName: string,
  pdf: Buffer
) {
  const html = layout(
    'Your certificate',
    `<p style="margin:0 0 12px;">Hi ${participantName},</p>
    <p style="margin:0;">Thank you for attending <strong>${eventName}</strong>. Your participation certificate is attached.</p>`
  );
  await sendEmailWithAttachments(to, `Your certificate — ${eventName}`, html, [
    {
      filename: `${eventName.replace(/\s+/g, '-')}-certificate.pdf`,
      content: pdf,
      contentType: 'application/pdf',
    },
  ]);
}

export async function sendAnnouncementEmail(to: string, subject: string, message: string) {
  const html = layout(
    subject.replace(/</g, ''),
    `<p style="margin:0;white-space:pre-wrap;color:#334155;">${message.replace(/</g, '')}</p>`
  );
  await sendHtml(to, subject, html);
}
