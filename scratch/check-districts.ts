import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const facilities = await prisma.facility.findMany({
    where: {
      facilityName: { contains: 'Civil Surgeon' }
    },
    select: { district: true }
  })
  const districts = facilities.map(f => f.district).sort()
  console.log(`Found ${districts.length} Civil Surgeon Offices:`)
  console.log(districts.join(', '))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
