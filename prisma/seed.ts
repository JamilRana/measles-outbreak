import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const facilities = [
  { facilityCode: 'DHKMC001', facilityName: 'Dhaka Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: ' Dhaka' },
  { facilityCode: 'SBMCH01', facilityName: 'Sir Salimullah Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: ' Dhaka' },
  { facilityCode: 'DCH001', facilityName: 'Dhaka Central Hospital', facilityType: 'District Hospital', division: 'Dhaka', district: 'Dhaka', upazila: ' Dhaka' },
  { facilityCode: 'NMCH01', facilityName: 'National Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: ' Dhaka' },
  { facilityCode: 'TG001', facilityName: 'Tangail Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Tangail', upazila: 'Tangail Sadar' },
  { facilityCode: 'GZ001', facilityName: 'Gazipur Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Gazipur', upazila: 'Gazipur Sadar' },
  { facilityCode: 'FR001', facilityName: 'Faridpur Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Faridpur', upazila: 'Faridpur Sadar' },
  { facilityCode: 'KIS001', facilityName: 'Kishoreganj Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Dhaka', district: 'Kishoreganj', upazila: 'Kishoreganj Sadar' },
  { facilityCode: 'CMCH01', facilityName: 'Chattogram Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Chattogram', district: 'Chattogram', upazila: 'Chattogram' },
  { facilityCode: 'CUM001', facilityName: 'Cumilla Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Chattogram', district: 'Cumilla', upazila: 'Cumilla Sadar' },
  { facilityCode: 'COX001', facilityName: "Cox's Bazar Medical College Hospital", facilityType: 'Medical College Hospital', division: 'Chattogram', district: "Cox's Bazar", upazila: "Cox's Bazar Sadar" },
  { facilityCode: 'FEN001', facilityName: 'Feni Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Chattogram', district: 'Feni', upazila: 'Feni Sadar' },
  { facilityCode: 'KMCH01', facilityName: 'Khulna Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Khulna', district: 'Khulna', upazila: 'Khulna' },
  { facilityCode: 'SKM001', facilityName: 'Satkhira Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Khulna', district: 'Satkhira', upazila: 'Satkhira Sadar' },
  { facilityCode: 'JASH001', facilityName: 'Jashore General Hospital', facilityType: 'District Hospital', division: 'Khulna', district: 'Jashore', upazila: 'Jashore Sadar' },
  { facilityCode: 'RMCH01', facilityName: 'Rajshahi Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Rajshahi', district: 'Rajshahi', upazila: 'Rajshahi' },
  { facilityCode: 'BMCH01', facilityName: 'Bogura Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Rajshahi', district: 'Bogura', upazila: 'Bogura Sadar' },
  { facilityCode: 'NAT001', facilityName: 'Natore Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Rajshahi', district: 'Natore', upazila: 'Natore Sadar' },
  { facilityCode: 'SMCH01', facilityName: 'Sylhet Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Sylhet', district: 'Sylhet', upazila: 'Sylhet' },
  { facilityCode: 'MBS001', facilityName: 'Moulvibazar District Hospital', facilityType: 'District Hospital', division: 'Sylhet', district: 'Moulvibazar', upazila: 'Moulvibazar Sadar' },
  { facilityCode: 'HAB001', facilityName: 'Habiganj District Hospital', facilityType: 'District Hospital', division: 'Sylhet', district: 'Habiganj', upazila: 'Habiganj Sadar' },
  { facilityCode: 'BMCH02', facilityName: 'Barishal Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Barishal', district: 'Barishal', upazila: 'Barishal' },
  { facilityCode: 'PAT001', facilityName: 'Patuakhali District Hospital', facilityType: 'District Hospital', division: 'Barishal', district: 'Patuakhali', upazila: 'Patuakhali Sadar' },
  { facilityCode: 'RPMCH01', facilityName: 'Rangpur Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Rangpur', district: 'Rangpur', upazila: 'Rangpur' },
  { facilityCode: 'DIN001', facilityName: 'Dinajpur Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Rangpur', district: 'Dinajpur', upazila: 'Dinajpur Sadar' },
  { facilityCode: 'THK001', facilityName: 'Thakurgaon District Hospital', facilityType: 'District Hospital', division: 'Rangpur', district: 'Thakurgaon', upazila: 'Thakurgaon Sadar' },
  { facilityCode: 'MMCH01', facilityName: 'Mymensingh Medical College Hospital', facilityType: 'Medical College Hospital', division: 'Mymensingh', district: 'Mymensingh', upazila: 'Mymensingh' },
  { facilityCode: 'JAM001', facilityName: 'Jamalpur District Hospital', facilityType: 'District Hospital', division: 'Mymensingh', district: 'Jamalpur', upazila: 'Jamalpur Sadar' },
  { facilityCode: 'SHR001', facilityName: 'Sherpur District Hospital', facilityType: 'District Hospital', division: 'Mymensingh', district: 'Sherpur', upazila: 'Sherpur Sadar' },
]

async function main() {
  console.log('Clearing existing data...')
  await prisma.dailyReport.deleteMany()
  console.log('Deleted reports')
  await prisma.user.deleteMany()
  console.log('Deleted users')
  await prisma.facility.deleteMany()
  console.log('Deleted facilities')

  console.log('Seeding facilities...')
  for (const f of facilities) {
    await prisma.facility.create({ data: f })
  }
  console.log(`Seeded ${facilities.length} facilities`)

  console.log('Seeding admin user...')
  const adminFac = await prisma.facility.findUnique({ where: { facilityCode: 'DHKMC001' } })
  const adminPassword = await bcrypt.hash('admin@321', 10)
  
  if (adminFac) {
    await prisma.user.create({
      data: {
        email: 'admin@monitor.org',
        password: adminPassword,
        name: 'Admin User',
        nameNormalized: 'admin user',
        facility: { connect: { id: adminFac.id } },
        role: 'ADMIN',
        isActive: true,
      }
    })
  } else {
    await prisma.user.create({
      data: {
        email: 'admin@monitor.org',
        password: adminPassword,
        name: 'Admin User',
        nameNormalized: 'admin user',
        role: 'ADMIN',
        isActive: true,
      }
    })
  }
  console.log('Seeded admin user')

  console.log('Seeding settings...')
  await prisma.settings.create({
    data: {
      cutoffHour: 14,
      cutoffMinute: 0,
      editDeadlineHour: 10,
      editDeadlineMinute: 0,
      publishTimeHour: 9,
      publishTimeMinute: 0,
    }
  })
  console.log('Seeded settings')

  console.log('\nSeed complete!')
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })