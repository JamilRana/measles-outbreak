import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
    const data = JSON.parse(fs.readFileSync('reports_by_email.json', 'utf8'))
    const emails = Object.keys(data)
    
    console.log(`Total emails in JSON: ${emails.length}`)
    
    const dbUsers = await prisma.user.findMany({
        where: {
            email: { in: emails }
        },
        include: {
            facility: true
        }
    })
    
    console.log(`Matched users in DB: ${dbUsers.length}`)
    
    const unmatched = emails.filter(e => !dbUsers.find(u => u.email === e))
    console.log(`Unmatched emails: ${unmatched.length}`)
    if (unmatched.length > 0) {
        console.log('Sample unmatched emails:', unmatched.slice(0, 5))
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
