import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const facilities = [
  // Dhaka Division - Dhaka District
  { facilityCode: 'DHKMC001', facilityName: 'Dhaka Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka' },
  { facilityCode: 'SBMCH01', facilityName: 'Sir Salimullah Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka' },
  { facilityCode: 'DCH001', facilityName: 'Dhaka Central Hospital', facilityType: 'District Hospital', division: 'Dhaka', district: 'Dhaka' },
  // Dhaka Division - Other Districts
  { facilityCode: 'FZ001', facilityName: 'National Institute of Diseases of the Chest & Hospital', facilityType: 'Specialized Hospital', division: 'Dhaka', district: 'Dhaka' },
  { facilityCode: 'TG001', facilityName: 'Tangail Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Tangail' },
  { facilityCode: 'GZ001', facilityName: 'Kashimpur Upazila Health Complex', facilityType: 'Upazila Health Complex', division: 'Dhaka', district: 'Gazipur' },
  { facilityCode: 'FR001', facilityName: 'Faridpur Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Faridpur' },
  // Chattogram Division
  { facilityCode: 'CMCH01', facilityName: 'Chattogram Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Chattogram', district: 'Chattogram' },
  { facilityCode: 'Cox001', facilityName: 'Cox\'s Bazar Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Chattogram', district: "Cox's Bazar" },
  { facilityCode: 'Cum001', facilityName: 'Cumilla Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Chattogram', district: 'Cumilla' },
  // Khulna Division
  { facilityCode: 'KMCH01', facilityName: 'Khulna Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Khulna', district: 'Khulna' },
  { facilityCode: 'SKM001', facilityName: 'Satkhira Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Khulna', district: 'Satkhira' },
  { facilityCode: 'JS001', facilityName: 'Jashore General Hospital', facilityType: 'District Hospital', division: 'Khulna', district: 'Jashore' },
  // Rajshahi Division
  { facilityCode: 'RMCH01', facilityName: 'Rajshahi Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Rajshahi', district: 'Rajshahi' },
  { facilityCode: 'BMCH01', facilityName: 'Bogura Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Rajshahi', district: 'Bogura' },
  // Sylhet Division
  { facilityCode: 'SMCH01', facilityName: 'Sylhet Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Sylhet', district: 'Sylhet' },
  // Barishal Division
  { facilityCode: 'BMCH02', facilityName: 'Barishal Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Barishal', district: 'Barishal' },
  // Rangpur Division
  { facilityCode: 'RPMCH', facilityName: 'Rangpur Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Rangpur', district: 'Rangpur' },
  { facilityCode: 'DN001', facilityName: 'Dinajpur District Hospital', facilityType: 'District Hospital', division: 'Rangpur', district: 'Dinajpur' },
  // Mymensingh Division
  { facilityCode: 'MMCH01', facilityName: 'Mymensingh Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Mymensingh', district: 'Mymensingh' },
  { facilityCode: 'JL001', facilityName: 'Jamalpur District Hospital', facilityType: 'District Hospital', division: 'Mymensingh', district: 'Jamalpur' },
]

