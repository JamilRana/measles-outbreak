import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const reportDate = new Date('2026-04-22')
const outbreakId = 'measles-2026'

const rawReports = [
  { division: "Barisal", district: "Bhola", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Barisal", district: "Jhalokati", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Barisal", district: "Pirojpur", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Barisal", district: "Barguna", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Barisal", district: "Barisal", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Barisal", district: "Patuakhali", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Chattogram", district: "Cox's Bazar", facility: "Civil Surgeon Office", values: [57, 1] },
  { division: "Chattogram", district: "Feni", facility: "Civil Surgeon Office", values: [1, 0] },
  { division: "Chattogram", district: "Noakhali", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Chattogram", district: "Brahmanbaria", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Chattogram", district: "Chandpur", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Chattogram", district: "Chattogram", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Civil Surgeon Office", values: [85, 3] },
  { division: "Dhaka", district: "Faridpur", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Dhaka", district: "Gopalganj", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Dhaka", district: "Madaripur", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Dhaka", district: "Gazipur", facility: "Civil Surgeon Office", values: [1, 0] },
  { division: "Dhaka", district: "Kishoreganj", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Dhaka", district: "Manikganj", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Dhaka", district: "Munshiganj", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Dhaka", district: "Narayanganj", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Dhaka", district: "Narsingdi", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Dhaka", district: "Rajbari", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Dhaka", district: "Shariatpur", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Dhaka", district: "Tangail", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Khulna", district: "Bagerhat", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Khulna", district: "Jashore", facility: "Civil Surgeon Office", values: [1, 0] },
  { division: "Khulna", district: "Chuadanga", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Khulna", district: "Jhenaidah", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Khulna", district: "Khulna", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Khulna", district: "Kushtia", facility: "Civil Surgeon Office", values: [1, 0] },
  { division: "Khulna", district: "Magura", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Khulna", district: "Meherpur", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Khulna", district: "Narail", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Khulna", district: "Satkhira", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Mymensingh", district: "Jamalpur", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Mymensingh", district: "Mymensingh", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Mymensingh", district: "Netrakona", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Mymensingh", district: "Sherpur", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Chattogram", district: "Khagrachhari", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Chattogram", district: "Rangamati", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Chattogram", district: "Bandarban", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Rajshahi", district: "Bogura", facility: "Civil Surgeon Office", values: [19, 0] },
  { division: "Rajshahi", district: "Chapainawabganj", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Rajshahi", district: "Joypurhat", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Rajshahi", district: "Naogaon", facility: "Civil Surgeon Office", values: [2, 0] },
  { division: "Rajshahi", district: "Natore", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Rajshahi", district: "Pabna", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Rajshahi", district: "Rajshahi", facility: "Civil Surgeon Office", values: [4, 0] },
  { division: "Rajshahi", district: "Sirajganj", facility: "Civil Surgeon Office", values: [1, 0] },
  { division: "Rangpur", district: "Dinajpur", facility: "Civil Surgeon Office", values: [11, 0] },
  { division: "Rangpur", district: "Gaibandha", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Rangpur", district: "Kurigram", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Rangpur", district: "Lalmonirhat", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Rangpur", district: "Nilphamari", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Rangpur", district: "Panchagarh", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Rangpur", district: "Rangpur", facility: "Civil Surgeon Office", values: [1, 0] },
  { division: "Rangpur", district: "Thakurgaon", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Sylhet", district: "Habiganj", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Sylhet", district: "Moulvibazar", facility: "Civil Surgeon Office", values: [1, 0] },
  { division: "Sylhet", district: "Sunamganj", facility: "Civil Surgeon Office", values: [0, 0] },
  { division: "Sylhet", district: "Sylhet", facility: "Civil Surgeon Office", values: [1, 0] },
]

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) throw new Error("Admin user not found")

  const outbreak = await prisma.outbreak.findFirst({ where: { id: outbreakId } })
  if (!outbreak) throw new Error("Outbreak not found")

  const formFields = await prisma.formField.findMany({ where: { outbreakId: outbreak.id } })
  
  // Map field keys to numeric indexes
  // Image columns: [No. of Case, No of Death]
  const fieldMap: Record<number, string> = {}
  formFields.forEach(f => {
    const key = f.fieldKey.toLowerCase()
    if (key.includes('suspected_case')) fieldMap[0] = f.id
    if (key.includes('suspected_death')) fieldMap[1] = f.id
  })

  for (const r of rawReports) {
    let facility = await prisma.facility.findFirst({
      where: {
        AND: [
            { district: r.district },
            { facilityName: { contains: "Civil Surgeon", mode: 'insensitive' } }
        ]
      }
    })

    if (!facility) {
      console.log(`Creating missing facility: ${r.facility} in ${r.district}`)
      const type = await prisma.facilityType.findFirst({ where: { slug: 'district-office' } })
      facility = await prisma.facility.create({
        data: {
          facilityName: `${r.district} Civil Surgeon Office`,
          facilityCode: `CSO_${r.district.toUpperCase()}`,
          division: r.division,
          district: r.district,
          upazila: r.district,
          facilityTypeId: type?.id,
        }
      })
    }

    // Create DailyReport
    const dailyReport = await prisma.dailyReport.upsert({
      where: {
        facilityId_outbreakId_reportingDate: {
          facilityId: facility.id,
          outbreakId: outbreak.id,
          reportingDate: reportDate
        }
      },
      update: {
        suspected24h: r.values[0],
        suspectedDeath24h: r.values[1],
        published: true,
        userId: admin.id
      },
      create: {
        facilityId: facility.id,
        outbreakId: outbreak.id,
        reportingDate: reportDate,
        suspected24h: r.values[0],
        suspectedDeath24h: r.values[1],
        published: true,
        userId: admin.id
      }
    })

    // Create Field Values
    for (const [idx, fieldId] of Object.entries(fieldMap)) {
      const val = r.values[parseInt(idx)]
      await prisma.reportFieldValue.upsert({
        where: {
          reportId_formFieldId: {
            reportId: dailyReport.id,
            formFieldId: fieldId
          }
        },
        update: { value: String(val) },
        create: {
          reportId: dailyReport.id,
          formFieldId: fieldId,
          value: String(val)
        }
      })
    }
  }

  console.log("Import finished.")
}

main().finally(() => prisma.$disconnect())
