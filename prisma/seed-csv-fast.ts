import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

const districtFixes: Record<string, string> = {
  'BHOLA': 'Bhola', 'Jhalkathi': 'Jhalokati', 'Jhalkathi ': 'Jhalokati',
  'JASHORE': 'Jashore', 'KUSHTIA': 'Kushtia', 'PATUAKHALI ': 'Patuakhali',
  'PIROJPUR ': 'Pirojpur', 'NOAKHALI ': 'Noakhali', 'RANGAMATI': 'Rangamati',
  'COXSBAZAR': "Cox's Bazar", 'CUMILLA': 'Cumilla', 'KHAGRACHARI': 'Khagrachhari',
  'LAKSHMIPUR': 'Lakshmipur', 'GOPALGANJ': 'Gopalganj', 'FARIDPUR ': 'Faridpur',
  'NARAYANGANJ ': 'Narayanganj', 'SARIATPUR': 'Shariatpur', 'TANGAIL': 'Tangail',
  'BAGERHAT ': 'Bagerhat', 'CHUADANGA': 'Chuadanga', 'JHENAIDAH ': 'Jhenaidah',
  'MEHERPUR ': 'Meherpur', 'NARAIL': 'Narail', 'JAMALPUR ': 'Jamalpur',
  'NETROKONA': 'Netrokona', 'SHERPUR ': 'Sherpur', 'BOGURA': 'Bogura',
  'CHAPAINAWABGANJ': 'Chapainawabganj', 'CHAPAINAWABGANJ ': 'Chapainawabganj',
  'JOYPUrHAT ': 'Joypurhat', 'NAOGAON': 'Naogaon', 'NATOR E': 'Natore',
  'NATOR E ': 'Natore', 'PABNA ': 'Pabna', 'RAJSHAHI': 'Rajshahi',
  'SIRAJGANJ': 'Sirajganj', 'SIRAJGANJ ': 'Sirajganj', 'DINAJPUR': 'Dinajpur',
  'DINAJPUR ': 'Dinajpur', 'DINAJPIR': 'Dinajpur', 'GAIBANDHA': 'Gaibandha',
  'KURIGRAM ': 'Kurigram', 'LALMONIRHAT': 'Lalmonirhat', 'LALMONIrHAT ': 'Lalmonirhat',
  'NILPHAMARI': 'Nilphamari', 'PANCHAGARH ': 'Panchagarh', 'THAKURGAON ': 'Thakurgaon',
  'HABIGANJ': 'Habiganj', 'MOULVIB AZAR': 'Moulvibazar', 'MOULVIBAZAR': 'Moulvibazar',
  'SUNAMGANJ ': 'Sunamganj', 'SYLHET ': 'Sylhet',
}

async function main() {
  console.log('📥 Starting CSV import...')
  
  const outbreak = await prisma.outbreak.findFirst()
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  const districtOfficeType = await prisma.facilityType.findFirst({ where: { slug: 'district-office' } })
  
  if (!outbreak || !admin || !districtOfficeType) {
    console.error('Missing seed data. Run seed.ts first.')
    process.exit(1)
  }
  
  const content = fs.readFileSync('./dghs_consolidated_report_complete.csv', 'utf-8')
  const lines = content.split('\n').slice(1)
  
  // Build facility cache
  console.log('Building facility cache...')
  const facilities = await prisma.facility.findMany({ 
    include: { facilityType: true } 
  })
  const facilityCache = new Map<string, any>()
  
  for (const f of facilities) {
    const key = f.facilityName.toLowerCase()
    if (!facilityCache.has(key)) facilityCache.set(key, f)
    // Also index by district
    if (f.district && f.facilityType.slug === 'district-office') {
      const distKey = `cso_${f.district.toLowerCase()}`
      if (!facilityCache.has(distKey)) facilityCache.set(distKey, f)
    }
  }
  
  console.log(`Cached ${facilityCache.size} facilities`)
  
  let seeded = 0
  let errors = 0
  
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length < 11) continue
    
    let facilityName = parts[0]?.trim() || ''
    const district = (districtFixes[parts[2]?.trim() || parts[2]?.trim() || '').replace(/\s+$/, '')
    const dateStr = parts[3]?.trim() || ''
    
    if (!dateStr || !district) continue
    
    // Parse date
    const [m, d, y] = dateStr.split('/')
    const date = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`)
    date.setHours(12, 0, 0, 0)
    
    // Only April 7-20
    const monthDay = parseInt(m) * 100 + parseInt(d)
    if (monthDay < 407 || monthDay > 420) continue
    
    const suspected = parseInt(parts[6]) || 0
    const confirmed = parseInt(parts[7]) || 0
    const suspectedDeath = parseInt(parts[8]) || 0
    const confirmedDeath = parseInt(parts[9]) || 0
    const admitted = parseInt(parts[10]) || 0
    const discharged = parseInt(parts[11]) || 0
    
    // Find facility
    let facility = facilityCache.get(facilityName.toLowerCase())
    if (!facility && facilityName.toLowerCase().includes('civil surgeon')) {
      facility = facilityCache.get(`cso_${district.toLowerCase()}`)
    }
    if (!facility) facility = facilities.find(f => f.district === district)
    
    if (!facility) {
      errors++
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
        update: { suspected24h: suspected, confirmed24h: confirmed, suspectedDeath24h: suspectedDeath, confirmedDeath24h: confirmedDeath, admitted24h: admitted, discharged24h: discharged, published: true },
        create: {
          facilityId: facility.id, outbreakId: outbreak.id, userId: admin.id, reportingDate: date,
          suspected24h: suspected, confirmed24h: confirmed, suspectedDeath24h: suspectedDeath,
          confirmedDeath24h: confirmedDeath, admitted24h: admitted, discharged24h: discharged, published: true
        }
      })
      
      await prisma.report.upsert({
        where: { facilityId_outbreakId_periodStart: { facilityId: facility.id, outbreakId: outbreak.id, periodStart: date } },
        update: { status: 'PUBLISHED' },
        create: { facilityId: facility.id, outbreakId: outbreak.id, userId: admin.id, periodStart: date, periodEnd: date, status: 'PUBLISHED' }
      })
      
      seeded++
    } catch (e) { errors++ }
  }
  
  console.log(`\n✅ Done: ${seeded} seeded, ${errors} errors`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })