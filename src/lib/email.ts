// ============================================================
// Email Service — Nodemailer (SMTP)
// Works with Gmail App Passwords, Mailgun, Brevo, SendGrid,
// or any office SMTP relay.
// ============================================================

import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

export function emailConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!emailConfigured()) {
    return {
      ok: false,
      error: 'Email not configured — set SMTP_HOST, SMTP_USER and SMTP_PASS in .env',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const info = await transporter.sendMail({
      from: EMAIL_FROM ?? SMTP_USER,
      to,
      subject,
      html,
    });

    return { ok: true, id: info.messageId };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Unknown email error' };
  }
}
