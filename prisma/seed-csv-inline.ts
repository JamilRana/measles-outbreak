import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ReportRow {
  facility: string
  division: string
  district: string
  date: string
  suspected: number
  confirmed: number
  suspectedDeath: number
  confirmedDeath: number
  admitted: number
  discharged: number
}

const data = `Civil Surgeon Office,Barisal,Barguna,4/7/2026,184,35,0,3,166,129
Civil Surgeon office,Barisal,Barisal,4/7/2026,91,4,0,0,26,9
Civil Surgeon Office,Barisal,Bhola,4/7/2026,67,8,0,2,43,30
Civil Surgeon Office,Barisal,Jhalkathi,4/7/2026,37,8,2,0,13,5
Civil Surgeon Office,Barisal,Patuakhali,4/7/2026,183,9,0,0,168,101
Civil Surgeon Office,Barisal,Pirojpur,4/7/2026,66,4,0,0,22,14
Civil Surgeon Office,Chattogram,Bandarban,4/7/2026,13,1,0,0,13,10
Civil Surgeon Office,Chattogram,Brahmanbaria,4/7/2026,66,11,0,0,66,34
Civil Surgeon Office,Chattogram,Chandpur,4/7/2026,195,33,0,3,71,51
Civil Surgeon Office,Chattogram,Chattogram,4/7/2026,251,18,1,0,180,98
Civil Surgeon Office,Chattogram,Coxsbazar,4/7/2026,220,34,5,0,210,159
Civil Surgeon Office,Chattogram,Cumilla,4/7/2026,356,27,3,0,143,84
Civil Surgeon Office,Chattogram,Feni,4/7/2026,78,2,0,0,33,20
Civil Surgeon Office,Chattogram,Khagrachari,4/7/2026,12,0,0,0,12,11
Civil Surgeon Office,Chattogram,Lakshmipur,4/7/2026,76,4,1,0,71,46
Civil Surgeon Office,Chattogram,Noakhali,4/7/2026,132,6,0,0,132,83
Civil Surgeon Office,Chattogram,Rangamati,4/7/2026,16,0,0,0,5,5
Civil Surgeon Office,Dhaka,Dhaka,4/7/2026,133,30,0,0,75,54
Civil Surgeon Office,Dhaka,Faridpur,4/7/2026,152,4,1,0,42,67
Civil Surgeon Office,Dhaka,Gazipur,4/7/2026,133,16,0,0,111,80
Civil Surgeon Office,Dhaka,GOPALGANJ,4/7/2026,154,8,1,0,116,61
Civil Surgeon Office,Dhaka,Kishoreganj,4/7/2026,146,16,0,1,46,14
Civil Surgeon Office,Dhaka,Madaripur,4/7/2026,85,15,1,0,63,43
Civil Surgeon Office,Dhaka,Manikganj,4/7/2026,105,3,0,0,60,30
Civil Surgeon Office,Dhaka,Munshiganj,4/7/2026,73,26,0,0,16,11
Civil Surgeon Office,Dhaka,Narayanganj,4/7/2026,56,0,0,0,38,12
Civil Surgeon Office,Dhaka,Narsingdi,4/7/2026,104,14,0,0,51,34
Civil Surgeon Office,Dhaka,Rajbari,4/7/2026,52,3,0,0,27,24
Civil Surgeon Office,Dhaka,Shariatpur,4/7/2026,96,13,1,1,28,15
Civil Surgeon Office,Dhaka,Tangail,4/7/2026,133,12,2,0,107,66
Civil Surgeon Office,Khulna,Bagerhat,4/7/2026,12,0,0,0,11,1
Civil Surgeon Office,Khulna,Chuadanga,4/7/2026,7,0,0,0,0,1
Civil Surgeon Office,Khulna,Jashore,4/7/2026,175,23,0,0,57,25
Civil Surgeon Office,Khulna,Jhenaidah,4/7/2026,31,7,0,0,31,9
Civil Surgeon Office,Khulna,Khulna,4/7/2026,62,6,0,0,62,50
Civil Surgeon Office,Khulna,Kushtia,4/7/2026,281,1,6,0,281,172
Civil Surgeon Office,Khulna,Magura,4/7/2026,140,8,0,0,98,14
Civil Surgeon Office,Khulna,Meherpur,4/7/2026,55,0,0,0,46,24
Civil Surgeon Office,Khulna,Narail,4/7/2026,21,4,0,0,17,9
Civil Surgeon Office,Khulna,Satkhira,4/7/2026,40,0,0,0,40,20
Civil Surgeon Office,Mymensingh,Jamalpur,4/7/2026,35,0,0,1,35,15
Civil Surgeon Office,Mymensingh,Mymensingh,4/7/2026,47,7,0,0,2,0
Civil Surgeon Office,Mymensingh,Netrokona,4/7/2026,135,10,0,1,52,24
Civil Surgeon Office,Mymensingh,Sherpur,4/7/2026,42,0,0,0,19,10
Civil Surgeon Office,Rajshahi,Bogura,4/7/2026,117,2,2,0,54,28
Civil Surgeon Office,Rajshahi,Chapainawabganj,4/7/2026,462,38,6,0,462,387
Civil Surgeon Office,Rajshahi,Joypurhat,4/7/2026,74,3,0,0,27,14
Civil Surgeon Office,Rajshahi,Naogaon,4/7/2026,160,10,1,0,21,8
Civil Surgeon Office,Rajshahi,Natore,4/7/2026,118,14,0,0,86,43
Civil Surgeon Office,Rajshahi,Pabna,4/7/2026,252,65,6,2,252,208
Civil Surgeon Office,Rajshahi,Rajshahi,4/7/2026,91,18,0,0,17,10
Civil Surgeon Office,Rajshahi,Sirajganj,4/7/2026,47,46,0,0,47,31
Civil Surgeon Office,Rangpur,Dinajpur,4/7/2026,109,4,0,0,60,56
Civil Surgeon Office,Rangpur,Gaibandha,4/7/2026,57,0,0,0,11,10
Civil Surgeon Office,Rangpur,Kurigram,4/7/2026,26,1,0,0,24,23
Civil Surgeon Office,Rangpur,Lalmonirhat,4/7/2026,21,0,0,0,11,5
Civil Surgeon Office,Rangpur,Nilphamari,4/7/2026,65,2,0,0,9,7
Civil Surgeon Office,Rangpur,Panchagarh,4/7/2026,21,0,0,0,0,0
Civil Surgeon Office,Rangpur,Rangpur,4/7/2026,30,0,0,0,0,0
Civil Surgeon Office,Rangpur,Thakurgaon,4/7/2026,50,3,0,0,15,8
Civil Surgeon Office,Sylhet,Habiganj,4/7/2026,58,6,0,0,46,34
Civil Surgeon Office,Sylhet,Moulvibazar,4/7/2026,108,10,0,0,43,24
Civil Surgeon Office,Sylhet,Sunamganj,4/7/2026,138,11,0,0,73,41
Civil Surgeon Office,Sylhet,Sylhet,4/7/2026,162,10,1,0,125,80`

