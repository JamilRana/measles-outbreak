import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const outbreaks = await prisma.outbreak.findMany()
  console.log(JSON.stringify(outbreaks, null, 2))
}

main().finally(() => prisma.$disconnect())
