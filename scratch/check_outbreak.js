const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const outbreak = await prisma.outbreak.findUnique({
    where: { id: 'measles-2026' }
  });
  console.log('Outbreak Settings:', outbreak);
}

main().catch(console.error).finally(() => prisma.$disconnect());
