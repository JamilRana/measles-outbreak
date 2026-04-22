import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const facilities = await prisma.facility.findMany({
    orderBy: { facilityName: 'asc' }
  })
  
  console.log("Checking for duplicates...")
  
  for (let i = 0; i < facilities.length; i++) {
    for (let j = i + 1; j < facilities.length; j++) {
      const f1 = facilities[i]
      const f2 = facilities[j]
      
      const n1 = f1.facilityName.toLowerCase().replace(/[^a-z0-9]/g, '')
      const n2 = f2.facilityName.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      // If names are very similar and they are in the same district
      if ((n1.includes(n2) || n2.includes(n1)) && f1.district === f2.district) {
         console.log(`Potential Duplicate: `)
         console.log(`  1: [${f1.id}] ${f1.facilityName} (${f1.facilityCode})`)
         console.log(`  2: [${f2.id}] ${f2.facilityName} (${f2.facilityCode})`)
      }
    }
  }
}

main().finally(() => prisma.$disconnect())
