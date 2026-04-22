import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.dailyReport.count().then(c => console.log('Count:', c)).finally(() => p.$disconnect())
