import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ---- Admin: Engr. Mrs. Stella ----
  const admin = await prisma.admin.upsert({
    where: { id: 1 },
    update: {
      name: 'Engr. Mrs. Stella',
      whatsapp: '+2348133226669',
      email: 'ifywayne@gmail.com',
      passcode: 'Engstella',
    },
    create: {
      name: 'Engr. Mrs. Stella',
      whatsapp: '+2348133226669',
      email: 'ifywayne@gmail.com',
      passcode: 'Engstella',
    },
  });
  console.log(`✅ Admin ready: ${admin.name} (${admin.whatsapp})`);

  // ---- Task Handlers ----
  const handlers = [
    { name: 'Miss. Areta', whatsapp: '+2348166460076' },
    { name: 'Fortune', whatsapp: '+2348037887144' },
    { name: 'Emmanuel', whatsapp: '+2349117639108' },
    { name: 'Godwin', whatsapp: '+2348155523464' },
    { name: 'Stanley', whatsapp: '+2349054227439' },
    { name: 'Onyinye', whatsapp: '+2349067672777' },
  ];

  for (const h of handlers) {
    await prisma.handler.upsert({
      where: { whatsapp: h.whatsapp },
      update: { name: h.name, adminId: admin.id, active: true },
      create: { ...h, adminId: admin.id },
    });
    console.log(`✅ Handler ready: ${h.name} (${h.whatsapp})`);
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
