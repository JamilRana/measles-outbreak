import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const facilities = await prisma.facility.findMany({
    where: {
      OR: [
        { facilityName: { contains: 'Ad-din' } },
        { facilityName: { contains: 'Aichi' } },
        { facilityName: { contains: 'AMZ' } },
        { facilityName: { contains: 'Anwer Khan' } },
        { facilityName: { contains: 'Shishu' } },
        { facilityName: { contains: 'Infectious' } },
        { facilityName: { contains: 'DNCC' } },
        { facilityName: { contains: 'Kasir Uddin' } }
      ]
    }
  })
  console.log(JSON.stringify(facilities, null, 2))
}

main().finally(() => prisma.$disconnect())
