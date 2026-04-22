import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const aichis = await prisma.facility.findMany({ where: { facilityName: { contains: 'Aichi' } } })
  console.log(JSON.stringify(aichis, null, 2))
}

main().finally(() => prisma.$disconnect())
