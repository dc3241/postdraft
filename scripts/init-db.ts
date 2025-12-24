import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default settings if they don't exist
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  });

  console.log('Database initialized successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

