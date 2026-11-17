
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fields = await prisma.formField.findMany({
    where: { outbreakId: 'measles-2026' }
  });
  console.log('Fields:', fields.map(x => ({ key: x.fieldKey, label: x.label, isCore: x.isCoreField })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
