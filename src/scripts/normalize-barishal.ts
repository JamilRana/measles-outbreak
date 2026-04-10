import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Normalizing Barishal Division and Districts ---')
  
  // 1. Normalize Division name: Barisal -> Barishal
  const res1 = await prisma.facility.updateMany({
    where: { division: 'Barisal' },
    data: { division: 'Barishal' }
  })
  console.log(`Updated ${res1.count} facilities: Division Barisal -> Barishal`)

  // 2. Normalize District name: Barisal -> Barishal
  const res2 = await prisma.facility.updateMany({
    where: { district: 'Barisal' },
    data: { district: 'Barishal' }
  })
  console.log(`Updated ${res2.count} facilities: District Barisal -> Barishal`)

  // 3. Normalize District name: Jhalokati -> Jhalokathi
  const res3 = await prisma.facility.updateMany({
    where: { district: 'Jhalokati' },
    data: { district: 'Jhalokathi' }
  })
  console.log(`Updated ${res3.count} facilities: District Jhalokati -> Jhalokathi`)

  console.log('--- Normalization Complete ---')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
