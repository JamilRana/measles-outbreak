import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const outbreak = await prisma.outbreak.findFirst({
    where: { id: 'measles-2026' }
  });
  console.log(JSON.stringify(outbreak, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
