import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const facilities = await prisma.facility.findMany({
    orderBy: { createdAt: 'asc' }
  })
  
  const seen = new Map<string, string>()
  
  for (const f of facilities) {
    let name = f.facilityName.toLowerCase()
      .replace(/hospital/g, '')
      .replace(/ltd/g, '')
      .replace(/plc/g, '')
      .replace(/college/g, '')
      .replace(/university/g, '')
      .replace(/office/g, '')
      .replace(/civil surgeon/g, 'cs')
    
    let district = f.district.toLowerCase()
      .replace(/netrakona/g, 'netrokona')
      .replace(/khagrachari/g, 'khagrachhari')
      .replace(/coxsbazar/g, 'coxsbazar')
      .replace(/cox's bazar/g, 'coxsbazar')
      .replace(/ /g, '')

    // If it's a CS office, the slug should just be "cs_district"
    let slug = ""
    if (name.includes('cs')) {
        slug = `cs_${district}`
    } else {
        // Remove district name from facility name if it's there
        name = name.replace(new RegExp(district, 'g'), '')
        slug = `${name.replace(/[^a-z0-9]/g, '')}_${district}`
    }
    
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

    console.log(`Merging [${dup.facilityName}] in [${dup.district}] into [${orig.facilityName}] in [${orig.district}]...`)
    
    // Move Reports
    const dupReports = await prisma.dailyReport.findMany({ where: { facilityId: dupId } })
    for (const dr of dupReports) {
        try {
            await prisma.dailyReport.update({ where: { id: dr.id }, data: { facilityId: origId } })
        } catch (e) {
            await prisma.dailyReport.delete({ where: { id: dr.id } })
        }
    }

    await prisma.report.updateMany({ where: { facilityId: dupId }, data: { facilityId: origId } })
    await prisma.backlogSlot.updateMany({ where: { facilityId: dupId }, data: { facilityId: origId } })
    await prisma.submissionWindow.updateMany({ where: { facilityId: dupId }, data: { facilityId: origId } })
    await prisma.user.updateMany({ where: { facilityId: dupId }, data: { facilityId: origId } })

    await prisma.facility.delete({ where: { id: dupId } })
    console.log(`  Merged.`)
  } catch (err) {
    console.error(`  Error merging ${dupId}:`, err)
  }
}

main().finally(() => prisma.$disconnect())
