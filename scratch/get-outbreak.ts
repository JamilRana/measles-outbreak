import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const o = await prisma.outbreak.findFirst()
    console.log(o)
}

main().catch(console.error).finally(() => prisma.$disconnect())
