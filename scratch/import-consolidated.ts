import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const csvPath = 'dghs_consolidated_report_complete.csv'
const outbreakId = 'measles-2026'

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) throw new Error("Admin user not found")

  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n')
  
  // Manual parser for this specific CSV to handle quotes
  function parseCSVLine(line: string) {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }
    result.push(current.trim())
    return result
  }

  console.log(`Starting import of ${lines.length - 1} records...`)

  const facilityCache: Record<string, any> = {}

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const row = parseCSVLine(lines[i])
    if (row.length < 4) continue

    const facilityName = row[0]
    const division = row[1]
    const district = row[2]
    const reportingDateStr = row[3]
    
    // Parse Date
    const [m, d, y] = reportingDateStr.split('/').map(Number)
    const reportingDate = new Date(Date.UTC(y, m - 1, d))

    // Parse values
    const suspected = parseInt(row[6]) || 0
    const confirmed = parseInt(row[7]) || 0
    const suspectedDeath = parseInt(row[8]) || 0
    const confirmedDeath = parseInt(row[9]) || 0
    const admitted = parseInt(row[10]) || 0
    const discharged = parseInt(row[11]) || 0

    try {
        const cacheKey = `${facilityName.trim()}_${district.trim()}`
        let facility = facilityCache[cacheKey]

        if (!facility) {
            // Find Facility
            facility = await prisma.facility.findFirst({
                where: {
                    AND: [
                        { district: { contains: district.trim(), mode: 'insensitive' } },
                        { facilityName: { contains: facilityName.trim().includes("Civil Surgeon") ? "Civil Surgeon" : facilityName.trim(), mode: 'insensitive' } }
                    ]
                }
            })

            if (!facility) {
                // Fallback: search by name only if district is same
                facility = await prisma.facility.findFirst({
                    where: {
                        district: { contains: district.trim(), mode: 'insensitive' }
                    }
                })
            }

            if (!facility) {
                console.log(`[Row ${i}] Facility not found: ${facilityName} in ${district}. Creating...`)
                let typeSlug = "general-hospital"
                if (facilityName.toLowerCase().includes("civil surgeon")) typeSlug = "district-office"
                const type = await prisma.facilityType.findFirst({ where: { slug: typeSlug } })
                
                facility = await prisma.facility.create({
                    data: {
                        facilityName: facilityName,
                        facilityCode: `IMPORT_${facilityName.substring(0, 5).toUpperCase()}_${district.trim().toUpperCase()}_${i}`,
                        division: division,
                        district: district,
                        upazila: district,
                        facilityTypeId: type?.id
                    }
                })
            }
            facilityCache[cacheKey] = facility
        }

        // Upsert DailyReport
        await prisma.dailyReport.upsert({
            where: {
                facilityId_outbreakId_reportingDate: {
                    facilityId: facility.id,
                    outbreakId: outbreakId,
                    reportingDate: reportingDate
                }
            },
            update: {
                suspected24h: suspected,
                confirmed24h: confirmed,
                suspectedDeath24h: suspectedDeath,
                confirmedDeath24h: confirmedDeath,
                admitted24h: admitted,
                discharged24h: discharged,
                published: true,
                userId: admin.id
            },
            create: {
                facilityId: facility.id,
                outbreakId: outbreakId,
                reportingDate: reportingDate,
                suspected24h: suspected,
                confirmed24h: confirmed,
                suspectedDeath24h: suspectedDeath,
                confirmedDeath24h: confirmedDeath,
                admitted24h: admitted,
                discharged24h: discharged,
                published: true,
                userId: admin.id
            }
        })
    } catch (err) {
        console.error(`Error processing row ${i}:`, err)
    }

    if (i % 20 === 0) console.log(`Processed ${i} rows...`)
    await new Promise(r => setTimeout(r, 500))
  }

  console.log("Consolidated import finished.")
}

main().catch(console.error).finally(() => prisma.$disconnect())

