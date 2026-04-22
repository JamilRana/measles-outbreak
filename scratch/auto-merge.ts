import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const facilities = await prisma.facility.findMany({
    orderBy: { createdAt: 'asc' } // Keep the oldest ones
  })
  
  const seen = new Map<string, string>() // NameSlug -> ID
  
  for (const f of facilities) {
    // Normalize name: lowercase, no special chars, no "Hospital", no "Ltd", no "CS"
    const slug = f.facilityName.toLowerCase()
      .replace(/hospital/g, '')
      .replace(/ltd/g, '')
      .replace(/plc/g, '')
      .replace(/college/g, '')
      .replace(/university/g, '')
      .replace(/office/g, '')
      .replace(/civil surgeon/g, 'cs')
      .replace(/[^a-z0-9]/g, '')
      + "_" + f.district.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    if (seen.has(slug)) {
      const origId = seen.get(slug)!
      await merge(f.id, origId)
    } else {
      seen.set(slug, f.id)
    }
  }
}

async function merge(dupId: string, origId: string) {
  try {
    const dup = await prisma.facility.findUnique({ where: { id: dupId } })
    const orig = await prisma.facility.findUnique({ where: { id: origId } })
    
    if (!dup || !orig) return

    console.log(`Merging [${dup.facilityName}] (${dup.id}) into [${orig.facilityName}] (${orig.id})...`)
    
    // Move DailyReports
    const dupReports = await prisma.dailyReport.findMany({ where: { facilityId: dupId } })
    for (const dr of dupReports) {
        try {
            await prisma.dailyReport.update({
                where: { id: dr.id },
                data: { facilityId: origId }
            })
        } catch (e) {
            await prisma.dailyReport.delete({ where: { id: dr.id } })
        }
    }

    // Associations
    await prisma.report.updateMany({ where: { facilityId: dupId }, data: { facilityId: origId } })
    await prisma.backlogSlot.updateMany({ where: { facilityId: dupId }, data: { facilityId: origId } })
    await prisma.submissionWindow.updateMany({ where: { facilityId: dupId }, data: { facilityId: origId } })
    await prisma.user.updateMany({ where: { facilityId: dupId }, data: { facilityId: origId } })

    // Delete
    await prisma.facility.delete({ where: { id: dupId } })
    console.log(`  Merged.`)
  } catch (err) {
    console.error(`  Error merging ${dupId}:`, err)
  }
}

main().finally(() => prisma.$disconnect())
