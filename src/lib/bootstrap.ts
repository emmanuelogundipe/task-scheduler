// ============================================================
// Bootstrap — idempotently ensures the database has the base
// settings row and seed users on startup. Safe to run on every
// boot: it only creates records that do not already exist.
// ============================================================

import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

const DEFAULT_ADMIN = {
  name: 'Engr. Mrs. Stella',
  whatsapp: '+2348133226669',
  passcode: 'Engstella',
};

const HANDLERS = [
  { name: 'Miss. Areta', whatsapp: '+2348166460076' },
  { name: 'Fortune', whatsapp: '+2348037887144' },
  { name: 'Emmanuel', whatsapp: '+2349117639108' },
  { name: 'Godwin', whatsapp: '+2348155523464' },
  { name: 'Stanley', whatsapp: '+2349054227439' },
  { name: 'Onyinye', whatsapp: '+2349067672777' },
];

export async function ensureSeeded(): Promise<void> {
  const settings = await prisma.settings.findFirst();
  if (!settings) {
    await prisma.settings.create({
      data: {
        adminName: DEFAULT_ADMIN.name,
        adminWhatsapp: DEFAULT_ADMIN.whatsapp,
        adminPasscodeHash: await bcrypt.hash(DEFAULT_ADMIN.passcode, 10),
        reminderIntervalMinutes: Number(process.env.TASK_REMINDER_INTERVAL_MINUTES ?? 30),
        timezone: process.env.APP_TIMEZONE ?? 'Africa/Lagos',
      },
    });
    console.log('[bootstrap] created default settings / admin profile');
  }

  await prisma.user.upsert({
    where: { whatsappNumber: DEFAULT_ADMIN.whatsapp },
    update: { name: DEFAULT_ADMIN.name, role: 'ADMIN', status: 'ACTIVE' },
    create: {
      name: DEFAULT_ADMIN.name,
      whatsappNumber: DEFAULT_ADMIN.whatsapp,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  for (const h of HANDLERS) {
    const existing = await prisma.user.findUnique({ where: { whatsappNumber: h.whatsapp } });
    if (!existing) {
      await prisma.user.create({
        data: {
          name: h.name,
          whatsappNumber: h.whatsapp,
          role: 'TASK_HANDLER',
          status: 'ACTIVE',
        },
      });
    }
  }
}
