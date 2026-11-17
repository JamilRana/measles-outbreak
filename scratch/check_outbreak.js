
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const outbreak = await prisma.outbreak.findFirst();
  console.log('Outbreak Settings:', JSON.stringify(outbreak, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
