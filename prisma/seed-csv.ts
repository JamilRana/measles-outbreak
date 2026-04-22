import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import csv from 'csv-parser'

const prisma = new PrismaClient()

interface CovidRow {
  'Facility Name': string
  Division: string
  District: string
  'Reporting Date': string
  Status: string
  Verified: string
  'Suspected cases': string
  'Confirmed cases': string
  'Suspected deaths': string
  'Confirmed deaths': string
  Admitted: string
  Discharged: string
  'Serum samples sent': string
}

async function normalizeDistrict(district: string): string {
  let d = district.trim().toLowerCase()
  
  const corrections: Record<string, string> = {
    'bhola': 'Bhola',
    'jhalkathi': 'Jhalokati',
    'jhalkathi ': 'Jhalokati',
    'patuakhali ': 'Patuakhali',
    'pirojpur ': 'Pirojpur',
    'cox sbazar': "Cox's Bazar",
    'coxbsazar': "Cox's Bazar",
    'cumilla': 'Cumilla',
    'khagrachari': 'Khagrachhari',
    'khagrachari': 'Khagrachhari',
    'noakhali ': 'Noakhali',
    'rangamati': 'Rangamati',
    'faridpur ': 'Faridpur',
    'gazipur': 'Gazipur',
    'gopalganj': 'Gopalganj',
    'gopalganj ': 'Gopalganj',
    'kishoreganj': 'Kishoreganj',
    'kishoreganj ': 'Kishoreganj',
    'madaripur': 'Madaripur',
    'munshiganj': 'Munshiganj',
    'munshiganj ': 'Munshiganj',
    'narayanganj': 'Narayanganj',
    'narayanganj ': 'Narayanganj',
    'narsingdi': 'Narsingdi',
    'rajbari': 'Rajbari',
    'rajbari ': 'Rajbari',
    'shariatpur': 'Shariatpur',
    'shariatpur ': 'Shariatpur',
    'tangail': 'Tangail',
    'jashore': 'Jashore',
    'jhenaidah': 'Jhenaidah',
    'jhenaidah ': 'Jhenaidah',
    'kushtia': 'Kushtia',
    'kushtia ': 'Kushtia',
    'kushtia': 'Kushtia',
    'meherpur': 'Meherpur',
    'narail': 'Narail',
    'satkhira': 'Satkhira',
    'jamalpur': 'Jamalpur',
    'mymensingh': 'Mymensingh',
    'netrokona': 'Netrokona',
    'sherpur': 'Sherpur',
    'bogura': 'Bogura',
    'chapainawabganj': 'Chapainawabganj',
    'joypurhat': 'Joypurhat',
    'naogaon': 'Naogaon',
    'natore': 'Natore',
    'pabna': 'Pabna',
    'rajshahi': 'Rajshahi',
    'sirajganj': 'Sirajganj',
    'dinajpur': 'Dinajpur',
    'dinajpur ': 'Dinajpur',
    'gaibandha': 'Gaibandha',
    'kurigram': 'Kurigram',
    'lalmonirhat': 'Lalmonirhat',
    'nilphamari': 'Nilphamari',
    'panchagarh': 'Panchagarh',
    'rangpur': 'Rangpur',
    'thakurgaon': 'Thakurgaon',
    'habiganj': 'Habiganj',
    'moulvibazar': 'Moulvibazar',
    'moulvibazar': 'Moulvibazar',
    'sunamganj': 'Sunamganj',
    'sylhet': 'Sylhet',
    'chandpur': 'Chandpur',
    'lakshmipur': 'Lakshmipur',
    'barguna': 'Barguna',
    'barisal': 'Barisal',
    'dhaka': 'Dhaka',
  }
  
  for (const [key, value] of Object.entries(corrections)) {
    if (d.includes(key) || d === key) {
      return value
    }
  }
  
  return district.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ').replace(/ $/, '')
}

async function normalizeFacilityName(name: string): string {
  return name.trim()
}

async function importCSV(filePath: string) {
  console.log(`Reading CSV from ${filePath}...`)
  
  const results: CovidRow[] = []
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data as unknown as CovidRow))
    .on('end', async () => {
      console.log(`Loaded ${results.length} rows from CSV`)
      await seedData(results)
    })
}

