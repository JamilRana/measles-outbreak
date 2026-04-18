import { PrismaClient } from '@prisma/client'
import { rebuildSnapshot } from '../src/lib/snapshot'

const prisma = new PrismaClient()

async function main() {
  console.log('Fetching reports missing snapshots...')
  const reports = await prisma.report.findMany({
    where: {
      outbreakId: 'measles-2026',
      dataSnapshot: {
         equals: {} // Or just check if null/missing keys
      }
    }
  })

  // Actually, let's just refresh ALL for the outbreak to be safe
  const allReports = await prisma.report.findMany({
    where: { outbreakId: 'measles-2026' },
    select: { id: true }
  })

  console.log(`Rebuilding snapshots for ${allReports.length} reports in chunks...`)

  const chunkSize = 10
  for (let i = 0; i < allReports.length; i += chunkSize) {
    const chunk = allReports.slice(i, i + chunkSize)
    console.log(`Processing chunk: ${i} to ${i + chunk.length}...`)
    
    await Promise.all(chunk.map(async (report) => {
        const snapshot = await rebuildSnapshot(report.id, prisma)
        await prisma.report.update({
          where: { id: report.id },
          data: { dataSnapshot: snapshot as any }
        })
    }))
  }

  console.log('Snapshots rebuilt successfully!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
