import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const oldDate = new Date(2026, 3, 22) // April 22
  const newDate = new Date(2026, 3, 6)   // April 6
  const outbreakId = 'measles-2026'

  console.log("Moving records from April 22 to April 6...")

  const reports = await prisma.dailyReport.findMany({
    where: {
      reportingDate: oldDate,
      outbreakId: outbreakId
    }
  })

  console.log(`Found ${reports.length} reports to move.`)

  for (const report of reports) {
    // Check if a report already exists for April 6 at this facility
    const existing = await prisma.dailyReport.findUnique({
      where: {
        facilityId_outbreakId_reportingDate: {
          facilityId: report.facilityId,
          outbreakId: outbreakId,
          reportingDate: newDate
        }
      }
    })

    if (existing) {
      // Merge or update
      await prisma.dailyReport.update({
        where: { id: existing.id },
        data: {
          suspected24h: report.suspected24h,
          confirmed24h: report.confirmed24h,
          suspectedDeath24h: report.suspectedDeath24h,
          confirmedDeath24h: report.confirmedDeath24h,
          admitted24h: report.admitted24h,
          discharged24h: report.discharged24h
        }
      })
      // Delete the old one
      await prisma.dailyReport.delete({ where: { id: report.id } })
    } else {
      // Just update the date
      await prisma.dailyReport.update({
        where: { id: report.id },
        data: { reportingDate: newDate }
      })
    }
  }

  console.log("Move completed.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
