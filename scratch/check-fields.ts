import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fields = await prisma.formField.findMany({
    where: { outbreakId: 'measles-2026' },
  });
  console.log(JSON.stringify(fields, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