async function seedData(rows: CovidRow[]) {
  console.log('Starting seed...')
  
  // Get outbreak and default user
  const outbreak = await prisma.outbreak.findFirst()
  if (!outbreak) {
    console.error('No outbreak found. Run seed.ts first.')
    process.exit(1)
  }
  
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) {
    console.error('No admin user found. Run seed.ts first.')
    process.exit(1)
  }
  
  console.log(`Using outbreak: ${outbreak.id}`)
  console.log(`Using admin user: ${admin.id}`)
  
  // Group by facility and date
  const reportsByFacilityDate = new Map<string, any>()
  
  for (const row of rows) {
    const facilityName = await normalizeFacilityName(row['Facility Name'])
    const division = row.Division.trim()
    const district = await normalizeDistrict(row.District)
    const dateStr = row['Reporting Date'].trim()
    const date = new Date(dateStr)
    
    if (isNaN(date.getTime())) {
      console.log(`Skipping invalid date: ${dateStr}`)
      continue
    }
    
    const dateKey = date.toISOString().split('T')[0]
    const key = `${facilityName}|${dateKey}`
    
    const suspected = parseInt(row['Suspected cases'] || '0') || 0
    const confirmed = parseInt(row['Confirmed cases'] || '0') || 0
    const suspectedDeath = parseInt(row['Suspected deaths'] || '0') || 0
    const confirmedDeath = parseInt(row['Confirmed deaths'] || '0') || 0
    const admitted = parseInt(row.Admitted || '0') || 0
    const discharged = parseInt(row.Discharged || '0') || 0
    
    if (!reportsByFacilityDate.has(key)) {
      reportsByFacilityDate.set(key, {
        facilityName,
        division,
        district,
        date: dateKey,
        suspected,
        confirmed,
        suspectedDeath,
        confirmedDeath,
        admitted,
        discharged,
      })
    } else {
      const existing = reportsByFacilityDate.get(key)
      // For cumulative data, use the latest value
      reportsByFacilityDate.set(key, {
        ...existing,
        suspected: existing.suspected + suspected,
        confirmed: existing.confirmed + confirmed,
        suspectedDeath: existing.suspectedDeath + suspectedDeath,
        confirmedDeath: existing.confirmedDeath + confirmedDeath,
        admitted: existing.admitted + admitted,
        discharged: existing.discharged + discharged,
      })
    }
  }
  
  console.log(`Seeding ${reportsByFacilityDate.size} unique facility-date combinations...`)
  
  let seeded = 0
  let failed = 0
  
  for (const [key, data] of reportsByFacilityDate) {
    // Find or create facility
    let facility = await prisma.facility.findFirst({
      where: {
        OR: [
          { facilityName: { contains: data.facilityName, mode: 'insensitive' } },
          { facilityName: { equals: data.facilityName } },
        ]
      }
    })
    
    // Try to find by district if facility not found
    if (!facility && data.facilityName.toLowerCase().includes('civil surgeon')) {
      facility = await prisma.facility.findFirst({
        where: { 
          district: data.district,
          facilityType: { slug: 'district-office' }
        }
      })
    }
    
    if (!facility) {
      // Create temporary facility
      facility = await prisma.facility.create({
        data: {
          facilityCode: `TMP-${data.district.substring(0, 3).toUpperCase()}-${Date.now()}`,
          facilityName: data.facilityName,
          division: data.division,
          district: data.district,
          upazila: data.district,
          facilityTypeId: (await prisma.facilityType.findFirst())?.id || '',
        }
      })
    }
    
    const reportDate = new Date(data.date)
    reportDate.setHours(12, 0, 0, 0)
    
    try {
      // Create DailyReport (legacy)
      await prisma.dailyReport.upsert({
        where: {
          facilityId_outbreakId_reportingDate: {
            facilityId: facility.id,
            outbreakId: outbreak.id,
            reportingDate: reportDate,
          }
        },
        update: {
          suspected24h: data.suspected,
          confirmed24h: data.confirmed,
          suspectedDeath24h: data.suspectedDeath,
          confirmedDeath24h: data.confirmedDeath,
          admitted24h: data.admitted,
          discharged24h: data.discharged,
          published: true,
        },
        create: {
          facilityId: facility.id,
          outbreakId: outbreak.id,
          userId: admin.id,
          reportingDate: reportDate,
          suspected24h: data.suspected,
          confirmed24h: data.confirmed,
          suspectedDeath24h: data.suspectedDeath,
          confirmedDeath24h: data.confirmedDeath,
          admitted24h: data.admitted,
          discharged24h: data.discharged,
          published: true,
        }
      })
      
      // Create Modern Report
      await prisma.report.upsert({
        where: {
          facilityId_outbreakId_periodStart: {
            facilityId: facility.id,
            outbreakId: outbreak.id,
            periodStart: reportDate,
          }
        },
        update: {
          status: 'PUBLISHED',
        },
        create: {
          facilityId: facility.id,
          outbreakId: outbreak.id,
          userId: admin.id,
          periodStart: reportDate,
          periodEnd: reportDate,
          status: 'PUBLISHED',
        }
      })
      
      seeded++
      if (seeded % 100 === 0) {
        console.log(`Seeded ${seeded} reports...`)
      }
    } catch (err) {
      failed++
      console.log(`Failed to seed ${data.facilityName} on ${data.date}:`, err.message)
    }
  }
  
  console.log(`\n✅ Seed complete: ${seeded} reports seeded, ${failed} failed`)
  await prisma.$disconnect()
}

const filePath = process.argv[2] || './data.csv'
importCSV(filePath)