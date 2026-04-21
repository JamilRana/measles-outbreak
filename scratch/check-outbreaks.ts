import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const outbreaks = await prisma.outbreak.findMany({
    include: {
      _count: {
        select: { formFields: true }
      }
    }
  });
  console.log(JSON.stringify(outbreaks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
