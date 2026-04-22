import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

const districtFixes: Record<string, string> = {
  'BHOLA': 'Bhola',
  'Jhalkathi': 'Jhalokati',
  'Jhalkathi ': 'Jhalokati',
  'JASHORE': 'Jashore',
  'KUSHTIA': 'Kushtia',
  'PATUAKHALI ': 'Patuakhali',
  'PIROJPUR ': 'Pirojpur',
  'NOAKHALI ': 'Noakhali',
  'RANGAMATI': 'Rangamati',
  'COXSBAZAR': "Cox's Bazar",
  'CUMILLA': 'Cumilla',
  'KHAGRACHARI': 'Khagrachhari',
  'LAKSHMIPUR': 'Lakshmipur',
  'GOPALGANJ': 'Gopalganj',
  'FARIDPUR ': 'Faridpur',
  'NARAYANGANJ ': 'Narayanganj',
  'SARIATPUR': 'Shariatpur',
  'TANGAIL': 'Tangail',
  'BAGERHAT ': 'Bagerhat',
  'CHUADANGA': 'Chuadanga',
  'JHENAIDAH ': 'Jhenaidah',
  'MEHERPUR ': 'Meherpur',
  'NARAIL': 'Narail',
  'JAMALPUR ': 'Jamalpur',
  'NETROKONA': 'Netrokona',
  'SHERPUR ': 'Sherpur',
  'BOGURA': 'Bogura',
  'CHAPAINAWABGANJ': 'Chapainawabganj',
  'CHAPAINAWABGANJ ': 'Chapainawabganj',
  'JOYPUrHAT ': 'Joypurhat',
  'NAOGAON': 'Naogaon',
  'NATOR E': 'Natore',
  'NATOR E ': 'Natore',
  'PABNA ': 'Pabna',
  'RAJSHAHI': 'Rajshahi',
  'SIRAJGANJ': 'Sirajganj',
  'SIRAJGANJ ': 'Sirajganj',
  'DINAJPUR': 'Dinajpur',
  'DINAJPUR ': 'Dinajpur',
  'DINAJPIR': 'Dinajpur',
  'GAIBANDHA': 'Gaibandha',
  'KURIGRAM ': 'Kurigram',
  'LALMONIRHAT': 'Lalmonirhat',
  'LALMONIrHAT ': 'Lalmonirhat',
  'NILPHAMARI': 'Nilphamari',
  'PANCHAGARH ': 'Panchagarh',
  'THAKURGAON ': 'Thakurgaon',
  'HABIGANJ': 'Habiganj',
  'MOULVIB AZAR': 'Moulvibazar',
  'MOULVIBAZAR': 'Moulvibazar',
  'SUNAMGANJ ': 'Sunamganj',
  'SYLHET ': 'Sylhet',
}

async function main() {
  console.log('📥 Starting CSV import...')
  
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
  
  const csvPath = './dghs_consolidated_report_complete.csv'
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n').slice(1) // Skip header
  
  console.log(`Processing ${lines.length} rows...`)
  
  let seeded = 0
  let skipped = 0
  let errors = 0
  
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length < 11) continue
    
    let facilityName = parts[0]?.trim() || ''
    const division = parts[1]?.trim() || ''
    let district = parts[2]?.trim() || ''
    const dateStr = parts[3]?.trim() || ''
    
    if (!dateStr || !district) {
      skipped++
      continue
    }
    
    // Parse date
    const dateParts = dateStr.split('/')
    if (dateParts.length !== 3) {
      skipped++
      continue
    }
    const month = dateParts[0].padStart(2, '0')
    const day = dateParts[1].padStart(2, '0')
    const year = dateParts[2]
    const dateStrISO = `${year}-${month}-${day}`
    const date = new Date(dateStrISO)
    date.setHours(12, 0, 0, 0)
    
    // Only import April 7-20
    const monthDay = parseInt(month) * 100 + parseInt(day)
    if (monthDay < 407 || monthDay > 420) {
      skipped++
      continue
    }
    
    const suspected = parseInt(parts[6]) || 0
    const confirmed = parseInt(parts[7]) || 0
    const suspectedDeath = parseInt(parts[8]) || 0
    const confirmedDeath = parseInt(parts[9]) || 0
    const admitted = parseInt(parts[10]) || 0
    const discharged = parseInt(parts[11]) || 0
    
    // Fix district name
    if (districtFixes[district]) {
      district = districtFixes[district]
    }
    district = district.replace(/\s+$/, '')
    
    // Find facility
    let facility = await prisma.facility.findFirst({
      where: { 
        OR: [
          { facilityName: { equals: facilityName, mode: 'insensitive' } },
          { facilityName: { contains: facilityName.split(' ').slice(0, 2).join(' '), mode: 'insensitive' } }
        ]
      }
    })
    
    // Try finding by district civil surgeon office
    if (!facility && facilityName.toLowerCase().includes('civil surgeon')) {
      // Get district office type ID
      const districtOfficeType = await prisma.facilityType.findFirst({
        where: { slug: 'district-office' }
      })
      if (districtOfficeType) {
        facility = await prisma.facility.findFirst({
          where: { 
            district: district,
            facilityTypeId: districtOfficeType.id
          }
        })
      }
    }
    
    // Try finding any facility in district
    if (!facility) {
      facility = await prisma.facility.findFirst({
        where: { district: district }
      })
    }
    
    if (!facility) {
      errors++
      if (errors <= 5) {
        console.log(`Facility not found: ${facilityName} (${district})`)
      }
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
      if (seeded % 100 === 0) {
        console.log(`Seeded ${seeded} reports...`)
      }
    } catch (err) {
      errors++
    }
  }
  
  console.log(`\n✅ Import complete: ${seeded} reports seeded`)
  console.log(`Skipped: ${skipped}, Errors: ${errors}`)
  
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})