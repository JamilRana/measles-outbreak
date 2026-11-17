
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const divisions = await prisma.facility.groupBy({
    by: ['division'],
    _count: { id: true }
  });
  console.log('Divisions in Database:', divisions);
}

main().catch(console.error).finally(() => prisma.$disconnect());
