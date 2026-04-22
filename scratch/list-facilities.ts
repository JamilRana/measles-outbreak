import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const facilities = await prisma.facility.findMany({
    orderBy: { district: 'asc' }
  })
  console.log(JSON.stringify(facilities, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
