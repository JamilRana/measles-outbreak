import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
    const data = JSON.parse(fs.readFileSync('reports_by_email.json', 'utf8'))
    const outbreakId = 'measles-2026'
    
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (!admin) throw new Error("Admin user not found")

    // Get all users for mapping
    const dbUsers = await prisma.user.findMany({
        include: { facility: true }
    })
    const userMap = new Map(dbUsers.map(u => [u.email.toLowerCase(), u]))

    const stats = {
        total: 0,
        imported: 0,
        skipped: 0,
        errors: 0
    }

    for (const [email, reports] of Object.entries(data)) {
        const normalizedEmail = email.toLowerCase()
        let user = userMap.get(normalizedEmail)
        
        if (!user && normalizedEmail === 'jhalakathi@cs.dghs.gov.bd') {
            user = userMap.get('jhalokati@cs.dghs.gov.bd')
        }

        if (!user) {
            console.log(`\nUser not found for email: ${email}. Using admin fallback if reports exist.`)
        }

        for (const report of (reports as any[])) {
            stats.total++
            try {
                const [m, d, y] = report.reportingDate.split('/')
                const reportingDate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))

                let facilityId = user?.facilityId
                let userId = user?.id || admin.id

                if (!facilityId) {
                    const facility = await prisma.facility.findFirst({
                        where: {
                            facilityName: { contains: report.facilityName, mode: 'insensitive' },
                            district: { contains: report.district, mode: 'insensitive' }
                        }
                    })
                    facilityId = facility?.id
                }

                if (!facilityId) {
                    process.stdout.write('S') // Skipped
                    stats.skipped++
                    continue
                }
                process.stdout.write('.')
                stats.imported++

                if (stats.imported % 100 === 0) {
                    console.log(`\nProgress: ${stats.imported}/${stats.total} records processed...`)
                }
            } catch (err) {
                console.error(`\nError importing report for ${email}:`, err)
                stats.errors++
            }
        }
    }

    console.log('Import finished.')
    console.log(stats)
}

main().catch(console.error).finally(() => prisma.$disconnect())
