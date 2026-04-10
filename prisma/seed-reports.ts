import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const outbreak = await prisma.outbreak.findFirst()
  if (!outbreak) {
    console.log('No outbreak found. Please seed the database first.')
    return
  }

  const facilities = await prisma.facility.findMany({ take: 10 })
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  
  if (!user) {
    console.log('No admin user found.')
    return
  }

  console.log(`Seeding reports for ${facilities.length} facilities...`)

  for (const facility of facilities) {
    await prisma.dailyReport.upsert({
      where: {
        facilityId_outbreakId_reportingDate: {
          facilityId: facility.id,
          outbreakId: outbreak.id,
          reportingDate: new Date(),
        }
      },
      update: {},
      create: {
        reportingDate: new Date(),
        facilityId: facility.id,
        userId: user.id,
        outbreakId: outbreak.id,
        suspected24h: Math.floor(Math.random() * 50),
        confirmed24h: Math.floor(Math.random() * 20),
        suspectedDeath24h: Math.floor(Math.random() * 2),
        confirmedDeath24h: Math.floor(Math.random() * 1),
        admitted24h: Math.floor(Math.random() * 10),
        discharged24h: Math.floor(Math.random() * 5),
        serumSent24h: Math.floor(Math.random() * 15),
      }
    })
  }

  console.log('Seed completed successfully!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
