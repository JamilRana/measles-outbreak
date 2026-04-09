import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const count = await prisma.disease.count()
    console.log('Disease count:', count)
  } catch (err) {
    console.error('FAILED TO FETCH DISEASE COUNT:', err)
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
