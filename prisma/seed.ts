// ============================================================
// Odyssey Scheduler — Database seed
// Creates the settings row (admin profile + hashed passcode)
// and the initial task handlers.
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

async function main() {
  console.log('🌱 Seeding Odyssey Scheduler...');

  // ---- Settings / admin profile ----
  const existing = await prisma.settings.findFirst();

  if (!existing) {
    const hash = await bcrypt.hash(DEFAULT_ADMIN.passcode, 10);
    await prisma.settings.create({
      data: {
        adminName: DEFAULT_ADMIN.name,
        adminWhatsapp: DEFAULT_ADMIN.whatsapp,
        adminPasscodeHash: hash,
        reminderIntervalMinutes: Number(process.env.TASK_REMINDER_INTERVAL_MINUTES ?? 30),
        timezone: 'Africa/Lagos',
      },
    });
    console.log(`✅ Settings created — admin ${DEFAULT_ADMIN.name} (${DEFAULT_ADMIN.whatsapp})`);
  } else {
    console.log('ℹ️  Settings already exist — leaving admin profile untouched.');
  }

  // ---- Admin user (for sessions / approvals) ----
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
  console.log(`✅ Admin user ready: ${DEFAULT_ADMIN.name} (${DEFAULT_ADMIN.whatsapp})`);

  // ---- Task handlers ----
  for (const h of HANDLERS) {
    const user = await prisma.user.upsert({
      where: { whatsappNumber: h.whatsapp },
      update: { name: h.name, role: 'TASK_HANDLER', status: 'ACTIVE' },
      create: {
        name: h.name,
        whatsappNumber: h.whatsapp,
        role: 'TASK_HANDLER',
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Handler ready: ${user.name} (${user.whatsappNumber})`);
  }

  console.log('🎉 Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
