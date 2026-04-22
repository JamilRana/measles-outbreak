import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// DuplicateID (Newer/Longer Code) -> OriginalID (Older/Shorter Code)
const mergeMap: Record<string, string> = {
  "cmo8vy936000aw040s5v4oecy": "cmo72p2t100h2w0144dptasg9", // Aichi
  "cmo8vycmv000sw040sz69w8lq": "cmo72u3is00itw014npxvntq6", // Bangladesh Shishu
  "cmo8vyf04002dw040s1ise05g": "cmnxysldx003hw0w82quvbj4x", // Dr. Sirajul
  "cmo8vyoue003cw040ak45za9q": "cmo72keo600gzw0145rpd1cnz", // Mugda
  "cmo8vysh3003qw040gd8k6k0a": "cmo72qk9400hkw0141e6oz296", // Sir Salimullah
  "cmo8vyuu6003yw040v9mygl4n": "cmnxysnu2003tw0w8iv9h4i6c", // Universal
  "cmo8vyebe0027w040pivpzz1r": "cmo728a0300g7w014w8inr23p", // DNCC
  "cmo8vydp9001jw040v8y8shas": "cmo72d9xl00gew014mhooznz9", // Infectious Diseases
  "cmo8vywpv006yw040uol5v87a": "cmo72f69i00hfw014npxvntq6", // Kasir Uddin
}

async function merge(dupId: string, origId: string) {
  try {
    const dup = await prisma.facility.findUnique({ where: { id: dupId } })
    const orig = await prisma.facility.findUnique({ where: { id: origId } })
    
    if (!dup || !orig) {
        console.warn(`Could not find ${dupId} or ${origId}. Skipping.`)
        return
    }

    console.log(`Merging [${dup.facilityName}] into [${orig.facilityName}]...`)
    
    // 1. Daily Reports
    const dupReports = await prisma.dailyReport.findMany({ where: { facilityId: dupId } })
    for (const dr of dupReports) {
        try {
            await prisma.dailyReport.update({
                where: { id: dr.id },
                data: { facilityId: origId }
            })
            console.log(`  Moved DailyReport for ${dr.reportingDate.toISOString()}`)
        } catch (e) {
            console.log(`  DailyReport conflict for ${dr.reportingDate.toISOString()}. Deleting duplicate.`)
            await prisma.dailyReport.delete({ where: { id: dr.id } })
        }
    }

    // 2. Generic Reports
    const dupGenericReports = await prisma.report.findMany({ where: { facilityId: dupId } })
    for (const r of dupGenericReports) {
        try {
            await prisma.report.update({
                where: { id: r.id },
                data: { facilityId: origId }
            })
        } catch (e) {
            console.log(`  Report conflict. Deleting duplicate.`)
            await prisma.report.delete({ where: { id: r.id } })
        }
    }

    // 3. Associations
    await prisma.backlogSlot.updateMany({ where: { facilityId: dupId }, data: { facilityId: origId } })
    await prisma.submissionWindow.updateMany({ where: { facilityId: dupId }, data: { facilityId: origId } })
    await prisma.user.updateMany({ where: { facilityId: dupId }, data: { facilityId: origId } })

    // 4. Delete
    await prisma.facility.delete({ where: { id: dupId } })
    console.log(`  Merged successfully.`)
  } catch (err) {
    console.error(`  Error merging ${dupId}:`, err)
  }
}

async function main() {
  for (const [dup, orig] of Object.entries(mergeMap)) {
    await merge(dup, orig)
  }
}

main().finally(() => prisma.$disconnect())