async function main() {
  const adminPassword = await bcrypt.hash('admin@321', 10)

  // ─── 1. Seed Facilities ─────────────────────────────
  for (const fac of facilities) {
    await prisma.facility.upsert({
      where: { facilityCode: fac.facilityCode },
      update: {},
      create: fac,
    })
  }
  console.log(`✓ Seeded ${facilities.length} facilities`)

  // ─── 2. Seed Admin User ─────────────────────────────
  const adminFac = await prisma.facility.findUnique({ where: { facilityCode: 'DHKMC001' } })
  
  const existingAdmin = await prisma.user.findFirst({ 
    where: { 
      OR: [
        { email: 'admin@monitor.org' },
        { nameNormalized: 'admin user' }
      ]
    } 
  })
  if (!existingAdmin && adminFac) {
    await prisma.user.create({
      data: {
        email: 'admin@monitor.org',
        password: adminPassword,
        name: 'Admin User',
        nameNormalized: 'admin user',
        facilityId: adminFac.id,
        role: 'ADMIN',
        isActive: true,
      },
    })
    console.log('✓ Seeded admin user')
  } else {
    console.log('✓ Admin user already exists')
  }

  // ─── 3. Seed Disease ─────────────────────────────────
  const diseases = [
    { code: 'MEASL', name: 'Measles', description: 'Measles (Rubeola)' },
    { code: 'DENGU', name: 'Dengue', description: 'Dengue Haemorrhagic Fever' },
    { code: 'CHOLR', name: 'Cholera', description: 'Vibrio Cholerae' }
  ]

  for (const d of diseases) {
    await prisma.disease.upsert({
      where: { code: d.code },
      update: {},
      create: { ...d, isActive: true }
    })
  }

  const measles = await prisma.disease.findUnique({ where: { code: 'MEASL' } })
  const dengue = await prisma.disease.findUnique({ where: { code: 'DENGU' } })
  const cholera = await prisma.disease.findUnique({ where: { code: 'CHOLR' } })

  // ─── 4. Seed Outbreak ─────────────────────────────────
  const MEASLES_OUTBREAK_ID = 'outbreak_measles_2026'
  const DENGUE_OUTBREAK_ID = 'outbreak_dengue_2026'

  if (measles) {
    await prisma.outbreak.upsert({
      where: { id: MEASLES_OUTBREAK_ID },
      update: {},
      create: {
        id: MEASLES_OUTBREAK_ID,
        diseaseId: measles.id,
        name: 'Measles 2026',
        status: 'ACTIVE' as any,
        isActive: true,
        startDate: new Date('2026-01-01')
      }
    })
  }

  if (dengue) {
     await prisma.outbreak.upsert({
      where: { id: DENGUE_OUTBREAK_ID },
      update: {},
      create: {
        id: DENGUE_OUTBREAK_ID,
        diseaseId: dengue.id,
        name: 'Dengue Monsoon 2026',
        status: 'ACTIVE' as any,
        isActive: true,
        startDate: new Date('2026-04-01')
      }
    })
  }

  // ─── 5. Seed Dynamic Fields ─────────────────────────
  if (dengue) {
    const dengueFields = [
      { label: 'Platelet Count (Average)', fieldKey: 'platelet_avg', fieldType: 'NUMBER' as any, section: 'Laboratory' },
      { label: 'Warning Signs Noted', fieldKey: 'warning_signs', fieldType: 'BOOLEAN' as any, section: 'Clinical' },
      { label: 'NS1 Positive Count', fieldKey: 'ns1_positive', fieldType: 'NUMBER' as any, section: 'Laboratory' }
    ]
    for (const f of dengueFields) {
      await prisma.formField.upsert({
        where: { outbreakId_fieldKey: { outbreakId: DENGUE_OUTBREAK_ID, fieldKey: f.fieldKey } },
        update: {},
        create: { ...f, outbreakId: DENGUE_OUTBREAK_ID, isRequired: false }
      })
    }
  }

  if (cholera) {
     const choleraFields = [
       { label: 'Severe Dehydration Cases', fieldKey: 'severe_dehyd', fieldType: 'NUMBER' as any, section: 'Clinical' },
       { label: 'IV Fluid Used (Liters)', fieldKey: 'iv_fluid', fieldType: 'NUMBER' as any, section: 'Logistics' }
     ]
     // We need an outbreak for cholera too to attach fields
     const CHOLERA_OUTBREAK_ID = 'outbreak_cholera_2026';
     await prisma.outbreak.upsert({
       where: { id: CHOLERA_OUTBREAK_ID },
       update: {},
       create: {
         id: CHOLERA_OUTBREAK_ID,
         diseaseId: cholera.id,
         name: 'Cholera Response 2026',
         status: 'ACTIVE' as any,
         isActive: true,
         startDate: new Date('2026-03-01')
       }
     })
     for (const f of choleraFields) {
        await prisma.formField.upsert({
          where: { outbreakId_fieldKey: { outbreakId: CHOLERA_OUTBREAK_ID, fieldKey: f.fieldKey } },
          update: {},
          create: { ...f, outbreakId: CHOLERA_OUTBREAK_ID, isRequired: false }
        })
      }
  }

  // ─── 6. Seed Editor (Regional Manager) ──────────────
  const managerPassword = await bcrypt.hash('editor@321', 10)
  await prisma.user.upsert({
    where: { email: 'division.manager@monitor.org' },
    update: {},
    create: {
      email: 'division.manager@monitor.org',
      password: managerPassword,
      name: 'Regional Manager (Dhaka/Chattogram)',
      nameNormalized: 'regional manager',
      role: 'EDITOR' as any,
      isActive: true,
      managedDivisions: ['Dhaka', 'Chattogram'] as any,
    } as any
  })

  // ─── 7. Backfill existing DailyReport rows ─────────────
  const totalBackfilled = await prisma.$executeRaw`
    UPDATE "DailyReport" 
    SET "outbreakId" = ${MEASLES_OUTBREAK_ID} 
    WHERE "outbreakId" IS NULL
  `
  console.log(`✓ Backfilled ${totalBackfilled} DailyReport rows → ${MEASLES_OUTBREAK_ID}`)

  // ─── 8. Seed Default Settings ───────────────────────────
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        cutoffHour: 14,
        cutoffMinute: 0,
        editDeadlineHour: 10,
        editDeadlineMinute: 0,
        publishTimeHour: 9,
        publishTimeMinute: 0,
        enablePublicView: true,
        enableEmailNotifications: true,
        defaultOutbreakId: MEASLES_OUTBREAK_ID,
      }
    });
    console.log('✓ Seeded default settings with defaultOutbreakId')
  } else {
    // Update existing settings with the default outbreak
    await prisma.settings.update({
      where: { id: existingSettings.id },
      data: { defaultOutbreakId: MEASLES_OUTBREAK_ID },
    })
    console.log('✓ Updated existing settings with defaultOutbreakId')
  }

  console.log('\n🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })