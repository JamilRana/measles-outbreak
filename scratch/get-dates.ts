import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const dates = await p.dailyReport.groupBy({
    by: ['reportingDate'],
    _count: { _all: true }
  })
  console.log(dates)
}
main().finally(() => p.$disconnect())
