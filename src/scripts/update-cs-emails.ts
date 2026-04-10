import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Email Standardization Migration ---')
  
  // 1. Find all facilities that are Civil Surgeon Offices
  const facilities = await prisma.facility.findMany({
    where: {
      facilityName: {
        contains: 'Civil Surgeon',
        mode: 'insensitive'
      }
    }
  })

  console.log(`Found ${facilities.length} Civil Surgeon Office facilities.`)

  for (const facility of facilities) {
    if (!facility.district) {
      console.warn(`Facility ${facility.facilityName} has no district. Skipping.`)
      continue
    }

    // Format district name: lowercase, alphanumeric only
    const districtSlug = facility.district.toLowerCase().replace(/[^a-z0-9]/g, '')
    const targetEmail = `${districtSlug}@cs.dghs.gov.bd`

    console.log(`Processing: ${facility.facilityName} (${facility.district}) -> ${targetEmail}`)

    // Update Facility Email
    await prisma.facility.update({
      where: { id: facility.id },
      data: { email: targetEmail }
    })

    // Update Users associated with this facility
    const users = await prisma.user.findMany({
      where: { facilityId: facility.id }
    })

    for (const user of users) {
       // Only update if it's a standard USER or if specifically requested.
       // The user said "in facility AND user". 
       // We should check if another user already has this email to avoid unique constraint violations.
       const emailConflict = await prisma.user.findFirst({
         where: { 
           email: targetEmail,
           id: { not: user.id }
         }
       })

       if (emailConflict) {
         console.error(`  CONFLICT: User email ${targetEmail} is already taken by user ID ${emailConflict.id}.`)
         continue
       }

       await prisma.user.update({
         where: { id: user.id },
         data: { email: targetEmail }
       })
       console.log(`  Updated user: ${user.email} -> ${targetEmail}`)
    }
  }

  console.log('--- Migration Complete ---')
}

main()
  .catch(e => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
