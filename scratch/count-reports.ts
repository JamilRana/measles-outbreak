import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const count = await prisma.dailyReport.count({
    where: {
      reportingDate: new Date('2026-04-07')
    }
  })
  console.log(`Reports for 2026-04-07: ${count}`)
}

main().finally(() => prisma.$disconnect())
