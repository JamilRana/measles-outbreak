import { PrismaClient, ReportStatus } from '@prisma/client';

const poolUrl = process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'connection_limit=1';
const prisma = new PrismaClient({
  datasourceUrl: poolUrl,
  log: ['error'],
});

const rawData = [
  ["Barisal", "Barguna", "Civil Surgeon Office", "184", "166", "129", "0", "35", "3"],
  ["Barisal", "Barisal", "Civil Surgeon office", "91", "26", "9", "0", "4", "0"],
  ["Barisal", "BHOLA", "Civil Surgeon Office", "67", "43", "30", "0", "8", "2"],
  ["Barisal", "Jhalkathi", "Civil Surgeon Office", "37", "13", "5", "2", "8", "0"],
  ["Barisal", "Patuakhali", "Civil Surgeon Office", "183", "168", "101", "0", "9", "0"],
  ["Barisal", "Pirojpur", "Civil Surgeon Office", "66", "22", "14", "0", "4", "0"],
  ["Chattogram", "Bandarban", "Civil Surgeon Office", "13", "13", "10", "0", "1", "0"],
  ["Chattogram", "Brahmanbaria", "Civil Surgeon Office", "66", "66", "34", "0", "11", "0"],
  ["Chattogram", "Chandpur", "Civil Surgeon Office", "195", "71", "51", "0", "33", "3"],
  ["Chattogram", "Chattogram", "Civil Surgeon Office", "251", "180", "98", "1", "18", "0"],
  ["Chattogram", "Coxsbazar", "Civil Surgeon Office", "220", "210", "159", "5", "34", "0"],
  ["Chattogram", "Cumilla", "Civil Surgeon Office", "356", "143", "84", "3", "27", "0"],
  ["Chattogram", "Feni", "Civil Surgeon Office", "78", "33", "20", "0", "2", "0"],
  ["Chattogram", "Khagrachari", "Civil Surgeon Office", "12", "12", "11", "0", "0", "0"],
  ["Chattogram", "Lakshmipur", "Civil Surgeon Office", "76", "71", "46", "1", "4", "0"],
  ["Chattogram", "Noakhali", "Civil Surgeon Office", "132", "132", "83", "0", "6", "0"],
  ["Chattogram", "Rangamati", "Civil Surgeon Office", "16", "5", "5", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Ad-din Medical College Hospital, Moghbazar, Dhaka-1217", "0", "23", "18", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Aichi Hospital Ltd.", "1", "5", "2", "0", "0", "0"],
  ["Dhaka", "Dhaka", "AMZ Hospital Ltd.", "2", "1", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Anwer Khan Modern Medical College Hospital", "0", "0", "1", "0", "6", "0"],
  ["Dhaka", "Dhaka", "Asgar Ali Hospital", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Bangladesh medical University", "10", "10", "3", "0", "10", "0"],
  ["Dhaka", "Dhaka", "Bangladesh Shishu Hospital & Institute", "209", "209", "148", "4", "35", "0"],
  ["Dhaka", "Dhaka", "Bangladesh Specialized Hospital PLC", "1", "1", "0", "0", "1", "0"],
  ["Dhaka", "Dhaka", "BIHS General Hospital", "1", "1", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Birdem 2", "7", "7", "5", "1", "1", "0"],
  ["Dhaka", "Dhaka", "BRB Hospital Ltd", "10", "2", "7", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Civil Surgeon Office", "133", "75", "54", "0", "30", "0"],
  ["Dhaka", "Dhaka", "Continental Hospital", "7", "7", "4", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Crescent Gastroliver & General Hospital Ltd.", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Dhaka Central International Medical College & Hospital", "3", "3", "2", "0", "1", "0"],
  ["Dhaka", "Dhaka", "Dhaka Community Hospital", "14", "7", "1", "0", "14", "0"],
  ["Dhaka", "Dhaka", "Dhaka Community Medical College Hospital", "50", "39", "34", "0", "39", "0"],
  ["Dhaka", "Dhaka", "Dhaka medical College hospital", "14", "14", "0", "1", "14", "3"],
  ["Dhaka", "Dhaka", "DNCC Dedicated Covid-19 Hospital, Mohakhali, Dhaka", "1087", "709", "433", "3", "150", "1"],
  ["Dhaka", "Dhaka", "Dr. M R Khan shishu Hospital & Institute of Child Health, Mirpur-2, Dhaka", "138", "74", "24", "1", "138", "1"],
  ["Dhaka", "Dhaka", "Dr. Sirajul Islam Medical College & Hospital Ltd.", "3", "1", "0", "0", "10", "0"],
  ["Dhaka", "Dhaka", "Enam Medical College & Hospital", "0", "23", "9", "0", "18", "0"],
  ["Dhaka", "Dhaka", "Evercare Hospital Dhaka", "8", "8", "13", "0", "10", "0"],
  ["Dhaka", "Dhaka", "EXIM Bank Hospital", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Hi-Care General Hospital Ltd.", "1", "1", "1", "0", "1", "0"],
  ["Dhaka", "Dhaka", "Holy Family Red Crescent Medical College Hopital", "0", "0", "5", "0", "10", "0"],
  ["Dhaka", "Dhaka", "Ibn Sina Hospital", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Infectious Diseases Hospital, Mohakhali, Dhaka-1212", "745", "629", "634", "28", "180", "1"],
  ["Dhaka", "Dhaka", "Insaf Barakah Kidney & General Hospital", "2", "2", "2", "2", "2", "0"],
  ["Dhaka", "Dhaka", "Japan Bangladesh Friendship Hospital Ltd.", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Khidmah Hospital (Pvt.) Ltd.", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Kurmitola General Hospital", "23", "16", "9", "1", "0", "0"],
  ["Dhaka", "Dhaka", "Kuwait Bangladesh Friendship Govt. Hospital", "7", "7", "1", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Labaid Hospital", "1", "1", "0", "0", "1", "0"],
  ["Dhaka", "Dhaka", "Millennium Specialized Hospital Ltd.", "2", "8", "6", "0", "6", "0"],
  ["Dhaka", "Dhaka", "Mugda Medical College Hospital, Dhaka", "81", "81", "42", "1", "0", "0"],
  ["Dhaka", "Dhaka", "National Institute of Traumatology and Orthopaedic Rehabilitation (NITOR)", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Popular Medical College And Hospital Ltd.", "0", "0", "0", "0", "1", "0"],
  ["Dhaka", "Dhaka", "Shaheed Monsur Ali Medical College Hospital", "0", "4", "2", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Shaheed Suhrawardy Medical College Hospital", "280", "252", "152", "3", "31", "0"],
  ["Dhaka", "Dhaka", "Sir Salimullah Medical College mitford Hospital Dhaka", "30", "18", "18", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Square Hospital LTD", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "United Medical College Hospital", "1", "1", "2", "0", "2", "0"],
  ["Dhaka", "Dhaka", "Universal medical college hospital", "2", "2", "3", "0", "7", "1"],
  ["Dhaka", "Dhaka", "Uttara Crescent Hospital", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Z H Sikder Women's Medical College & Hospital (pvt) Ltd., Gulshan.", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Faridpur", "Civil Surgeon Office", "152", "42", "67", "1", "4", "0"],
  ["Dhaka", "Gazipur", "Civil Surgeon Office", "133", "111", "80", "0", "16", "0"],
  ["Dhaka", "GOPALGANJ", "Civil Surgeon Office", "154", "116", "61", "1", "8", "0"],
  ["Dhaka", "Kishoreganj", "Civil Surgeon Office", "146", "46", "14", "0", "16", "1"],
  ["Dhaka", "Madaripur", "Civil Surgeon Office", "85", "63", "43", "1", "15", "0"],
  ["Dhaka", "Manikganj", "Civil Surgeon Office", "105", "60", "30", "0", "3", "0"],
  ["Dhaka", "Munshiganj", "Civil Surgeon Office", "73", "16", "11", "0", "26", "0"],
  ["Dhaka", "Narayanganj", "Civil Surgeon Office", "56", "38", "12", "0", "0", "0"],
  ["Dhaka", "Narsingdi", "Civil Surgeon Office", "104", "51", "34", "0", "14", "0"],
  ["Dhaka", "Rajbari", "Civil Surgeon Office", "52", "27", "24", "0", "3", "0"],
  ["Dhaka", "Shariatpur", "Civil Surgeon Office", "96", "28", "15", "1", "13", "1"],
  ["Dhaka", "Tangail", "Civil Surgeon Office", "133", "107", "66", "2", "12", "0"],
  ["Khulna", "Bagerhat", "Civil Surgeon Office", "12", "11", "1", "0", "0", "0"],
  ["Khulna", "Chuadanga", "Civil Surgeon Office", "7", "0", "1", "0", "0", "0"],
  ["Khulna", "jashore", "Civil Surgeon Office", "175", "57", "25", "0", "23", "0"],
  ["Khulna", "Jhenaidah", "Civil Surgeon Office", "31", "31", "9", "0", "7", "0"],
  ["Khulna", "Khulna", "Civil Surgeon Office", "62", "62", "50", "0", "6", "0"],
  ["Khulna", "Kushtia", "Civil Surgeon Office", "281", "281", "172", "6", "1", "0"],
  ["Khulna", "Magura", "Civil Surgeon Office", "140", "98", "14", "0", "8", "0"],
  ["Khulna", "Meherpur", "Civil Surgeon Office", "55", "46", "24", "0", "0", "0"],
  ["Khulna", "Narail", "Civil Surgeon Office", "21", "17", "9", "0", "4", "0"],
  ["Khulna", "Satkhira", "Civil Surgeon Office", "40", "40", "20", "0", "0", "0"],
  ["Mymensingh", "Jamalpur", "Civil Surgeon Office", "35", "35", "15", "0", "0", "1"],
  ["Mymensingh", "Mymensingh", "Civil Surgeon Office", "47", "2", "0", "0", "7", "0"],
  ["Mymensingh", "Netrokona", "Civil Surgeon Office", "135", "52", "24", "0", "10", "1"],
  ["Mymensingh", "Sherpur", "Civil Surgeon Office", "42", "19", "10", "0", "0", "0"],
  ["Rajshahi", "Bogura", "Civil Surgeon Office", "117", "54", "28", "2", "2", "0"],
  ["Rajshahi", "Chapainawabganj", "Civil Surgeon Office", "462", "462", "387", "6", "38", "0"],
  ["Rajshahi", "Joypurhat", "Civil Surgeon Office", "74", "27", "14", "0", "3", "0"],
  ["Rajshahi", "Naogaon", "Civil Surgeon Office", "160", "21", "8", "1", "10", "0"],
  ["Rajshahi", "Natore", "Civil Surgeon Office", "118", "86", "43", "0", "14", "0"],
  ["Rajshahi", "Pabna", "Civil Surgeon Office", "252", "252", "208", "6", "65", "2"],
  ["Rajshahi", "Rajshahi", "Civil Surgeon Office", "91", "17", "10", "0", "18", "0"],
  ["Rajshahi", "Rajshahi", "Rajshahi Medical College Hospital", "429", "429", "263", "43", "37", "0"],
  ["Rajshahi", "Sirajganj", "Civil Surgeon Office", "47", "47", "31", "0", "46", "0"],
  ["Rangpur", "Dinajpur", "Civil Surgeon Office", "109", "60", "56", "0", "4", "0"],
  ["Rangpur", "Gaibandha", "Civil Surgeon Office", "57", "11", "10", "0", "0", "0"],
  ["Rangpur", "Kurigram", "Civil Surgeon Office", "26", "24", "23", "0", "1", "0"],
  ["Rangpur", "lalmonirhat", "Civil Surgeon Office", "21", "11", "5", "0", "0", "0"],
  ["Rangpur", "Nilphamari", "Civil Surgeon Office", "65", "9", "7", "0", "2", "0"],
  ["Rangpur", "Panchagarh", "Civil Surgeon Office", "21", "0", "0", "0", "0", "0"],
  ["Rangpur", "Rangpur", "Civil Surgeon Office", "30", "0", "0", "0", "0", "0"],
  ["Rangpur", "Rangpur", "Kasir Uddin Hospital & Diagnostic Center", "0", "0", "0", "0", "0", "0"],
  ["Rangpur", "Thakurgaon", "Civil Surgeon Office", "50", "15", "8", "0", "3", "0"],
  ["Sylhet", "Habiganj", "Civil Surgeon Office", "58", "46", "34", "0", "6", "0"],
  ["Sylhet", "Moulvibazar", "Civil Surgeon Office", "108", "43", "24", "0", "10", "0"],
  ["Sylhet", "Sunamganj", "Civil Surgeon Office", "138", "73", "41", "0", "11", "0"],
  ["Sylhet", "Sylhet", "Civil Surgeon Office", "162", "125", "80", "1", "10", "0"],
  ["Dhaka", "Dhaka", "Ata Khan Medical College & Hospital", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Shanto-Mariam General Hospital", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Green Life Medical College Hospital", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Impulse Hospital", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Samorita Hospital", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Delta Hospital Ltd.", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Islami Bank Hospital Mugda", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "Pan Pacific Hospital", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "General Medical College & Hospital", "0", "0", "0", "0", "0", "0"],
  ["Dhaka", "Dhaka", "South Ridge Hospital", "0", "0", "0", "0", "0", "0"]
];

const normalizedDistricts: Record<string, string> = {
  'coxsbazar': "Cox's Bazar",
  'khagrachari': 'Khagrachhari',
  'chapainawabganj': 'Chapainawabganj',
  'jhalkathi': 'Jhalokati',
  'gopalganj': 'Gopalganj',
};

async function main() {
  const outbreakId = 'measles-2026';
  const reportDate = new Date('2026-04-07T00:00:00Z');
  
  console.log('Connecting to database...');
  await prisma.$connect();
  
  console.log('Fetching metadata...');
  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) throw new Error('No user found');

  const facilities = await prisma.facility.findMany();
  const fields = await prisma.formField.findMany({ where: { outbreakId } });
  const fMap: any = {};
  fields.forEach(f => fMap[f.fieldKey] = f.id);

  console.log(`Cleaning existing reports for ${reportDate.toISOString().split('T')[0]}...`);
  
  await prisma.reportFieldValue.deleteMany({
    where: { report: { outbreakId, periodStart: reportDate } }
  });

  await prisma.report.deleteMany({
    where: { outbreakId, periodStart: reportDate }
  });

  await prisma.dailyReport.deleteMany({
    where: { outbreakId, reportingDate: reportDate }
  });

  console.log('Starting seed loop...');

  const missingFacilities = new Set<string>();
  const collateralInfo: string[] = [];
  let successCount = 0;

  for (const record of rawData) {
    const [division, district, facilityInput, susp, adm, disc, sdt, conf, cdt] = record;
    const normalizedDist = normalizedDistricts[district.toLowerCase()] || district;
    
    // 1. Filter Facilities by District
    const districtFacilities = facilities.filter(f => 
      f.district.trim().toLowerCase() === normalizedDist.trim().toLowerCase()
    );

    // 2. Perform Weighted Matching
    let facility: any = null;
    const inName = facilityInput.trim().toLowerCase();

    // Priority 1: Exact Match
    facility = districtFacilities.find(f => f.facilityName.trim().toLowerCase() === inName);

    // Priority 2: Civil Surgeon Suffix
    if (!facility && inName.includes("civil surgeon")) {
      facility = districtFacilities.find(f => 
        f.facilityName.trim().toLowerCase().includes("civil surgeon") &&
        f.facilityName.trim().toLowerCase().includes(normalizedDist.toLowerCase())
      );
    }

    // Priority 3: Fuzzy Strip Match
    if (!facility) {
      const cleanIn = inName.replace(/,/g, '').replace(/\(pvt\)/g, '').replace(/ltd\.?$/, '').replace(/limited$/, '').trim().split('-')[0].trim();
      facility = districtFacilities.find(f => {
        const cleanDb = f.facilityName.trim().toLowerCase().replace(/,/g, '').replace(/\(pvt\)/g, '').replace(/ltd\.?$/, '').replace(/limited$/, '').trim();
        return cleanDb.includes(cleanIn) || cleanIn.includes(cleanDb);
      });
    }

    // Priority 4: Name Parts (At least 2 significant words)
    if (!facility) {
      const words = inName.split(/\s+/).filter(w => w.length > 2 && w !== 'hospital' && w !== 'medical' && w !== 'college');
      if (words.length >= 1) {
        facility = districtFacilities.find(f => {
          const dbWords = f.facilityName.toLowerCase().split(/\s+/);
          return words.every(w => dbWords.includes(w));
        });
      }
    }

    if (!facility) {
      missingFacilities.add(`${facilityInput} (${district})`);
      continue;
    }

    const dataSnapshot = {
      suspected24h: Number(susp.replace(/,/g, '')),
      admitted24h: Number(adm.replace(/,/g, '')),
      discharged24h: Number(disc.replace(/,/g, '')),
      suspectedDeath24h: Number(sdt.replace(/,/g, '')),
      confirmed24h: Number(conf.replace(/,/g, '')),
      confirmedDeath24h: Number(cdt.replace(/,/g, ''))
    };

    try {
      // Check for collision before creating
      const collision = await prisma.report.findUnique({
        where: {
          facilityId_outbreakId_periodStart: {
            facilityId: facility.id,
            outbreakId,
            periodStart: reportDate
          }
        }
      });

      if (collision) {
        collateralInfo.push(`COLLISION: Input "${facilityInput}" and previously mapped record both matched to DB Facility "${facility.facilityName}" in ${district}`);
        continue;
      }

      const report = await prisma.report.create({
        data: {
          outbreakId,
          facilityId: facility.id,
          userId: user.id,
          periodStart: reportDate,
          periodEnd: reportDate,
          status: ReportStatus.PUBLISHED,
          publishedAt: new Date(),
          dataSnapshot
        }
      });

      const fieldValues = [
        { modernReportId: report.id, formFieldId: fMap['suspected24h'], value: String(dataSnapshot.suspected24h) },
        { modernReportId: report.id, formFieldId: fMap['admitted24h'], value: String(dataSnapshot.admitted24h) },
        { modernReportId: report.id, formFieldId: fMap['discharged24h'], value: String(dataSnapshot.discharged24h) },
        { modernReportId: report.id, formFieldId: fMap['suspectedDeath24h'], value: String(dataSnapshot.suspectedDeath24h) },
        { modernReportId: report.id, formFieldId: fMap['confirmed24h'], value: String(dataSnapshot.confirmed24h) },
        { modernReportId: report.id, formFieldId: fMap['confirmedDeath24h'], value: String(dataSnapshot.confirmedDeath24h) },
      ].filter(fv => fv.formFieldId);

      await prisma.reportFieldValue.createMany({ data: fieldValues });

      await prisma.dailyReport.create({
        data: {
          outbreakId,
          facilityId: facility.id,
          userId: user.id,
          reportingDate: reportDate,
          ...dataSnapshot,
          published: true
        }
      });
      successCount++;
    } catch (err) {
      console.error(`Error with ${facility.facilityName}:`, err);
    }
  }

  console.log(`\nResults: ${successCount} reports created.`);
  
  if (collateralInfo.length > 0) {
    console.log(`\nCollisions (Duplicates resolved): ${collateralInfo.length}`);
    collateralInfo.forEach(c => console.log(` - ${c}`));
  }

  if (missingFacilities.size > 0) {
    console.log(`\nUnmatched facilities (${missingFacilities.size}):`);
    console.log(Array.from(missingFacilities).join(', '));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
