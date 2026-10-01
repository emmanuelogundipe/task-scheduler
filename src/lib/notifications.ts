// ============================================================
// Notification helpers — every send is written to the Log
// table so the admin has a full audit trail.
// ============================================================

import { prisma } from './prisma';
import { sendWhatsApp } from './whatsapp';
import { sendEmail } from './email';

export async function logNotification(
  taskId: number | null,
  type: 'WHATSAPP' | 'EMAIL' | 'CALENDAR' | 'SYSTEM',
  recipient: string,
  message: string,
  result: { ok: boolean; error?: string }
) {
  await prisma.log.create({
    data: {
      taskId,
      type,
      recipient,
      message,
      status: result.ok ? 'SENT' : 'FAILED',
      error: result.error ?? null,
    },
  });
}

export async function notifyWhatsApp(
  taskId: number | null,
  to: string,
  message: string
) {
  const res = await sendWhatsApp(to, message);
  await logNotification(taskId, 'WHATSAPP', to, message, res);
  return res;
}

export async function notifyEmail(
  taskId: number | null,
  to: string,
  subject: string,
  html: string
) {
  const res = await sendEmail(to, subject, html);
  await logNotification(taskId, 'EMAIL', to, subject, res);
  return res;
}