const districtFixes: Record<string, string> = {
  'BHOLA': 'Bhola',
  'Jhalkathi': 'Jhalokati',
  'JASHORE': 'Jashore',
  'KHUSHTIA': 'Kushtia',
}

async function main() {
  console.log('🧹 Starting CSV import seed...')
  
  const outbreak = await prisma.outbreak.findFirst()
  if (!outbreak) {
    console.error('Run seed.ts first to create outbreak')
    process.exit(1)
  }
  
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) {
    console.error('Run seed.ts first to create admin user')
    process.exit(1)
  }
  
  const lines = data.split('\n')
  console.log(`Processing ${lines.length} data rows...`)
  
  let seeded = 0
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length < 10) continue
    
    const facilityName = parts[0].trim()
    const division = parts[1].trim()
    let district = parts[2].trim()
    const dateStr = parts[3].trim()
    const suspected = parseInt(parts[4]) || 0
    const confirmed = parseInt(parts[5]) || 0
    const suspectedDeath = parseInt(parts[6]) || 0
    const confirmedDeath = parseInt(parts[7]) || 0
    const admitted = parseInt(parts[8]) || 0
    const discharged = parseInt(parts[9]) || 0
    
    if (districtFixes[district]) district = districtFixes[district]
    
    const date = new Date(dateStr)
    date.setHours(12, 0, 0, 0)
    
    // Find facility - first try exact match, then by district + civil surgeon
    let facility = await prisma.facility.findFirst({
      where: { facilityName: { equals: facilityName, mode: 'insensitive' } }
    })
    
    if (!facility && facilityName.includes('Civil Surgeon')) {
      facility = await prisma.facility.findFirst({
        where: { 
          district: district,
          facilityType: { slug: 'district-office' }
        }
      })
    }
    
    if (!facility) {
      // Try to find any facility in this district
      facility = await prisma.facility.findFirst({
        where: { district: district }
      })
    }
    
    if (!facility) {
      console.log(`Facility not found: ${facilityName} (${district})`)
      continue
    }
    
    try {
      await prisma.dailyReport.upsert({
        where: {
          facilityId_outbreakId_reportingDate: {
            facilityId: facility.id,
            outbreakId: outbreak.id,
            reportingDate: date,
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
        },
        create: {
          facilityId: facility.id,
          outbreakId: outbreak.id,
          userId: admin.id,
          reportingDate: date,
          suspected24h: suspected,
          confirmed24h: confirmed,
          suspectedDeath24h: suspectedDeath,
          confirmedDeath24h: confirmedDeath,
          admitted24h: admitted,
          discharged24h: discharged,
          published: true,
        }
      })
      
      await prisma.report.upsert({
        where: {
          facilityId_outbreakId_periodStart: {
            facilityId: facility.id,
            outbreakId: outbreak.id,
            periodStart: date,
          }
        },
        update: { status: 'PUBLISHED' },
        create: {
          facilityId: facility.id,
          outbreakId: outbreak.id,
          userId: admin.id,
          periodStart: date,
          periodEnd: date,
          status: 'PUBLISHED',
        }
      })
      
      seeded++
    } catch (err) {
      console.log(`Error seeding ${facilityName}:`, err.message)
    }
  }
  
  console.log(`\n✅ Seeded ${seeded} reports`)
  await prisma.$disconnect()
}

main().catch(console.error)