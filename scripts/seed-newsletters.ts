import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const newsletters = [
    { senderEmail: 'newsletter@whattheai.com', senderName: 'WhatTheAI' },
    { senderEmail: 'newsletter@unwindai.com', senderName: 'Unwind AI' },
    { senderEmail: 'newsletter@8020ai.com', senderName: '8020 AI' },
    { senderEmail: 'newsletter@therundown.ai', senderName: 'The Rundown AI' },
  ];

  for (const newsletter of newsletters) {
    await prisma.newsletter.upsert({
      where: { senderEmail: newsletter.senderEmail },
      update: {},
      create: newsletter,
    });
  }

  console.log('Newsletters seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

