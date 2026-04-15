import { PrismaClient, Role, OutbreakStatus, FieldType, ReportStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting comprehensive seed...')

  // 1. Seed Facility Types
  const facilityTypes = [
    { name: 'Specialized Hospital', slug: 'specialized-hospital', tier: 'specialized' },
    { name: 'Medical College Hospital', slug: 'medical-college-hospital', tier: 'specialized' },
    { name: 'District Level Hospital (General / District)', slug: 'district-hospital', tier: 'district' },
    { name: 'Upazila Health Complex', slug: 'uhc', tier: 'upazila' },
    { name: 'Private Hospital/Clinic', slug: 'private-hospital', tier: 'private' },
    { name: 'Divisional Level Office', slug: 'divisional-office', tier: 'office' },
    { name: 'District Level Office', slug: 'district-office', tier: 'office' },
    { name: 'Directorate', slug: 'office', tier: 'office' },
  ]

  for (const type of facilityTypes) {
    await prisma.facilityType.upsert({
      where: { name: type.name },
      update: { tier: type.tier, slug: type.slug },
      create: { name: type.name, slug: type.slug, tier: type.tier },
    })
  }

  const types = await prisma.facilityType.findMany()
  const typeMap = Object.fromEntries(types.map(t => [t.slug, t.id]))

  // 2. Seed Real Facilities from Provided Data
  const newFacilities = [
    { facilityCode: '3', facilityName: 'Bangladesh Shishu (Children) Hospital & Institute', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'epiddsh@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '5', facilityName: 'BSMMU', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'daud.damc4549@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '6', facilityName: 'CENTRAL POLICE HOSPITAL, DHAKA.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'monwar.110@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '8', facilityName: 'Border Guard Hospital, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'bgbhospital@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '9', facilityName: 'CMH Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'npshagar27@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '16', facilityName: 'CMH SAVAR', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'cmhsavar@army.mil.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '17', facilityName: 'Government Employees Hospital, Fulbaria, Dhaka.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'geh@hospi.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '18', facilityName: 'DHAKA MOHANAGAR GENERAL HOSPITAL', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'dmghdscc@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '19', facilityName: 'Dhaka Mohanagar Shishu Hospital, Dhaka South City Corporation.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'dsccdmsh@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '1', facilityName: 'Bangladesh Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'bmchdhaka@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '2', facilityName: 'Holy Family Red Crescent M.C Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'hfrcmchdhaka@yahoo.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '3', facilityName: 'BIRDEM General Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'birdemmateon2021@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '4', facilityName: 'BIRDEM Women & Children Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'birdem-2@dab-bd.org', role: 'USER', password: 'birdem-2@dab-bd.org' },
    { facilityCode: '5', facilityName: 'Ibn Sina Medical College Hospital, Kallyanpur, Mirpur, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'ismchoffice@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '6', facilityName: 'Ibn Sina Hospital, Dhanmondi, Dhaka-1209', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'ibnsinahospitaldhanmondidengue@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '7', facilityName: 'SQUARE HOSPITALS LTD.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'muktadir@squarehospital.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '8', facilityName: 'COMFORT NURSING HOME (PVT) LTD.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'rahatraihan840@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '9', facilityName: 'SAMORITA HOSPITAL LIMITED', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'samoritahrd.it@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '10', facilityName: 'Delta Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'amiruldelta@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '11', facilityName: 'Labaid Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'shankarpanday144@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '12', facilityName: 'Central Hospital Limited', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'nursingserviceschl@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '13', facilityName: 'Hi-Care General Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'hicare13@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '14', facilityName: 'Health And Hope Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'healthandhope50@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '15', facilityName: 'Green Life Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'greenlifehospital@yahoo.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '16', facilityName: 'ISLAMI BANK CENTRAL HOSPITAL, KAKRAIL, DHAKA.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'ibhdit@yahoo.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '17', facilityName: 'Islami Bank Hospital Mugda, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'ibhmugda@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '18', facilityName: 'United Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'medical.records@uhlbd.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '19', facilityName: 'Khidmah Hospital (Pvt.) Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'info@khidmahhospital.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '20', facilityName: 'Shaheed Monsur Ali Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'smamch.1995@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '21', facilityName: 'Dr.Sirajul Islam Medical College & Hospital Ltd.,', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'simch.bd@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '22', facilityName: 'Evercare Hospital Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'mrdept@evercarebd.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '23', facilityName: 'Ad-din Women\'s Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: '', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '24', facilityName: 'Universal Medical College & Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'umcrc2022@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '25', facilityName: 'BRB Hospital Ltd', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'rasel.hr@brbhospital.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '26', facilityName: 'Asgar Ali Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'zahidulhaq@asgaralihospital.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '27', facilityName: 'Bangladesh Specialized Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'bshl.dhaka@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '28', facilityName: 'Uttara Adhunik Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'dduamch@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '29', facilityName: 'Salauddin Specialized Hospital Ltd', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'salauddinsphospital@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '30', facilityName: 'Popular Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'pmchcoordinator@yahoo.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '31', facilityName: 'Uttara Crescent Hopital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'shuvo.uch@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '32', facilityName: 'Anwer Khan Modern Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'akmmchcovid19@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '33', facilityName: 'Medical College for Women & Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'nurarubel@outlook.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '34', facilityName: 'Dr. M R Khan Shishu Hospital & ICH', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'mhossain3306@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '35', facilityName: 'Dhaka Central International Medical College & Hospital (DCIMCH)', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'admin@dcimch.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '36', facilityName: 'Aichi Hospital LTD', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'sabik.aichi@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '37', facilityName: 'MONOWARA HOSPITAL PVT. LTD.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'monowarahospital@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '38', facilityName: 'Zainul Haque Sikder Women\'s Medical College & Hospital (Pvt.) Ltd. , Gulshan Branch', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'info@sikderhospital.net', role: 'USER', password: 'info@sikderhospital.net' },
    { facilityCode: '39', facilityName: 'ENAM MEDICAL COLLEGE & HOSPITAL', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'info@emch.com.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '40', facilityName: 'AMZ HOSPITAL LTD', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'amzhospitalltd.mis10699@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '41', facilityName: 'LIFE & CARE HOSPITAL LTD.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'lifeandcarehospital@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '42', facilityName: 'Farabi General Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'jashimuddin4361@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '43', facilityName: 'Japan Bangladesh Friendship Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'jbfh24@yahoo.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '44', facilityName: 'EXIM Bank Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'barikkhan1962@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '45', facilityName: 'Al Manar Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'almanarhospital1996@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '46', facilityName: 'Dhaka Health Care', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'dhhhospital@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '47', facilityName: 'Metorpolitan Medical Centre Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'mmcl_nc@yahoo.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '48', facilityName: 'Sajida Hospital, Keranigonj, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'liaquate@sajida.org', role: 'USER', password: 'liaquate@sajida.org' },
    { facilityCode: '49', facilityName: 'Ad-din Women\'s Medical College Hospital, Moghbazar, Dhaka-1217', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'mdshihab886@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '50', facilityName: 'BIHS General Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'mhasemanto@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '51', facilityName: 'Dhaka Community Medical college Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'ashrafulislamirfan@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '52', facilityName: 'Northern International Medical College, Dhanmondi, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'drjihadortho@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '53', facilityName: 'Ad-din Barister Rafique ul-huq Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'abrhhospital8@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '54', facilityName: 'Aalok Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'aalokbd195@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '55', facilityName: 'CITY HOSPITAL LTD.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'cityhosp.bd@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '56', facilityName: 'Crescent Gastroliver & General Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'crescentgastroliver2010@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '57', facilityName: 'Islami Bank Hospital Mirpur', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'ibhmirpur@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '58', facilityName: 'MARKS Medical College and Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'marksgroupit@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '59', facilityName: 'Millennium Specialized Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'infomshl99@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '60', facilityName: 'Dhanmondi General & Kidney Hospital Ltd.', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'khairuldgkh2022@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '61', facilityName: 'Padma General Hospital Ltd', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'pghl1999@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '62', facilityName: 'Bashundhara Ad-din Medical College Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'bashundharaaddin@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '63', facilityName: 'icddr,b Hospital, Mohakhali, Dhaka', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'mmobegum@icddrb.org', role: 'USER', password: 'mmobegum@icddrb.org' },
    { facilityCode: '64', facilityName: 'Insaf Barakh Kidney & General Hospital', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'private-hospital', email: 'insafbarakah@gmail.com', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '65', facilityName: 'Barisal Civil Surgeon Office', division: 'Barisal', district: 'Barisal', upazila: 'Barisal', typeSlug: 'district-office', email: 'barisal@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '66', facilityName: 'Barguna Civil Surgeon Office', division: 'Barisal', district: 'Barguna', upazila: 'Barguna', typeSlug: 'district-office', email: 'barguna@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '67', facilityName: 'Bhola Civil Surgeon Office', division: 'Barisal', district: 'Bhola', upazila: 'Bhola', typeSlug: 'district-office', email: 'bhola@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '68', facilityName: 'Jhalokati Civil Surgeon Office', division: 'Barisal', district: 'Jhalokati', upazila: 'Jhalokati', typeSlug: 'district-office', email: 'jhalokati@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '69', facilityName: 'Patuakhali Civil Surgeon Office', division: 'Barisal', district: 'Patuakhali', upazila: 'Patuakhali', typeSlug: 'district-office', email: 'patuakhali@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '70', facilityName: 'Pirojpur Civil Surgeon Office', division: 'Barisal', district: 'Pirojpur', upazila: 'Pirojpur', typeSlug: 'district-office', email: 'pirojpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '71', facilityName: 'Bandarban Civil Surgeon Office', division: 'Chattagram', district: 'Bandarban', upazila: 'Bandarban', typeSlug: 'district-office', email: 'bandarban@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '72', facilityName: 'Brahmanbaria Civil Surgeon Office', division: 'Chattagram', district: 'Brahmanbaria', upazila: 'Brahmanbaria', typeSlug: 'district-office', email: 'brahmanbaria@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '73', facilityName: 'Chandpur Civil Surgeon Office', division: 'Chattagram', district: 'Chandpur', upazila: 'Chandpur', typeSlug: 'district-office', email: 'chandpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '74', facilityName: 'Chattogram Civil Surgeon Office', division: 'Chattagram', district: 'Chattagram', upazila: 'Chattagram', typeSlug: 'district-office', email: 'chittagong@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '75', facilityName: 'Cumilla Civil Surgeon Office', division: 'Chattagram', district: 'Cumilla', upazila: 'Cumilla', typeSlug: 'district-office', email: 'cumilla@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '76', facilityName: 'Cox\'s Bazar Civil Surgeon Office', division: 'Chattagram', district: 'Cox\'s Bazar', upazila: 'Cox\'s Bazar', typeSlug: 'district-office', email: 'coxsbazar@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '77', facilityName: 'Feni Civil Surgeon Office', division: 'Chattagram', district: 'Feni', upazila: 'Feni', typeSlug: 'district-office', email: 'feni@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '78', facilityName: 'Khagrachhari Civil Surgeon Office', division: 'Chattagram', district: 'Khagrachhari', upazila: 'Khagrachhari', typeSlug: 'district-office', email: 'khagrachhari@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '79', facilityName: 'Lakshmipur Civil Surgeon Office', division: 'Chattagram', district: 'Lakshmipur', upazila: 'Lakshmipur', typeSlug: 'district-office', email: 'lakshmipur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '80', facilityName: 'Noakhali Civil Surgeon Office', division: 'Chattagram', district: 'Noakhali', upazila: 'Noakhali', typeSlug: 'district-office', email: 'noakhali@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '81', facilityName: 'Rangamati Civil Surgeon Office', division: 'Chattagram', district: 'Rangamati', upazila: 'Rangamati', typeSlug: 'district-office', email: 'rangamati@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
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
    { facilityCode: '105', facilityName: 'Jamalpur Civil Surgeon Office', division: 'Mymensingh', district: 'Jamalpur', upazila: 'Jamalpur', typeSlug: 'district-office', email: 'jamalpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '106', facilityName: 'Mymensingh Civil Surgeon Office', division: 'Mymensingh', district: 'Mymensingh', upazila: 'Mymensingh', typeSlug: 'district-office', email: 'mymensingh@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '107', facilityName: 'Netrokona Civil Surgeon Office', division: 'Mymensingh', district: 'Netrokona', upazila: 'Netrokona', typeSlug: 'district-office', email: 'netrokona@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '108', facilityName: 'Sherpur Civil Surgeon Office', division: 'Mymensingh', district: 'Sherpur', upazila: 'Sherpur', typeSlug: 'district-office', email: 'sherpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '109', facilityName: 'Bogura Civil Surgeon Office', division: 'Rajshahi', district: 'Bogura', upazila: 'Bogura', typeSlug: 'district-office', email: 'bogura@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '110', facilityName: 'Joypurhat Civil Surgeon Office', division: 'Rajshahi', district: 'Joypurhat', upazila: 'Joypurhat', typeSlug: 'district-office', email: 'joypurhat@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '111', facilityName: 'Naogaon Civil Surgeon Office', division: 'Rajshahi', district: 'Naogaon', upazila: 'Naogaon', typeSlug: 'district-office', email: 'naogaon@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '112', facilityName: 'Natore Civil Surgeon Office', division: 'Rajshahi', district: 'Natore', upazila: 'Natore', typeSlug: 'district-office', email: 'natore@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '113', facilityName: 'Chapainawabganj Civil Surgeon Office', division: 'Rajshahi', district: 'Chapainawabganj', upazila: 'Chapainawabganj', typeSlug: 'district-office', email: 'chapainawabganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '114', facilityName: 'Pabna Civil Surgeon Office', division: 'Rajshahi', district: 'Pabna', upazila: 'Pabna', typeSlug: 'district-office', email: 'pabna@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '115', facilityName: 'Rajshahi Civil Surgeon Office', division: 'Rajshahi', district: 'Rajshahi', upazila: 'Rajshahi', typeSlug: 'district-office', email: 'rajshahi@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '116', facilityName: 'Sirajganj Civil Surgeon Office', division: 'Rajshahi', district: 'Sirajganj', upazila: 'Sirajganj', typeSlug: 'district-office', email: 'sirajganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '117', facilityName: 'Dinajpur Civil Surgeon Office', division: 'Rangpur', district: 'Dinajpur', upazila: 'Dinajpur', typeSlug: 'district-office', email: 'dinajpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '118', facilityName: 'Gaibandha Civil Surgeon Office', division: 'Rangpur', district: 'Gaibandha', upazila: 'Gaibandha', typeSlug: 'district-office', email: 'gaibandha@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '119', facilityName: 'Kurigram Civil Surgeon Office', division: 'Rangpur', district: 'Kurigram', upazila: 'Kurigram', typeSlug: 'district-office', email: 'kurigram@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '120', facilityName: 'Lalmonirhat Civil Surgeon Office', division: 'Rangpur', district: 'Lalmonirhat', upazila: 'Lalmonirhat', typeSlug: 'district-office', email: 'lalmonirhat@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '121', facilityName: 'Nilphamari Civil Surgeon Office', division: 'Rangpur', district: 'Nilphamari', upazila: 'Nilphamari', typeSlug: 'district-office', email: 'nilphamari@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '122', facilityName: 'Panchagarh Civil Surgeon Office', division: 'Rangpur', district: 'Panchagarh', upazila: 'Panchagarh', typeSlug: 'district-office', email: 'panchagarh@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '123', facilityName: 'Rangpur Civil Surgeon Office', division: 'Rangpur', district: 'Rangpur', upazila: 'Rangpur', typeSlug: 'district-office', email: 'rangpur@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '124', facilityName: 'Thakurgaon Civil Surgeon Office', division: 'Rangpur', district: 'Thakurgaon', upazila: 'Thakurgaon', typeSlug: 'district-office', email: 'thakurgaon@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '125', facilityName: 'Habiganj Civil Surgeon Office', division: 'Sylhet', district: 'Habiganj', upazila: 'Habiganj', typeSlug: 'district-office', email: 'habiganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '126', facilityName: 'Moulvibazar Civil Surgeon Office', division: 'Sylhet', district: 'Moulvibazar', upazila: 'Moulvibazar', typeSlug: 'district-office', email: 'moulvibazar@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '127', facilityName: 'Sunamganj Civil Surgeon Office', division: 'Sylhet', district: 'Sunamganj', upazila: 'Sunamganj', typeSlug: 'district-office', email: 'sunamganj@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '128', facilityName: 'Sylhet Civil Surgeon Office', division: 'Sylhet', district: 'Sylhet', upazila: 'Sylhet', typeSlug: 'district-office', email: 'sylhet@cs.dghs.gov.bd', role: 'USER', password: 'Dghealth@542' },
    { facilityCode: '129', facilityName: 'Control Room DGHS', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'office', email: 'controlroom@mis.dghs.gov.bd', role: 'EDITOR', password: 'Dghealth@542' },
    { facilityCode: '130', facilityName: 'Admin', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'office', email: 'admin@mis.dghs.gov.bd', role: 'ADMIN', password: 'MisAdmin@542' },
    { facilityCode: '131', facilityName: 'Monitoring', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhaka', typeSlug: 'office', email: 'monitoring@mis.dghs.gov.bd', role: 'VIEWER', password: 'Dghealth@542' },
  ]

  for (const f of newFacilities) {
    const facilityData = {
      facilityCode: f.facilityCode,
      facilityName: f.facilityName,
      division: f.division,
      district: f.district,
      upazila: f.upazila,
      facilityTypeId: typeMap[f.typeSlug],
    }
    const facility = await prisma.facility.upsert({
      where: { facilityCode: f.facilityCode },
      update: facilityData,
      create: facilityData,
    })

    const hashedPassword = await bcrypt.hash(f.password, 10)
    await prisma.user.upsert({
      where: { email: f.email },
      update: { 
        facilityId: facility.id,
        role: f.role as Role,
        managedDivisions: f.role === 'EDITOR' ? [f.division] : [],
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

  console.log('Users seeded')
  
  // 3b. Seed System Users for Public Portal
  await prisma.user.upsert({
    where: { id: 'public-submission' },
    update: { isActive: true },
    create: {
      id: 'public-submission',
      email: 'public-report@mis.dghs.gov.bd',
      name: 'Public Portal System',
      nameNormalized: 'public_portal_system',
      role: Role.VIEWER,
      isActive: true,
    }
  })


  // 4. Seed Disease and Outbreak
  const measles = await prisma.disease.upsert({
    where: { code: 'MEASLES' },
    update: {},
    create: {
      name: 'Measles',
      code: 'MEASLES',
      description: 'Measles Outbreak Monitoring',
    }
  })

  const outbreak = await prisma.outbreak.upsert({
    where: { id: 'measles-2026' }, // Fixed ID for seeding references
    update: { 
        diseaseId: measles.id,
        name: 'National Measles Outbreak 2026',
        status: OutbreakStatus.ACTIVE,
        startDate: new Date('2026-01-01'),
    },
    create: {
      id: 'measles-2026',
      diseaseId: measles.id,
      name: 'National Measles Outbreak 2026',
      status: OutbreakStatus.ACTIVE,
      startDate: new Date('2026-01-01'),
    }
  })

  // 5. Seed Form Fields
  const fields = [
    { fieldKey: 'suspected24h', label: 'Suspected cases (24h)', labelBn: 'সন্দেহভাজন কেস (২৪ ঘণ্টা)', section: 'cases', isCoreField: true, sortOrder: 1 },
    { fieldKey: 'confirmed24h', label: 'Confirmed cases (24h)', labelBn: 'নিশ্চিত কেস (২৪ ঘণ্টা)', section: 'cases', isCoreField: true, sortOrder: 2 },
    { fieldKey: 'suspectedDeath24h', label: 'Suspected deaths (24h)', labelBn: 'সন্দেহভাজন মৃত্যু (২৪ ঘণ্টা)', section: 'mortality', isCoreField: true, sortOrder: 3 },
    { fieldKey: 'confirmedDeath24h', label: 'Confirmed deaths (24h)', labelBn: 'নিশ্চিত মৃত্যু (২৪ ঘণ্টা)', section: 'mortality', isCoreField: true, sortOrder: 4 },
    { fieldKey: 'admitted24h', label: 'Admitted (24h)', labelBn: 'ভর্তি (২৪ ঘণ্টা)', section: 'hospitalization', isCoreField: true, sortOrder: 5 },
    { fieldKey: 'discharged24h', label: 'Discharged (24h)', labelBn: 'ছাড়পত্র (২৪ ঘণ্টা)', section: 'hospitalization', isCoreField: true, sortOrder: 6 },
    { fieldKey: 'serumSent24h', label: 'Serum samples sent (24h)', labelBn: 'সিরাম নমুনা পাঠানো হয়েছে (২৪ ঘণ্টা)', section: 'lab', isCoreField: true, sortOrder: 7 },
  ]

  for (const f of fields) {
    await prisma.formField.upsert({
      where: { outbreakId_fieldKey: { outbreakId: outbreak.id, fieldKey: f.fieldKey } },
      update: f,
      create: { ...f, outbreakId: outbreak.id, fieldType: FieldType.NUMBER },
    })
  }

  // 6. Seed Settings
  await prisma.settings.upsert({
    where: { id: 'default-settings' },
    update: {
      defaultOutbreakId: outbreak.id,
    },
    create: {
      id: 'default-settings',
      enablePublicView: true,
      enableEmailNotifications: true,
      defaultOutbreakId: outbreak.id,
    }
  })

  // 7. Seed initial Submission Window
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const opensAt = new Date(today)
  const closesAt = new Date(today)
  closesAt.setHours(14, 0, 0, 0)

  await prisma.submissionWindow.upsert({
    where: { id: 'window-today' },
    update: {
        periodStart: today,
        periodEnd: today,
        opensAt,
        closesAt,
        isActive: true
    },
    create: {
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

  console.log('Seed completed successfully!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })