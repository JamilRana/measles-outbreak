import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const COMMON_PASSWORD = 'facility@2026'

async function main() {
  const facilities = await prisma.facility.findMany()
  console.log(`Found ${facilities.length} facilities`)

  const adminFac = facilities.find(f => f.division === 'Dhaka')
  const adminPassword = await bcrypt.hash('admin@321', 10)
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@monitor.org' } })
  if (!existingAdmin && adminFac) {
    await prisma.user.create({
      data: {
        email: 'admin@monitor.org',
        password: adminPassword,
        name: 'Admin User',
        nameNormalized: 'admin',
        facility: { connect: { id: adminFac.id } },
        role: 'ADMIN',
        isActive: true,
      }
    })
    console.log('Admin created')
  }

  const hashedPassword = await bcrypt.hash(COMMON_PASSWORD, 10)
  
  const existingUsers = await prisma.user.findMany({ select: { email: true } })
  const existingEmails = new Set(existingUsers.map(u => u.email))
  
  const usersToCreate = facilities
    .filter(f => !existingEmails.has(`${f.facilityCode.toLowerCase()}@facility.gov.bd`))
    .map(f => ({
      email: `${f.facilityCode.toLowerCase()}@facility.gov.bd`,
      password: hashedPassword,
      name: f.facilityName,
      nameNormalized: f.facilityName.substring(0, 20),
      facilityId: f.id,
      role: 'USER' as const,
      isActive: true,
    }))
  
  console.log(`Creating ${usersToCreate.length} users...`)
  
  for (const user of usersToCreate) {
    await prisma.user.create({ data: user })
  }
  
  console.log('Done!')

  const settings = await prisma.settings.findFirst()
  if (!settings) {
    await prisma.settings.create({
      data: {
        cutoffHour: 14,
        cutoffMinute: 0,
        editDeadlineHour: 10,
        editDeadlineMinute: 0,
      }
    })
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())