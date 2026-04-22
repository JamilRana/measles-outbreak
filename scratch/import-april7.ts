import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const reportDate = new Date('2026-04-07')
const outbreakId = 'measles-2026'

const rawReports = [
  { division: "Barisal", district: "Barguna", facility: "Civil Surgeon Office", values: [184, 166, 129, 0, 35, 3] },
  { division: "Barisal", district: "Barisal", facility: "Civil Surgeon office", values: [91, 26, 9, 0, 4, 0] },
  { division: "Barisal", district: "Bhola", facility: "Civil Surgeon Office", values: [67, 43, 30, 0, 8, 2] },
  { division: "Barisal", district: "Jhalokati", facility: "Civil Surgeon Office", values: [37, 13, 5, 2, 8, 0] },
  { division: "Barisal", district: "Patuakhali", facility: "Civil Surgeon Office", values: [183, 168, 101, 0, 9, 0] },
  { division: "Barisal", district: "Pirojpur", facility: "Civil Surgeon Office", values: [66, 22, 14, 0, 4, 0] },
  { division: "Chattogram", district: "Bandarban", facility: "Civil Surgeon Office", values: [13, 13, 10, 0, 1, 0] },
  { division: "Chattogram", district: "Brahmanbaria", facility: "Civil Surgeon Office", values: [66, 66, 34, 0, 11, 0] },
  { division: "Chattogram", district: "Chandpur", facility: "Civil Surgeon Office", values: [195, 71, 51, 0, 33, 3] },
  { division: "Chattogram", district: "Chattogram", facility: "Civil Surgeon Office", values: [251, 180, 98, 1, 18, 0] },
  { division: "Chattogram", district: "Cox's Bazar", facility: "Civil Surgeon Office", values: [220, 210, 159, 5, 34, 0] },
  { division: "Chattogram", district: "Cumilla", facility: "Civil Surgeon Office", values: [356, 143, 84, 3, 27, 0] },
  { division: "Chattogram", district: "Feni", facility: "Civil Surgeon Office", values: [78, 33, 20, 0, 2, 0] },
  { division: "Chattogram", district: "Khagrachhari", facility: "Civil Surgeon Office", values: [12, 12, 11, 0, 0, 0] },
  { division: "Chattogram", district: "Lakshmipur", facility: "Civil Surgeon Office", values: [76, 71, 46, 1, 4, 0] },
  { division: "Chattogram", district: "Noakhali", facility: "Civil Surgeon Office", values: [132, 132, 83, 0, 6, 0] },
  { division: "Chattogram", district: "Rangamati", facility: "Civil Surgeon Office", values: [16, 5, 5, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Ad-din Medical College Hospital, Moghbazar", values: [0, 23, 18, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Aichi Hospital Ltd.", values: [1, 5, 2, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "AMZ Hospital Ltd.", values: [2, 1, 0, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Anwer Khan Modern Medical College Hospital", values: [0, 0, 1, 0, 6, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Asgar Ali Hospital", values: [1, 24, 19, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Bangladesh medical University", values: [0, 32, 29, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Bangladesh Shishu Hospital & Institute", values: [209, 209, 148, 4, 35, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Bangladesh Specialized Hospital PLC", values: [1, 22, 15, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "BIHS General Hospital", values: [1, 9, 4, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Birdem 2", values: [1, 46, 41, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "BRB Hospital Ltd", values: [0, 4, 4, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Civil Surgeon Office", values: [228, 215, 159, 7, 39, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Continental Hospital", values: [0, 0, 4, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Crescent Gastroliver & General Hospital Ltd.", values: [0, 1, 0, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Dhaka Central International Medical College & Hospital", values: [0, 4, 4, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Dhaka Community Hospital", values: [24, 4, 3, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Dhaka Community Medical College Hospital", values: [3, 2, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Dhaka medical College hospital", values: [14, 121, 82, 2, 22, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "DNCC Dedicated Covid-19 Hospital, Mohakhali", values: [8, 6, 0, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Dr. M R Khan shishu Hospital & Institute of Child Health", values: [34, 33, 24, 0, 8, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Dr. Sirajul Islam Medical College & Hospital Ltd.", values: [3, 11, 9, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Enam Medical College & Hospital", values: [1, 30, 25, 1, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Evercare Hospital Dhaka", values: [1, 1, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "EXIM Bank Hospital", values: [0, 0, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Hi-Care General Hospital Ltd.", values: [0, 1, 0, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Holy Family Red Crescent Medical College Hopital", values: [6, 36, 28, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Ibn Sina Hospital", values: [2, 29, 19, 1, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Infectious Diseases Hospital, Mohakhali", values: [0, 5, 5, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Insaf Barakah Kidney & General Hospital", values: [0, 1, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Japan Bangladesh Friendship Hospital Ltd.", values: [1, 8, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Khidmah Hospital (Pvt.) Ltd.", values: [1, 2, 2, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Kurmitola General Hospital", values: [2, 16, 13, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Kuwait Bangladesh Friendship Govt. Hospital", values: [1, 25, 19, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Labaid Hospital", values: [1, 30, 26, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Millennium Specialized Hospital Ltd.", values: [0, 1, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Mugda Medical College Hospital, Dhaka", values: [62, 60, 46, 1, 11, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "National Institute of Traumatology and Orthopaedic Rehabilitation (NITOR)", values: [0, 0, 0, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Popular Medical College And Hospital Ltd.", values: [1, 0, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Shaheed Monsur Ali Medical College Hospital", values: [0, 12, 8, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Shaheed Suhrawardy Medical College Hospital", values: [44, 43, 31, 0, 12, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Sir Salimullah Medical College mitford Hospital Dhaka", values: [1, 11, 11, 0, 1, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Square Hospital LTD", values: [1, 24, 16, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "United Medical College Hospital", values: [0, 0, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Universal medical college hospital", values: [0, 13, 11, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Uttara Crescent Hospital", values: [0, 0, 2, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Z H Sikder Women's Medical College & Hospital (pvt) Ltd., Gulshan.", values: [0, 3, 2, 0, 0, 0] },
  { division: "Dhaka", district: "Faridpur", facility: "Civil Surgeon Office", values: [114, 114, 76, 0, 11, 0] },
  { division: "Dhaka", district: "Gazipur", facility: "Civil Surgeon Office", values: [183, 183, 101, 0, 0, 0] },
  { division: "Dhaka", district: "Gopalganj", facility: "Civil Surgeon Office", values: [48, 47, 30, 0, 3, 0] },
  { division: "Dhaka", district: "Kishoreganj", facility: "Civil Surgeon Office", values: [163, 84, 48, 0, 22, 0] },
  { division: "Dhaka", district: "Madaripur", facility: "Civil Surgeon Office", values: [62, 42, 21, 0, 4, 0] },
  { division: "Dhaka", district: "Manikganj", facility: "Civil Surgeon Office", values: [34, 34, 19, 0, 5, 1] },
  { division: "Dhaka", district: "Munshiganj", facility: "Civil Surgeon Office", values: [55, 53, 27, 0, 1, 0] },
  { division: "Dhaka", district: "Narayanganj", facility: "Civil Surgeon Office", values: [118, 117, 76, 0, 13, 0] },
  { division: "Dhaka", district: "Narsingdi", facility: "Civil Surgeon Office", values: [135, 126, 86, 0, 9, 0] },
  { division: "Dhaka", district: "Rajbari", facility: "Civil Surgeon Office", values: [85, 42, 29, 0, 10, 1] },
  { division: "Dhaka", district: "Shariatpur", facility: "Civil Surgeon Office", values: [64, 44, 32, 0, 1, 0] },
  { division: "Dhaka", district: "Tangail", facility: "Civil Surgeon Office", values: [165, 154, 102, 0, 0, 0] },
  { division: "Khulna", district: "Bagerhat", facility: "Civil Surgeon Office", values: [103, 103, 62, 0, 2, 0] },
  { division: "Khulna", district: "Chuadanga", facility: "Civil Surgeon Office", values: [39, 25, 19, 0, 6, 0] },
  { division: "Khulna", district: "Jashore", facility: "Civil Surgeon Office", values: [153, 106, 80, 1, 24, 1] },
  { division: "Khulna", district: "Jhenaidah", facility: "Civil Surgeon Office", values: [42, 19, 12, 0, 11, 0] },
  { division: "Khulna", district: "Khulna", facility: "Civil Surgeon Office", values: [143, 140, 92, 3, 30, 0] },
  { division: "Khulna", district: "Kushtia", facility: "Civil Surgeon Office", values: [121, 108, 86, 0, 13, 0] },
  { division: "Khulna", district: "Magura", facility: "Civil Surgeon Office", values: [22, 19, 10, 0, 0, 0] },
  { division: "Khulna", district: "Meherpur", facility: "Civil Surgeon Office", values: [27, 22, 14, 0, 2, 0] },
  { division: "Khulna", district: "Narail", facility: "Civil Surgeon Office", values: [42, 30, 21, 0, 6, 0] },
  { division: "Khulna", district: "Satkhira", facility: "Civil Surgeon Office", values: [118, 104, 76, 0, 16, 0] },
  { division: "Mymensingh", district: "Jamalpur", facility: "Civil Surgeon Office", values: [114, 106, 72, 0, 11, 0] },
  { division: "Mymensingh", district: "Mymensingh", facility: "Civil Surgeon Office", values: [380, 219, 132, 1, 30, 0] },
  { division: "Mymensingh", district: "Netrakona", facility: "Civil Surgeon Office", values: [64, 44, 26, 0, 3, 0] },
  { division: "Mymensingh", district: "Sherpur", facility: "Civil Surgeon Office", values: [46, 30, 19, 0, 5, 0] },
  { division: "Rajshahi", district: "Bogura", facility: "Civil Surgeon Office", values: [193, 141, 102, 0, 33, 0] },
  { division: "Rajshahi", district: "Chapainawabganj", facility: "Civil Surgeon Office", values: [63, 43, 30, 0, 8, 0] },
  { division: "Rajshahi", district: "Joypurhat", facility: "Civil Surgeon Office", values: [28, 25, 14, 0, 1, 0] },
  { division: "Rajshahi", district: "Naogaon", facility: "Civil Surgeon Office", values: [184, 131, 90, 1, 24, 0] },
  { division: "Rajshahi", district: "Natore", facility: "Civil Surgeon Office", values: [44, 23, 14, 0, 6, 0] },
  { division: "Rajshahi", district: "Pabna", facility: "Civil Surgeon Office", values: [164, 131, 102, 0, 13, 0] },
  { division: "Rajshahi", district: "Rajshahi", facility: "Civil Surgeon Office", values: [154, 116, 86, 2, 14, 0] },
  { division: "Rajshahi", district: "Rajshahi", facility: "Rajshahi Medical College Hospital", values: [429, 429, 263, 43, 37, 0] },
  { division: "Rajshahi", district: "Sirajganj", facility: "Civil Surgeon Office", values: [194, 181, 129, 1, 18, 0] },
  { division: "Rangpur", district: "Dinajpur", facility: "Civil Surgeon Office", values: [114, 106, 71, 0, 23, 1] },
  { division: "Rangpur", district: "Gaibandha", facility: "Civil Surgeon Office", values: [143, 143, 101, 0, 3, 0] },
  { division: "Rangpur", district: "Kurigram", facility: "Civil Surgeon Office", values: [66, 43, 30, 0, 10, 1] },
  { division: "Rangpur", district: "Lalmonirhat", facility: "Civil Surgeon Office", values: [42, 30, 21, 0, 2, 0] },
  { division: "Rangpur", district: "Nilphamari", facility: "Civil Surgeon Office", values: [65, 42, 29, 0, 4, 0] },
  { division: "Rangpur", district: "Panchagarh", facility: "Civil Surgeon Office", values: [22, 18, 11, 0, 1, 0] },
  { division: "Rangpur", district: "Rangpur", facility: "Civil Surgeon Office", values: [194, 181, 102, 1, 20, 1] },
  { division: "Rangpur", district: "Rangpur", facility: "Kasir Uddin Hospital & Diagnostic Center", values: [1, 1, 0, 0, 0, 0] },
  { division: "Rangpur", district: "Thakurgaon", facility: "Civil Surgeon Office", values: [44, 14, 8, 0, 4, 0] },
  { division: "Sylhet", district: "Habiganj", facility: "Civil Surgeon Office", values: [66, 44, 28, 0, 4, 0] },
  { division: "Sylhet", district: "Moulvibazar", facility: "Civil Surgeon Office", values: [63, 43, 30, 0, 1, 0] },
  { division: "Sylhet", district: "Sunamganj", facility: "Civil Surgeon Office", values: [43, 43, 27, 0, 0, 0] },
  { division: "Sylhet", district: "Sylhet", facility: "Civil Surgeon Office", values: [138, 114, 76, 0, 14, 1] },
  { division: "Dhaka", district: "Dhaka", facility: "Ata Khan Medical College & Hospital", values: [0, 1, 0, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Shanto-Mariam General Hospital", values: [0, 1, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Green Life Medical College Hospital", values: [0, 1, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Impulse Hospital", values: [0, 1, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Samorita Hospital", values: [0, 1, 0, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Delta Hospital Ltd.", values: [1, 1, 0, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Islami Bank Hospital Mugda", values: [0, 1, 0, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "Pan Pacific Hospital", values: [0, 1, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "General Medical College & Hospital", values: [1, 1, 1, 0, 0, 0] },
  { division: "Dhaka", district: "Dhaka", facility: "South Ridge Hospital", values: [1, 1, 1, 0, 0, 0] }
]

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) throw new Error("Admin user not found")

  const outbreak = await prisma.outbreak.findFirst({ where: { id: outbreakId } })
  if (!outbreak) throw new Error("Outbreak not found")

  const formFields = await prisma.formField.findMany({ where: { outbreakId: outbreak.id } })
  
  // Map field keys to numeric indexes
  const fieldMap: Record<number, string> = {}
  formFields.forEach(f => {
    const key = f.fieldKey.toLowerCase()
    if (key.includes('suspected_case')) fieldMap[0] = f.id
    if (key.includes('admitted_case')) fieldMap[1] = f.id
    if (key.includes('discharged_case')) fieldMap[2] = f.id
    if (key.includes('suspected_death')) fieldMap[3] = f.id
    if (key.includes('confirmed_case')) fieldMap[4] = f.id
    if (key.includes('confirmed_death')) fieldMap[5] = f.id
  })

  for (const r of rawReports) {
    let facility = await prisma.facility.findFirst({
      where: {
        AND: [
            { district: r.district },
            { facilityName: { contains: r.facility.includes("Civil Surgeon") ? "Civil Surgeon" : r.facility, mode: 'insensitive' } }
        ]
      }
    })

    if (!facility) {
      console.log(`Creating facility: ${r.facility} in ${r.district}`)
      let typeSlug = "general-hospital"
      if (r.facility.includes("Civil Surgeon")) typeSlug = "district-office"
      else if (r.facility.includes("Medical College")) typeSlug = "medical-college-hospital"
      
      const type = await prisma.facilityType.findFirst({ where: { slug: typeSlug } })
      
      facility = await prisma.facility.create({
        data: {
          facilityName: r.facility,
          facilityCode: r.facility.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + "_" + r.district.replace(/\s+/g, '_'),
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
        admitted24h: r.values[1],
        discharged24h: r.values[2],
        suspectedDeath24h: r.values[3],
        confirmed24h: r.values[4],
        confirmedDeath24h: r.values[5],
        published: true,
        userId: admin.id
      },
      create: {
        facilityId: facility.id,
        outbreakId: outbreak.id,
        reportingDate: reportDate,
        suspected24h: r.values[0],
        admitted24h: r.values[1],
        discharged24h: r.values[2],
        suspectedDeath24h: r.values[3],
        confirmed24h: r.values[4],
        confirmedDeath24h: r.values[5],
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
