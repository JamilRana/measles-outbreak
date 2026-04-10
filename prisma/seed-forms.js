import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const measlesFields = [
  // Cases
  { label: 'Suspected Cases (24h)', labelBn: 'সন্দেহধন্যা (২৪ ঘণ্টা)', fieldKey: 'suspected24h', fieldType: 'NUMBER', section: 'cases', isRequired: true, sortOrder: 1 },
  { label: 'Confirmed Cases (24h)', labelBn: 'নিশ্চিত্রধন্যা (২৪ ঘণ্টা)', fieldKey: 'confirmed24h', fieldType: 'NUMBER', section: 'cases', isRequired: true, sortOrder: 2 },
  
  // Mortality
  { label: 'Suspected Deaths (24h)', labelBn: 'সন্দেহধন্যা মৃত্যু (২৪ ঘণ্টা)', fieldKey: 'suspectedDeath24h', fieldType: 'NUMBER', section: 'mortality', isRequired: true, sortOrder: 3 },
  { label: 'Confirmed Deaths (24h)', labelBn: 'নিশ্চিত্রধন্যা মৃত্যু (২৪ ঘণ্টা)', fieldKey: 'confirmedDeath24h', fieldType: 'NUMBER', section: 'mortality', isRequired: true, sortOrder: 4 },
  
  // Hospitalization
  { label: 'Admitted (24h)', labelBn: 'ভর্তি (২৪ ঘণ্টা)', fieldKey: 'admitted24h', fieldType: 'NUMBER', section: 'hospitalization', isRequired: true, sortOrder: 5 },
  { label: 'Discharged (24h)', labelBn: 'ডিসচার্জ (২৪ ঘণ্টা)', fieldKey: 'discharged24h', fieldType: 'NUMBER', section: 'hospitalization', isRequired: true, sortOrder: 6 },
  
  // Laboratory
  { label: 'Serum Sent to Lab (24h)', labelBn: 'ল্যাবে পাঠানো সিরাম (২৪ ঘণ্টা)', fieldKey: 'serumSent24h', fieldType: 'NUMBER', section: 'lab', isRequired: false, sortOrder: 7 },
]

async function main() {
  // Find or create Disease
  let disease = await prisma.disease.findUnique({ where: { code: 'MEASLES' } })
  if (!disease) {
    disease = await prisma.disease.create({
      data: { name: 'Measles', code: 'MEASLES', description: 'Measles Outbreak Monitoring' }
    })
    console.log('Created Disease: Measles')
  } else {
    console.log('Found Disease: Measles')
  }

  // Find or create Outbreak
  let outbreak = await prisma.outbreak.findFirst({ 
    where: { diseaseId: disease.id, status: 'ACTIVE', isActive: true }
  })
  if (!outbreak) {
    outbreak = await prisma.outbreak.create({
      data: {
        diseaseId: disease.id,
        name: 'Measles Outbreak 2026',
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
        isActive: true,
        allowBacklogReporting: true,
        backlogStartDate: new Date('2026-01-01'),
        backlogEndDate: new Date('2026-12-31'),
      }
    })
    console.log('Created Outbreak: Measles Outbreak 2026 with backlog enabled')
  } else {
    // Update existing outbreak with backlog settings
    outbreak = await prisma.outbreak.update({
      where: { id: outbreak.id },
      data: {
        allowBacklogReporting: true,
        backlogStartDate: new Date('2026-01-01'),
        backlogEndDate: new Date('2026-12-31'),
      }
    })
    console.log('Updated Outbreak with backlog settings:', outbreak.name)
  }

  // Check existing fields
  const existingFields = await prisma.formField.findMany({ where: { outbreakId: outbreak.id } })
  console.log(`Found ${existingFields.length} existing fields`)

  if (existingFields.length === 0) {
    // Create all fields
    for (const field of measlesFields) {
      await prisma.formField.create({
        data: { ...field, outbreakId: outbreak.id }
      })
      console.log(`Created field: ${field.label}`)
    }
    console.log('All measles fields seeded!')
  } else {
    console.log('Fields already exist, skipping...')
  }

  // Update settings with default outbreak
  const settings = await prisma.settings.findFirst()
  if (settings) {
    await prisma.settings.update({
      where: { id: settings.id },
      data: { defaultOutbreakId: outbreak.id }
    })
    console.log('Updated settings with defaultOutbreakId')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())