import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log("Cleaning all data before fresh import...")
  await prisma.$transaction([
    prisma.reportFieldValue.deleteMany({}),
    prisma.dailyReport.deleteMany({}),
    prisma.report.deleteMany({}),
    prisma.user.deleteMany({ where: { NOT: { role: 'ADMIN' } } }),
    prisma.facility.deleteMany({})
  ]);
  console.log("Cleanup complete.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
