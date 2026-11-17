import { PrismaClient, Role, OutbreakStatus, FieldType, ReportStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Starting comprehensive seed with cleanup...')

  // ========================================
  // STEP 1: CLEAR EXISTING DATA (in reverse dependency order)
  // ========================================
  console.log('🗑️  Clearing existing data...')

  // Delete dependent records first in correct order
  await prisma.reportFieldValue.deleteMany()
  console.log('   ✓ Deleted report field values')

  await prisma.report.deleteMany()
  console.log('   ✓ Deleted reports')

  await prisma.formField.deleteMany()
  console.log('   ✓ Deleted form fields')

  await prisma.submissionWindow.deleteMany()
  console.log('   ✓ Deleted submission windows')

  await prisma.backlogSlot.deleteMany()
  console.log('   ✓ Deleted backlog slots')

  await prisma.outbreak.deleteMany()
  console.log('   ✓ Deleted outbreaks')

  await prisma.disease.deleteMany()
  console.log('   ✓ Deleted diseases')

  // Delete audit logs before users
  await prisma.auditLog.deleteMany()
  console.log('   ✓ Deleted audit logs')

  // Delete users before facilities (users reference facilities)
  await prisma.user.deleteMany()
  console.log('   ✓ Deleted users')

  // Delete facilities before facility types
  await prisma.facility.deleteMany()
  console.log('   ✓ Deleted facilities')

  await prisma.facilityType.deleteMany()
  console.log('   ✓ Deleted facility types')

  await prisma.settings.deleteMany()
  console.log('   ✓ Deleted settings')

  console.log('✅ Cleanup complete. Starting fresh seed...\n')

  // ========================================
  // STEP 2: SEED FACILITY TYPES
  // ========================================
  console.log('🏥 Seeding facility types...')
  
  const facilityTypes = [
    { name: "Infectious Disease Hospital",              slug: "idh",           tier: "specialized" },
    { name: "Leprosy Hospital",                         slug: "leprosy",       tier: "specialized" },
    { name: "Postgraduate Institute & Hospital",         slug: "pgi",           tier: "specialized" },
    { name: "Specialized Hospital",                     slug: "specialized",   tier: "specialized" },
    { name: "Medical College Hospital",                 slug: "mch",           tier: "specialized" },
    { name: "Dental College Hospital",                  slug: "dental-college", tier: "specialized" },
    { name: "Hospital of Alternative Medicine",         slug: "alt-medicine",  tier: "specialized" },
    { name: "District Level Hospital (General / District)", slug: "district-hospital", tier: "district" },
    { name: "Upazila Health Complex",                   slug: "uhc",           tier: "upazila" },
    { name: "Sadar Upazilla Health Office",             slug: "suho",          tier: "upazila" },
    { name: "Chest Disease Clinic",                     slug: "chest-clinic",  tier: "specialized" },
    { name: "Trauma Center",                            slug: "trauma",        tier: "specialized" },
    { name: "50 bed Hospital",                          slug: "50-bed",        tier: "district" },
    { name: "31 bed Hospital",                          slug: "31-bed",        tier: "district" },
    { name: "30 bed Hospital",                          slug: "30-bed",        tier: "district" },
    { name: "25 bed Hospital",                          slug: "25-bed",        tier: "district" },
    { name: "20 bed Hospital",                          slug: "20-bed",        tier: "upazila" },
    { name: "10 bed Hospital",                          slug: "10-bed",        tier: "upazila" },
    { name: "Medical College",                          slug: "medical-college", tier: "specialized" },
    { name: "Other District/General Hospital",          slug: "other-district", tier: "district" },
    { name: "Chest Hospital",                           slug: "chest-hospital", tier: "specialized" },
    { name: "District Level Office",                    slug: "district-office", tier: "office" },
    { name: "Divisional Level Office",                  slug: "divisional-office", tier: "office" },
    { name: "Directorate",                              slug: "directorate",   tier: "office" },
    { name: "Private Hospital/Clinic",                  slug: "private",       tier: "private" },
  ]

  for (const type of facilityTypes) {
    await prisma.facilityType.create({
      data: {
        name: type.name,
        slug: type.slug,
        tier: type.tier,
      }
    })
  }

  const types = await prisma.facilityType.findMany()
  const typeMap = Object.fromEntries(types.map(t => [t.slug, t.id]))
  console.log(`   ✓ Created ${types.length} facility types`)

  // ========================================
  // STEP 3: SEED FACILITIES & USERS
  // ========================================
  console.log('🏢 Seeding facilities and users...')

const newFacilities = [
  // Dhaka Private Hospitals
  { facilityCode: '3', facilityName: 'Bangladesh Shishu (Children) Hospital & Institute', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'epiddsh@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '1', facilityName: 'Bangladesh Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'bmchdhaka@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '2', facilityName: 'Holy Family Red Crescent M.C Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'hfrcmchdhaka@yahoo.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '3-birdem', facilityName: 'BIRDEM General Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'birdemmateon2021@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '4', facilityName: 'BIRDEM Women & Children Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'birdem-2@dab-bd.org', role: 'USER', password: 'birdem-2@dab-bd.org' },
  { facilityCode: '5-ibnsina-mirpur', facilityName: 'Ibn Sina Medical College Hospital, Kallyanpur, Mirpur, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'ismchoffice@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '6-ibnsina-dhanmondi', facilityName: 'Ibn Sina Hospital, Dhanmondi, Dhaka-1209', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'ibnsinahospitaldhanmondidengue@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '7', facilityName: 'Square Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'muktadir@squarehospital.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '8-comfort', facilityName: 'Comfort Nursing Home (pvt) Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'rahatraihan840@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '9-samorita', facilityName: 'Samorita Hospital Limited', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'samoritahrd.it@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '10', facilityName: 'Delta Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'amiruldelta@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '11', facilityName: 'Labaid Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'shankarpanday144@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '12', facilityName: 'Central Hospital Limited', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'nursingserviceschl@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '13', facilityName: 'Hi-Care General Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'hicare13@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '14', facilityName: 'Health And Hope Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'healthandhope50@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '15', facilityName: 'Green Life Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'greenlifehospital@yahoo.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '16-islami-kakrail', facilityName: 'Islami Bank Central Hospital, Kakrail, Dhaka.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'ibhdit@yahoo.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '17-islami-mugda', facilityName: 'Islami Bank Hospital Mugda, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'ibhmugda@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '18-united', facilityName: 'United Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'medical.records@uhlbd.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '19-khidmah', facilityName: 'Khidmah Hospital (Pvt.) Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'info@khidmahhospital.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '20', facilityName: 'Shaheed Monsur Ali Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'smamch.1995@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '21', facilityName: 'Dr.Sirajul Islam Medical College & Hospital Ltd.,', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'simch.bd@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '22', facilityName: 'Evercare Hospital Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'mrdept@evercarebd.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '24', facilityName: 'Universal Medical College & Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'umcrc2022@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '25', facilityName: 'BRB Hospital Ltd', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'rasel.hr@brbhospital.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '26', facilityName: 'Asgar Ali Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'zahidulhaq@asgaralihospital.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '27', facilityName: 'Bangladesh Specialized Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'bshl.dhaka@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '28', facilityName: 'Uttara Adhunik Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'dduamch@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '29', facilityName: 'Salauddin Specialized Hospital Ltd', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'salauddinsphospital@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '30', facilityName: 'Popular Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'pmchcoordinator@yahoo.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '31', facilityName: 'Uttara Crescent Hopital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'shuvo.uch@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '32', facilityName: 'Anwer Khan Modern Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'akmmchcovid19@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '33', facilityName: 'Medical College for Women & Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'nurarubel@outlook.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '35', facilityName: 'Dhaka Central International Medical College & Hospital (DCIMCH)', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'admin@dcimch.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '36', facilityName: 'Aichi Hospital LTD', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'sabik.aichi@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '37', facilityName: 'Monowara Hospital Pvt Ltd', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'monowarahospital@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '38', facilityName: 'Zainul Haque Sikder Women\'s Medical College & Hospital (Pvt.) Ltd. , Gulshan Branch', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'info@sikderhospital.net', role: 'USER', password: 'info@sikderhospital.net' },
  { facilityCode: '39', facilityName: 'Enam Medical College & Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'info@emch.com.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '40', facilityName: 'AMZ Hospital Ltd', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'amzhospitalltd.mis10699@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '41', facilityName: 'Life & Care Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'lifeandcarehospital@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '42', facilityName: 'Farabi General Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'jashimuddin4361@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '43', facilityName: 'Japan Bangladesh Friendship Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'jbfh24@yahoo.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '44', facilityName: 'EXIM Bank Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'barikkhan1962@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '45', facilityName: 'Al Manar Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'almanarhospital1996@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '46', facilityName: 'Dhaka Health Care', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'dhhhospital@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '47', facilityName: 'Metorpolitan Medical Centre Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'mmcl_nc@yahoo.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '48', facilityName: 'Sajida Hospital, Keranigonj, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'liaquate@sajida.org', role: 'USER', password: 'liaquate@sajida.org' },
  { facilityCode: '49', facilityName: 'Ad-din Women\'s Medical College Hospital, Moghbazar, Dhaka-1217', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'mdshihab886@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '50', facilityName: 'BIHS General Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'mhasemanto@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '51', facilityName: 'Dhaka Community Medical college Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'ashrafulislamirfan@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '52', facilityName: 'Northern International Medical College, Dhanmondi, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'drjihadortho@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '53', facilityName: 'Ad-din Barister Rafique ul-huq Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'abrhhospital8@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '54', facilityName: 'Aalok Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'aalokbd195@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '55', facilityName: 'City Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'cityhosp.bd@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '56', facilityName: 'Crescent Gastroliver & General Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'crescentgastroliver2010@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '57', facilityName: 'Islami Bank Hospital Mirpur', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'ibhmirpur@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '58', facilityName: 'MARKS Medical College and Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'marksgroupit@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '59', facilityName: 'Millennium Specialized Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'infomshl99@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '60', facilityName: 'Dhanmondi General & Kidney Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'khairuldgkh2022@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '61', facilityName: 'Padma General Hospital Ltd', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'pghl1999@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '62', facilityName: 'Bashundhara Ad-din Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'bashundharaaddin@gmail.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '63', facilityName: 'icddr,b Hospital, Mohakhali, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'mmobegum@icddrb.org', role: 'USER', password: 'mmobegum@icddrb.org' },
  { facilityCode: '64', facilityName: 'Insaf Barakh Kidney & General Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'insafbarakah@gmail.com', role: 'USER', password: 'Dghealth@542' },
  
  // Specialized Hospitals
  { facilityCode: 'BMU', facilityName: 'Bangladesh medical University', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'bmu@example.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: 'Continental Hospital', facilityName: 'Continental Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'continental@example.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '10013098', facilityName: 'Infectious Diseases Hospital, Mohakhali', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'specialized', email: 'kidh@hospi.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '10017209', facilityName: 'Kurmitola General Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'specialized', email: 'curmitolahospital@hospi.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '10023662', facilityName: 'Kuwait Bangladesh Friendship Govt. Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'specialized', email: 'kbfgh@hospi.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '10013720', facilityName: 'Mugda Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'mch', email: 'first@hospi.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '10000013', facilityName: 'National Institute of Traumatology and Orthopaedic Rehabilitation (NITOR)', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'specialized', email: 'nitor@hospi.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '10000051', facilityName: 'Shaheed Suhrawardy Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'mch', email: 'ssh@hospi.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '10000056', facilityName: 'Sir Salimullah Medical College Mitford Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'mch', email: 'mitford@hospi.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: 'UMCH-united', facilityName: 'United Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'unknown@umch.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '10021640', facilityName: 'Better Life Hospital Ltd', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'betterlife@fargroupbd.com', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '10023689', facilityName: 'Central Police Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'unkown@cph.gov.bd', role: 'USER', password: 'Dghealth@542' },
  
  // Civil Surgeon Offices - Barisal Division
  { facilityCode: '65', facilityName: 'Barisal Civil Surgeon Office', division: 'Barisal', district: 'Barisal', upazila: 'Barisal', typeSlug: 'district-office', email: 'barisal@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '66', facilityName: 'Barguna Civil Surgeon Office', division: 'Barisal', district: 'Barguna', upazila: 'Barguna', typeSlug: 'district-office', email: 'barguna@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '67', facilityName: 'Bhola Civil Surgeon Office', division: 'Barisal', district: 'Bhola', upazila: 'Bhola', typeSlug: 'district-office', email: 'bhola@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '68', facilityName: 'Jhalakathi Civil Surgeon Office', division: 'Barisal', district: 'Jhalakathi', upazila: 'Jhalakathi', typeSlug: 'district-office', email: 'jhalakathi@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '69', facilityName: 'Patuakhali Civil Surgeon Office', division: 'Barisal', district: 'Patuakhali', upazila: 'Patuakhali', typeSlug: 'district-office', email: 'patuakhali@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '70', facilityName: 'Pirojpur Civil Surgeon Office', division: 'Barisal', district: 'Pirojpur', upazila: 'Pirojpur', typeSlug: 'district-office', email: 'pirojpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  
  // Civil Surgeon Offices - Chattogram Division
  { facilityCode: '71', facilityName: 'Bandarban Civil Surgeon Office', division: 'Chattogram', district: 'Bandarban', upazila: 'Bandarban', typeSlug: 'district-office', email: 'bandarban@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '72', facilityName: 'Brahmanbaria Civil Surgeon Office', division: 'Chattogram', district: 'Brahmanbaria', upazila: 'Brahmanbaria', typeSlug: 'district-office', email: 'brahmanbaria@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '73', facilityName: 'Chandpur Civil Surgeon Office', division: 'Chattogram', district: 'Chandpur', upazila: 'Chandpur', typeSlug: 'district-office', email: 'chandpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '74', facilityName: 'Chattogram Civil Surgeon Office', division: 'Chattogram', district: 'Chattogram', upazila: 'Chattogram', typeSlug: 'district-office', email: 'chittagong@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '75', facilityName: 'Cumilla Civil Surgeon Office', division: 'Chattogram', district: 'Cumilla', upazila: 'Cumilla', typeSlug: 'district-office', email: 'cumilla@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '76', facilityName: 'Cox\'s Bazar Civil Surgeon Office', division: 'Chattogram', district: 'Cox\'s Bazar', upazila: 'Cox\'s Bazar', typeSlug: 'district-office', email: 'coxsbazar@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '77', facilityName: 'Feni Civil Surgeon Office', division: 'Chattogram', district: 'Feni', upazila: 'Feni', typeSlug: 'district-office', email: 'feni@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '78', facilityName: 'Khagrachhari Civil Surgeon Office', division: 'Chattogram', district: 'Khagrachhari', upazila: 'Khagrachhari', typeSlug: 'district-office', email: 'khagrachhari@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '79', facilityName: 'Lakshmipur Civil Surgeon Office', division: 'Chattogram', district: 'Lakshmipur', upazila: 'Lakshmipur', typeSlug: 'district-office', email: 'lakshmipur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '80', facilityName: 'Noakhali Civil Surgeon Office', division: 'Chattogram', district: 'Noakhali', upazila: 'Noakhali', typeSlug: 'district-office', email: 'noakhali@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '81', facilityName: 'Rangamati Civil Surgeon Office', division: 'Chattogram', district: 'Rangamati', upazila: 'Rangamati', typeSlug: 'district-office', email: 'rangamati@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  
  // Civil Surgeon Offices - Dhaka Division
  { facilityCode: '82', facilityName: 'Dhaka Civil Surgeon Office', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'district-office', email: 'dhaka@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '83', facilityName: 'Faridpur Civil Surgeon Office', division: 'Dhaka', district: 'Faridpur', upazila: 'Faridpur', typeSlug: 'district-office', email: 'faridpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '84', facilityName: 'Gazipur Civil Surgeon Office', division: 'Dhaka', district: 'Gazipur', upazila: 'Gazipur', typeSlug: 'district-office', email: 'gazipur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '85', facilityName: 'Gopalganj Civil Surgeon Office', division: 'Dhaka', district: 'Gopalganj', upazila: 'Gopalganj', typeSlug: 'district-office', email: 'gopalganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '86', facilityName: 'Kishoreganj Civil Surgeon Office', division: 'Dhaka', district: 'Kishoreganj', upazila: 'Kishoreganj', typeSlug: 'district-office', email: 'kishoreganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '87', facilityName: 'Madaripur Civil Surgeon Office', division: 'Dhaka', district: 'Madaripur', upazila: 'Madaripur', typeSlug: 'district-office', email: 'madaripur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '88', facilityName: 'Manikganj Civil Surgeon Office', division: 'Dhaka', district: 'Manikganj', upazila: 'Manikganj', typeSlug: 'district-office', email: 'manikganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '89', facilityName: 'Munshiganj Civil Surgeon Office', division: 'Dhaka', district: 'Munshiganj', upazila: 'Munshiganj', typeSlug: 'district-office', email: 'munshiganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '90', facilityName: 'Narayanganj Civil Surgeon Office', division: 'Dhaka', district: 'Narayanganj', upazila: 'Narayanganj', typeSlug: 'district-office', email: 'narayanganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '91', facilityName: 'Narsingdi Civil Surgeon Office', division: 'Dhaka', district: 'Narsingdi', upazila: 'Narsingdi', typeSlug: 'district-office', email: 'narsingdi@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '92', facilityName: 'Rajbari Civil Surgeon Office', division: 'Dhaka', district: 'Rajbari', upazila: 'Rajbari', typeSlug: 'district-office', email: 'rajbari@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '93', facilityName: 'Shariatpur Civil Surgeon Office', division: 'Dhaka', district: 'Shariatpur', upazila: 'Shariatpur', typeSlug: 'district-office', email: 'shariatpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '94', facilityName: 'Tangail Civil Surgeon Office', division: 'Dhaka', district: 'Tangail', upazila: 'Tangail', typeSlug: 'district-office', email: 'tangail@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  
  // Civil Surgeon Offices - Khulna Division
  { facilityCode: '95', facilityName: 'Bagerhat Civil Surgeon Office', division: 'Khulna', district: 'Bagerhat', upazila: 'Bagerhat', typeSlug: 'district-office', email: 'bagerhat@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '96', facilityName: 'Chuadanga Civil Surgeon Office', division: 'Khulna', district: 'Chuadanga', upazila: 'Chuadanga', typeSlug: 'district-office', email: 'chuadanga@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '97', facilityName: 'Jashore Civil Surgeon Office', division: 'Khulna', district: 'Jashore', upazila: 'Jashore', typeSlug: 'district-office', email: 'jashore@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '98', facilityName: 'Jhenaidah Civil Surgeon Office', division: 'Khulna', district: 'Jhenaidah', upazila: 'Jhenaidah', typeSlug: 'district-office', email: 'jhenaidah@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '99', facilityName: 'Khulna Civil Surgeon Office', division: 'Khulna', district: 'Khulna', upazila: 'Khulna', typeSlug: 'district-office', email: 'khulna@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '100', facilityName: 'Kushtia Civil Surgeon Office', division: 'Khulna', district: 'Kushtia', upazila: 'Kushtia', typeSlug: 'district-office', email: 'kushtia@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '101', facilityName: 'Magura Civil Surgeon Office', division: 'Khulna', district: 'Magura', upazila: 'Magura', typeSlug: 'district-office', email: 'magura@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '102', facilityName: 'Meherpur Civil Surgeon Office', division: 'Khulna', district: 'Meherpur', upazila: 'Meherpur', typeSlug: 'district-office', email: 'meherpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '103', facilityName: 'Narail Civil Surgeon Office', division: 'Khulna', district: 'Narail', upazila: 'Narail', typeSlug: 'district-office', email: 'narail@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '104', facilityName: 'Satkhira Civil Surgeon Office', division: 'Khulna', district: 'Satkhira', upazila: 'Satkhira', typeSlug: 'district-office', email: 'satkhira@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  
  // Civil Surgeon Offices - Mymensingh Division
  { facilityCode: '105', facilityName: 'Jamalpur Civil Surgeon Office', division: 'Mymensingh', district: 'Jamalpur', upazila: 'Jamalpur', typeSlug: 'district-office', email: 'jamalpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '106', facilityName: 'Mymensingh Civil Surgeon Office', division: 'Mymensingh', district: 'Mymensingh', upazila: 'Mymensingh', typeSlug: 'district-office', email: 'mymensingh@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '107', facilityName: 'Netrokona Civil Surgeon Office', division: 'Mymensingh', district: 'Netrokona', upazila: 'Netrokona', typeSlug: 'district-office', email: 'netrokona@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '108', facilityName: 'Sherpur Civil Surgeon Office', division: 'Mymensingh', district: 'Sherpur', upazila: 'Sherpur', typeSlug: 'district-office', email: 'sherpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  
  // Civil Surgeon Offices - Rajshahi Division
  { facilityCode: '109', facilityName: 'Bogura Civil Surgeon Office', division: 'Rajshahi', district: 'Bogura', upazila: 'Bogura', typeSlug: 'district-office', email: 'bogura@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '110', facilityName: 'Joypurhat Civil Surgeon Office', division: 'Rajshahi', district: 'Joypurhat', upazila: 'Joypurhat', typeSlug: 'district-office', email: 'joypurhat@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '111', facilityName: 'Naogaon Civil Surgeon Office', division: 'Rajshahi', district: 'Naogaon', upazila: 'Naogaon', typeSlug: 'district-office', email: 'naogaon@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '112', facilityName: 'Natore Civil Surgeon Office', division: 'Rajshahi', district: 'Natore', upazila: 'Natore', typeSlug: 'district-office', email: 'natore@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '113', facilityName: 'Chapainawabganj Civil Surgeon Office', division: 'Rajshahi', district: 'Chapainawabganj', upazila: 'Chapainawabganj', typeSlug: 'district-office', email: 'chapainawabganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '114', facilityName: 'Pabna Civil Surgeon Office', division: 'Rajshahi', district: 'Pabna', upazila: 'Pabna', typeSlug: 'district-office', email: 'pabna@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '115', facilityName: 'Rajshahi Civil Surgeon Office', division: 'Rajshahi', district: 'Rajshahi', upazila: 'Rajshahi', typeSlug: 'district-office', email: 'rajshahi@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '116', facilityName: 'Sirajganj Civil Surgeon Office', division: 'Rajshahi', district: 'Sirajganj', upazila: 'Sirajganj', typeSlug: 'district-office', email: 'sirajganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: 'cmo6nveia0001w0s0t5u3bszs', facilityName: 'Rajshahi Medical College Hospital', division: 'Rajshahi', district: 'Rajshahi', upazila: 'Rajshahi', typeSlug: 'mch', email: 'rajshahimch@hospi.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  
  // Civil Surgeon Offices - Rangpur Division
  { facilityCode: '117', facilityName: 'Dinajpur Civil Surgeon Office', division: 'Rangpur', district: 'Dinajpur', upazila: 'Dinajpur', typeSlug: 'district-office', email: 'dinajpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '118', facilityName: 'Gaibandha Civil Surgeon Office', division: 'Rangpur', district: 'Gaibandha', upazila: 'Gaibandha', typeSlug: 'district-office', email: 'gaibandha@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '119', facilityName: 'Kurigram Civil Surgeon Office', division: 'Rangpur', district: 'Kurigram', upazila: 'Kurigram', typeSlug: 'district-office', email: 'kurigram@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '120', facilityName: 'Lalmonirhat Civil Surgeon Office', division: 'Rangpur', district: 'Lalmonirhat', upazila: 'Lalmonirhat', typeSlug: 'district-office', email: 'lalmonirhat@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '121', facilityName: 'Nilphamari Civil Surgeon Office', division: 'Rangpur', district: 'Nilphamari', upazila: 'Nilphamari', typeSlug: 'district-office', email: 'nilphamari@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '122', facilityName: 'Panchagarh Civil Surgeon Office', division: 'Rangpur', district: 'Panchagarh', upazila: 'Panchagarh', typeSlug: 'district-office', email: 'panchagarh@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '123', facilityName: 'Rangpur Civil Surgeon Office', division: 'Rangpur', district: 'Rangpur', upazila: 'Rangpur', typeSlug: 'district-office', email: 'rangpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '124', facilityName: 'Thakurgaon Civil Surgeon Office', division: 'Rangpur', district: 'Thakurgaon', upazila: 'Thakurgaon', typeSlug: 'district-office', email: 'thakurgaon@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: 'cmo6r8z1j0003w0142rqkcx89', facilityName: 'Kasir Uddin Hospital & Diagnostic Center', division: 'Rangpur', district: 'Rangpur', upazila: 'Rangpur', typeSlug: 'private', email: 'zunaed.kmmch@gmail.com', role: 'USER', password: 'Dghealth@542' },
  
  // Civil Surgeon Offices - Sylhet Division
  { facilityCode: '125', facilityName: 'Habiganj Civil Surgeon Office', division: 'Sylhet', district: 'Habiganj', upazila: 'Habiganj', typeSlug: 'district-office', email: 'habiganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '126', facilityName: 'Moulvibazar Civil Surgeon Office', division: 'Sylhet', district: 'Moulvibazar', upazila: 'Moulvibazar', typeSlug: 'district-office', email: 'moulvibazar@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '127', facilityName: 'Sunamganj Civil Surgeon Office', division: 'Sylhet', district: 'Sunamganj', upazila: 'Sunamganj', typeSlug: 'district-office', email: 'sunamganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  { facilityCode: '128', facilityName: 'Sylhet Civil Surgeon Office', division: 'Sylhet', district: 'Sylhet', upazila: 'Sylhet', typeSlug: 'district-office', email: 'sylhet@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
  
  // System/Office facilities
  { facilityCode: '129', facilityName: 'Control Room DGHS', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'directorate', email: 'controlroom@mis.dghs.gov.bd', role: 'EDITOR', password: 'Dghealth@542' },
  { facilityCode: '130', facilityName: 'Admin', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'directorate', email: 'admin@mis.dghs.gov.bd', role: 'ADMIN', password: 'MisAdmin@542' },
  { facilityCode: '131', facilityName: 'Monitoring', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'directorate', email: 'monitoring@mis.dghs.gov.bd', role: 'VIEWER', password: 'Dghealth@542' },
  // Add to newFacilities array:
{ facilityCode: 'DNCC', facilityName: 'DNCC Dedicated Covid-19 Hospital, Mohakhali, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'specialized', email: 'dncc.covid@hospi.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
{ facilityCode: 'MRKhan', facilityName: 'Dr. M R Khan Shishu Hospital & Institute of Child Health, Mirpur-2, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'mrkhan.shishu@gmail.com', role: 'USER', password: 'Dghealth@542' },
{ facilityCode: 'DMCH', facilityName: 'Dhaka Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'mch', email: 'dmch@hospi.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
{ facilityCode: 'ibhdhaka', facilityName: 'Islami Bank Hospital Motijheel', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'ibhdhaka@gmail.com', role: 'USER', password: 'Dghealth@542' },
 { facilityCode: '51', facilityName: 'Dhaka Community Medical college Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private', email: 'ashrafulislamirfan@gmail.com', role: 'USER', password: 'Dghealth@542' },

]


  for (const f of newFacilities) {
    // Create or update facility
    const facility = await prisma.facility.upsert({
      where: { facilityCode: f.facilityCode },
      update: {
        facilityName: f.facilityName,
        division: f.division,
        district: f.district,
        upazila: f.upazila,
        facilityTypeId: typeMap[f.typeSlug],
      },
      create: {
        facilityCode: f.facilityCode,
        facilityName: f.facilityName,
        division: f.division,
        district: f.district,
        upazila: f.upazila,
        facilityTypeId: typeMap[f.typeSlug],
      }
    })

    // Create or update associated user (skip if no email)
    if (f.email) {
      const hashedPassword = await bcrypt.hash(f.password, 10)
      await prisma.user.upsert({
        where: { email: f.email },
        update: {
          password: hashedPassword,
          name: f.facilityName,
          nameNormalized: (f.facilityName.toLowerCase().replace(/\s+/g, '_') + '_' + f.facilityCode).substring(0, 50),
          role: f.role as Role,
          facilityId: facility.id,
          managedDivisions: f.role === 'EDITOR' ? [f.division] : [],
          isActive: true,
        },
        create: {
          email: f.email,
          password: hashedPassword,
          name: f.facilityName,
          nameNormalized: (f.facilityName.toLowerCase().replace(/\s+/g, '_') + '_' + f.facilityCode).substring(0, 50),
          role: f.role as Role,
          facilityId: facility.id,
          managedDivisions: f.role === 'EDITOR' ? [f.division] : [],
          isActive: true,
        }
      })
    }
  }
  console.log(`   ✓ Created ${newFacilities.length} facilities and users`)

  // Seed Public Portal System User
  await prisma.user.create({
    data: {
      id: 'public-submission',
      email: 'public-report@mis.dghs.gov.bd',
      name: 'Public Portal System',
      nameNormalized: 'public_portal_system',
      role: Role.VIEWER,
      isActive: true,
    }
  })
  console.log('   ✓ Created public portal system user')

  // ========================================
  // STEP 4: SEED DISEASE & OUTBREAK
  // ========================================
  console.log('🦠 Seeding disease and outbreak...')

  const measles = await prisma.disease.create({
    data: {
      name: 'Measles',
      code: 'MEASLES',
      description: 'Measles Outbreak Monitoring',
    }
  })

  const outbreak = await prisma.outbreak.create({
    data: {
      id: 'measles-2026',
      diseaseId: measles.id,
      name: 'National Measles Outbreak 2026',
      status: OutbreakStatus.ACTIVE,
      startDate: new Date('2026-01-01'),
      cutoffHour: 10,
      editDeadlineHour: 10,
      publishTimeHour: 14,
    }
  })
  console.log('   ✓ Created measles disease and outbreak')

  // ========================================
  // STEP 5: SEED FORM FIELDS
  // ========================================
  console.log('📋 Seeding form fields...')

  const fields = [
    { fieldKey: 'suspected24h', label: 'Suspected cases (24h)', labelBn: 'সন্দেহভাজন কেস (২৪ ঘণ্টা)', section: 'cases', isCoreField: true, sortOrder: 1 },
    { fieldKey: 'confirmed24h', label: 'Confirmed cases (24h)', labelBn: 'নিশ্চিত কেস (২৪ ঘণ্টা)', section: 'cases', isCoreField: true, sortOrder: 2 },
    { fieldKey: 'suspectedDeath24h', label: 'Suspected deaths (24h)', labelBn: 'সন্দেহভাজন মৃত্যু (২৪ ঘণ্টা)', section: 'mortality', isCoreField: true, sortOrder: 3 },
    { fieldKey: 'confirmedDeath24h', label: 'Confirmed deaths (24h)', labelBn: 'নিশ্চিত মৃত্যু (২৪ ঘণ্টা)', section: 'mortality', isCoreField: true, sortOrder: 4 },
    { fieldKey: 'admitted24h', label: 'Admitted (24h)', labelBn: 'ভর্তি (২৪ ঘণ্টা)', section: 'hospitalization', isCoreField: true, sortOrder: 5 },
    { fieldKey: 'discharged24h', label: 'Discharged (24h)', labelBn: 'ছাড়পত্র (২৪ ঘণ্টা)', section: 'hospitalization', isCoreField: true, sortOrder: 6 },
    { fieldKey: 'serumSent24h', label: 'Serum samples sent (24h)', labelBn: 'সিরাম নমুনা পাঠানো হয়েছে (২৪ ঘণ্টা)', section: 'lab', isCoreField: true, sortOrder: 7 },
  ]

  for (const f of fields) {
    await prisma.formField.create({
      data: { 
        ...f, 
        outbreakId: outbreak.id, 
        fieldType: FieldType.NUMBER 
      }
    })
  }
  console.log(`   ✓ Created ${fields.length} form fields`)

  // ========================================
  // STEP 6: SEED SETTINGS
  // ========================================
  console.log('⚙️  Seeding settings...')

  await prisma.settings.create({
    data: {
      id: 'default-settings',
      enablePublicView: true,
      enableEmailNotifications: true,
      defaultOutbreakId: outbreak.id,
    }
  })
  console.log('   ✓ Created default settings')

  // ========================================
  // STEP 7: SEED SUBMISSION WINDOW
  // ========================================
  console.log('🪟 Seeding submission window...')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const opensAt = new Date(today)
  const closesAt = new Date(today)
  closesAt.setHours(10, 0, 0, 0)

  await prisma.submissionWindow.create({
    data: {
      id: 'window-today',
      outbreakId: outbreak.id,
      periodStart: today,
      periodEnd: today,
      opensAt,
      closesAt,
      note: 'Normal daily window',
      isActive: true,
    }
  })
  console.log('   ✓ Created submission window')

  // ========================================
  // STEP 8: SEED HISTORICAL REPORTS FROM JSON
  // ========================================
  const reportsPath = path.join(process.cwd(), 'reports_by_email.json')
  console.log('   Looking for reports at:', reportsPath)
  let importedCount = 0
  if (fs.existsSync(reportsPath)) {
    console.log('📊 Seeding historical reports from reports_by_email.json...')
    const data = JSON.parse(fs.readFileSync(reportsPath, 'utf8'))
    
    // Get all facilities and form fields for mapping
    const dbFacilities = await prisma.facility.findMany()
    const dbFields = await prisma.formField.findMany({ where: { outbreakId: outbreak.id } })
    const fieldMap = Object.fromEntries(dbFields.map(f => [f.fieldKey, f.id]))

    const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } })

    // First, collect all reports into a map to avoid duplicates within the JSON
    const reportAggregator: Record<string, any> = {};
    const skippedFacilities = new Set<string>();

    let skipCount = 0;
    let mergeCount = 0;
    let totalJsonEntries = 0;

    // Get all users with their facilityId for email-based lookup
    const dbUsers = await prisma.user.findMany({
      where: { email: { in: Object.keys(data) } },
      select: { email: true, facilityId: true, id: true }
    });
    const userMap = Object.fromEntries(dbUsers.map(u => [u.email, u]));

    for (const [email, reports] of Object.entries(data)) {
      const user = userMap[email];
      
      for (const r of (reports as any)) {
        totalJsonEntries++;
        if (!r.reportingDate) {
          skipCount++;
          continue;
        }
        
        const [m_str, d_str, y_str] = r.reportingDate.split('/')
        if (!m_str || !d_str || !y_str) {
          skipCount++;
          continue;
        }
        const reportDate = new Date(Date.UTC(Number(y_str), Number(m_str) - 1, Number(d_str)))
        
        // Priority: Email match (most accurate)
        let facilityId = user?.facilityId;
        
        // Fallback: Name match if email not found or user has no facility
        if (!facilityId) {
          const normalize = (s: string) => s.toLowerCase()
            .replace(/hospital|limited|pvt|ltd|plc|medcial|college|general|specialized|\./gi, '')
            .replace(/[^a-z0-9]/g, '')
            .trim();

          const rn = normalize(r.facilityName || '');
          const rd = (r.district || '').toLowerCase().trim();

          const facility = dbFacilities.find(f => {
            const fn = normalize(f.facilityName);
            const fd = (f.district || '').toLowerCase().trim();
            return (fn === rn && (!rd || fd === rd)) || 
                   (fn.includes(rn) && rn.length > 5 && fd === rd);
          });
          
          if (facility) facilityId = facility.id;
        }

        if (facilityId) {
          const key = `${facilityId}_${outbreak.id}_${reportDate.toISOString()}`;
          if (!reportAggregator[key]) {
            reportAggregator[key] = {
              facilityId: facilityId,
              outbreakId: outbreak.id,
              userId: user?.id || admin?.id || 'system',
              periodStart: reportDate,
              suspected24h: 0,
              confirmed24h: 0,
              suspectedDeath24h: 0,
              confirmedDeath24h: 0,
              admitted24h: 0,
              discharged24h: 0
            }
          } else {
            mergeCount++;
          }
          
          reportAggregator[key].suspected24h += (r.suspectedCases || 0);
          reportAggregator[key].confirmed24h += (r.confirmedCases || 0);
          reportAggregator[key].suspectedDeath24h += (r.suspectedDeaths || 0);
          reportAggregator[key].confirmedDeath24h += (r.confirmedDeaths || 0);
          reportAggregator[key].admitted24h += (r.admitted || 0);
          reportAggregator[key].discharged24h += (r.discharged || 0);
        } else {
          skipCount++;
          if (r.facilityName) skippedFacilities.add(`${r.facilityName} (${email})`);
        }
      }
    }

    console.log(`   📊 JSON Analysis:`);
    console.log(`      Total Entries: ${totalJsonEntries}`);
    console.log(`      Skipped (Facility/Date issues): ${skipCount}`);
    console.log(`      Merged (Duplicate Dates): ${mergeCount}`);
    console.log(`      Final Unique Reports: ${Object.keys(reportAggregator).length}`);
    
    if (skippedFacilities.size > 0) {
      console.log(`      ⚠️  Sample Skipped Facility Names (${skippedFacilities.size} unique):`);
      Array.from(skippedFacilities).slice(0, 15).forEach(f => console.log(`         - ${f}`));
    }

    // We can't easily use createMany for upsert, but since we cleared data, 
    // we can use createMany for speed if we use fresh IDs.
    // However, if we want to be safe with IDs and relations, let's use a smarter batching.
    
    // We'll generate IDs manually to link them
    const crypto = await import('node:crypto');
    const uniqueReports = Object.values(reportAggregator);
    
    const reportsToCreate = uniqueReports.map(r => {
      const snap = {
        suspected24h: r.suspected24h,
        confirmed24h: r.confirmed24h,
        suspectedDeath24h: r.suspectedDeath24h,
        confirmedDeath24h: r.confirmedDeath24h,
        admitted24h: r.admitted24h,
        discharged24h: r.discharged24h,
        serumSent24h: 0
      };
      
      return {
        id: crypto.randomUUID(),
        outbreakId: r.outbreakId,
        facilityId: r.facilityId,
        userId: admin?.id || 'system',
        periodStart: r.periodStart,
        periodEnd: r.periodStart,
        status: ReportStatus.PUBLISHED,
        dataSnapshot: snap as any,
        publishedAt: new Date()
      };
    });

    await prisma.report.createMany({ data: reportsToCreate });

    const fieldValuesToCreate = [];
    for (const report of reportsToCreate) {
      const snap = report.dataSnapshot as any;
      for (const [key, val] of Object.entries(snap)) {
        fieldValuesToCreate.push({
          reportId: report.id,
          formFieldId: fieldMap[key],
          value: String(val)
        });
      }
    }

    // Chunk field values to avoid overwhelming the DB in one query
    const chunkSize = 1000;
    for (let i = 0; i < fieldValuesToCreate.length; i += chunkSize) {
      await prisma.reportFieldValue.createMany({
        data: fieldValuesToCreate.slice(i, i + chunkSize)
      });
    }

    importedCount = uniqueReports.length;
    console.log(`   ✓ Seeded ${importedCount} historical reports using batching`)
    console.log(`   ✓ Seeded ${importedCount} historical reports`)
  } else {
    console.log('⚠️  reports_by_email.json not found, skipping report seeding.')
  }

  // ========================================
  // DONE
  // ========================================
  console.log('\n✅ Seed completed successfully!')
  console.log(`   • Facility Types: ${facilityTypes.length}`)
  console.log(`   • Facilities: ${newFacilities.length}`)
  console.log(`   • Users: ${newFacilities.filter(f => f.email).length + 2}`)
  console.log(`   • Diseases: 1`)
  console.log(`   • Outbreaks: 1`)
  console.log(`   • Form Fields: ${fields.length}`)
  console.log(`   • Historical Reports: ${importedCount}`)
  console.log(`   • Settings: 1`)
  console.log(`   • Submission Windows: 1`)
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })