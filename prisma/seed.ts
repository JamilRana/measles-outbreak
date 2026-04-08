import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin@321', 10)
  const userPassword = await bcrypt.hash('user123', 10)

  console.log('Seeding admin user...')
  await prisma.user.upsert({
    where: { email: 'admin@monitor.org' },
    update: {
      password: adminPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
    create: {
      email: 'admin@monitor.org',
      password: adminPassword,
      facilityName: 'National Monitoring Center',
      nameNormalized: 'national monitoring center',
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })

  console.log('Seeding test user...')
  await prisma.user.upsert({
    where: { email: 'dhaka.medical@monitor.org' },
    update: {
      password: userPassword,
      role: 'USER',
      emailVerified: new Date(),
    },
    create: {
      email: 'dmch@hospi.dghs.gov.bd',
      password: userPassword,
      facilityName: 'Dhaka Medical College Hospital',
      nameNormalized: 'dhaka medical college hospital',
      role: 'USER',
      emailVerified: new Date(),
    },
  })

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
