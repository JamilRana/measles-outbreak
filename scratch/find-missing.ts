import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const specialFacilities = [
  "Ad-din Medical College Hospital, Moghbazar",
  "Aichi Hospital Ltd.",
  "AMZ Hospital Ltd.",
  "Anwer Khan Modern Medical College Hospital",
  "Asgar Ali Hospital",
  "Bangladesh medical University",
  "Bangladesh Shishu Hospital & Institute",
  "Bangladesh Specialized Hospital PLC",
  "BIHS General Hospital",
  "Birdem 2",
  "BRB Hospital Ltd",
  "Continental Hospital",
  "Crescent Gastroliver & General Hospital Ltd.",
  "Dhaka Central International Medical College & Hospital",
  "Dhaka Community Hospital",
  "Dhaka Community Medical College Hospital",
  "Dhaka medical College hospital",
  "DNCC Dedicated Covid-19 Hospital, Mohakhali",
  "Dr. M R Khan shishu Hospital & Institute of Child Health",
  "Dr. Sirajul Islam Medical College & Hospital Ltd.",
  "Enam Medical College & Hospital",
  "Evercare Hospital Dhaka",
  "EXIM Bank Hospital",
  "Hi-Care General Hospital Ltd.",
  "Holy Family Red Crescent Medical College Hopital",
  "Ibn Sina Hospital",
  "Infectious Diseases Hospital, Mohakhali",
  "Insaf Barakah Kidney & General Hospital",
  "Japan Bangladesh Friendship Hospital Ltd.",
  "Khidmah Hospital (Pvt.) Ltd.",
  "Kurmitola General Hospital",
  "Kuwait Bangladesh Friendship Govt. Hospital",
  "Labaid Hospital",
  "Millennium Specialized Hospital Ltd.",
  "Mugda Medical College Hospital, Dhaka",
  "National Institute of Traumatology and Orthopaedic Rehabilitation (NITOR)",
  "Popular Medical College And Hospital Ltd.",
  "Shaheed Monsur Ali Medical College Hospital",
  "Shaheed Suhrawardy Medical College Hospital",
  "Sir Salimullah Medical College mitford Hospital Dhaka",
  "Square Hospital LTD",
  "United Medical College Hospital",
  "Universal medical college hospital",
  "Uttara Crescent Hospital",
  "Z H Sikder Women's Medical College & Hospital (pvt) Ltd., Gulshan.",
  "Rajshahi Medical College Hospital",
  "Kasir Uddin Hospital & Diagnostic Center",
  "Ata Khan Medical College & Hospital",
  "Shanto-Mariam General Hospital",
  "Green Life Medical College Hospital",
  "Impulse Hospital",
  "Samorita Hospital",
  "Delta Hospital Ltd.",
  "Islami Bank Hospital Mugda",
  "Pan Pacific Hospital",
  "General Medical College & Hospital",
  "South Ridge Hospital"
]

async function main() {
  const existing = await prisma.facility.findMany({
    select: { facilityName: true }
  })
  
  const existingNames = new Set(existing.map(f => f.facilityName.toLowerCase()))
  
  const missing = specialFacilities.filter(name => !existingNames.has(name.toLowerCase()))
  
  console.log(`Missing Facilities: ${missing.length}`)
  missing.forEach(m => console.log(`- ${m}`))
}

main().finally(() => prisma.$disconnect())
