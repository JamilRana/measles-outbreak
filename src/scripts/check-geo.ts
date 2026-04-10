import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const data = await prisma.facility.findMany({
    select: {
      division: true,
      district: true
    },
    distinct: ['division', 'district']
  })
  
  console.log(JSON.stringify(data, null, 2))
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
