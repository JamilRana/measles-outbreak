import { PrismaClient, ReportStatus } from '@prisma/client';

const prisma = new PrismaClient();

const rawText = `
	Division	District	Facility	সন্দেহজনক রোগীর সংখ্যা	হাসপাতালে ভর্তির সংখ্যা 	হাসপাতাল  হতে ছুটি পাওয়ার সংখ্যা	সন্দেহজনক মৃত্যুর সংখ্যা	নিশ্চিত রোগীর সংখ্যা	নিশ্চিত হামে মৃত্যুর সংখ্যা
4/7/2026	Barisal	Barguna	Civil Surgeon Office	184	166	129	0	35	3
		Barisal	Civil Surgeon office	91	26	9	0	4	0
		BHOLA	Civil Surgeon Office	67	43	30	0	8	2
		Jhalkathi 	Civil Surgeon Office	37	13	5	2	8	0
		Patuakhali 	Civil Surgeon Office	183	168	101	0	9	0
		Pirojpur 	Civil Surgeon Office	66	22	14	0	4	0
	Chattogram	Bandarban 	Civil Surgeon Office	13	13	10	0	1	0
		Brahmanbaria	Civil Surgeon Office	66	66	34	0	11	0
		Chandpur 	Civil Surgeon Office	195	71	51	0	33	3
		Chattogram	Civil Surgeon Office	251	180	98	1	18	0
		Coxsbazar	Civil Surgeon Office	220	210	159	5	34	0
		Cumilla	Civil Surgeon Office	356	143	84	3	27	0
		Feni	Civil Surgeon Office	78	33	20	0	2	0
		Khagrachari	Civil Surgeon Office	12	12	11	0	0	0
		Lakshmipur	Civil Surgeon Office	76	71	46	1	4	0
		Noakhali 	Civil Surgeon Office	132	132	83	0	6	0
		Rangamati	Civil Surgeon Office	16	5	5	0	0	0
	Dhaka	Dhaka	Ad-din Medical College Hospital, Moghbazar, Dhaka-1217	0	23	18	0	0	0
			Aichi Hospital Ltd.	1	5	2	0	0	0
			AMZ Hospital Ltd.	2	1	0	0	0	0
			Anwer Khan Modern Medical College Hospital	0	0	1	0	6	0
			Asgar Ali Hospital	0	0	0	0	0	0
			Bangladesh medical University 	10	10	3	0	10	0
			Bangladesh Shishu Hospital & Institute	209	209	148	4	35	0
			Bangladesh Specialized Hospital PLC	1	1	0	0	1	0
			BIHS General Hospital	1	1	0	0	0	0
			Birdem 2	7	7	5	1	1	0
			BRB Hospital Ltd	10	2	7	0	0	0
			Civil Surgeon Office	133	75	54	0	30	0
			Continental Hospital 	7	7	4	0	0	0
			Crescent Gastroliver & General Hospital Ltd.	0	0	0	0	0	0
			Dhaka Central International Medical College & Hospital 	3	3	2	0	1	0
			Dhaka Community Hospital	14	7	1	0	14	0
			Dhaka Community Medical College Hospital	50	39	34	0	39	0
			Dhaka medical College hospital 	14	14	0	1	14	3
			DNCC Dedicated Covid-19 Hospital, Mohakhali, Dhaka	1,087	709	433	3	150	1
			Dr. M R Khan shishu Hospital & Institute of Child Health, Mirpur-2, Dhaka	138	74	24	1	138	1
			Dr. Sirajul Islam Medical College & Hospital Ltd.	3	1	0	0	10	0
			Enam Medical College & Hospital	0	23	9	0	18	0
			Evercare Hospital Dhaka	8	8	13	0	10	0
			EXIM Bank Hospital 	0	0	0	0	0	0
			Hi-Care General Hospital Ltd.	1	1	1	0	1	0
			Holy Family Red Crescent Medical College Hopital	0	0	5	0	10	0
			Ibn Sina Hospital	0	0	0	0	0	0
			Infectious Diseases Hospital, Mohakhali, Dhaka-1212	745	629	634	28	180	1
			Insaf Barakah Kidney & General Hospital	2	2	2	2	2	0
			Japan Bangladesh Friendship  Hospital Ltd.	0	0	0	0	0	0
			Khidmah Hospital (Pvt.) Ltd.	0	0	0	0	0	0
			Kurmitola General Hospital	23	16	9	1	0	0
			Kuwait Bangladesh Friendship Govt. Hospital	7	7	1	0	0	0
			Labaid Hospital 	1	1	0	0	1	0
			Millennium Specialized Hospital Ltd.	2	8	6	0	6	0
			Mugda Medical College Hospital, Dhaka	81	81	42	1	0	0
			National Institute of Traumatology and Orthopaedic Rehabilitation (NITOR)	0	0	0	0	0	0
			Popular Medical College And Hospital Ltd. 	0	0	0	0	1	0
			Shaheed Monsur Ali Medical College Hospital	0	4	2	0	0	0
			Shaheed Suhrawardy Medical College Hospital	280	252	152	3	31	0
			Sir Salimullah Medical College mitford Hospital Dhaka	30	18	18	0	0	0
			Square Hospital LTD	0	0	0	0	0	0
			United Medical College Hospital	1	1	2	0	2	0
			Universal medical college hospital 	2	2	3	0	7	1
			Uttara Crescent Hospital 	0	0	0	0	0	0
			Z H Sikder Women's Medical College & Hospital (pvt) Ltd., Gulshan.	0	0	0	0	0	0
		Faridpur 	Civil Surgeon Office	152	42	67	1	4	0
		Gazipur	Civil Surgeon Office	133	111	80	0	16	0
		GOPALGANJ 	Civil Surgeon Office	154	116	61	1	8	0
		Kishoreganj 	Civil Surgeon Office	146	46	14	0	16	1
		Madaripur	Civil Surgeon Office	85	63	43	1	15	0
		Manikganj	Civil Surgeon Office	105	60	30	0	3	0
		Munshiganj 	Civil Surgeon Office	73	16	11	0	26	0
		Narayanganj 	Civil Surgeon Office	56	38	12	0	0	0
		Narsingdi	Civil Surgeon Office	104	51	34	0	14	0
		Rajbari 	Civil Surgeon Office	52	27	24	0	3	0
		Shariatpur 	Civil Surgeon Office	96	28	15	1	13	1
		Tangail	Civil Surgeon Office	133	107	66	2	12	0
	Khulna	Bagerhat 	Civil Surgeon Office	12	11	1	0	0	0
		Chuadanga	Civil Surgeon Office	7	0	1	0	0	0
		jashore	Civil Surgeon Office	175	57	25	0	23	0
		Jhenaidah 	Civil Surgeon Office	31	31	9	0	7	0
		Khulna	Civil Surgeon Office	62	62	50	0	6	0
		Kushtia	Civil Surgeon Office	281	281	172	6	1	0
		Magura	Civil Surgeon Office	140	98	14	0	8	0
		Meherpur	Civil Surgeon Office	55	46	24	0	0	0
		Narail	Civil Surgeon Office	21	17	9	0	4	0
		Satkhira	Civil Surgeon Office	40	40	20	0	0	0
	Mymensingh	Jamalpur 	Civil Surgeon Office	35	35	15	0	0	1
		Mymensingh	Civil Surgeon Office	47	2	0	0	7	0
		Netrokona	Civil Surgeon Office	135	52	24	0	10	1
		Sherpur 	Civil Surgeon Office	42	19	10	0	0	0
	Rajshahi	Bogura	Civil Surgeon Office	117	54	28	2	2	0
		Chapainawabganj	Civil Surgeon Office	462	462	387	6	38	0
		Joypurhat 	Civil Surgeon Office	74	27	14	0	3	0
		Naogaon	Civil Surgeon Office	160	21	8	1	10	0
		Natore	Civil Surgeon Office	118	86	43	0	14	0
		Pabna	Civil Surgeon Office	252	252	208	6	65	2
		Rajshahi	Civil Surgeon Office	91	17	10	0	18	0
			Rajshahi Medical College Hospital	429	429	263	43	37	0
		Sirajganj	Civil Surgeon Office	47	47	31	0	46	0
	Rangpur	Dinajpur 	Civil Surgeon Office	109	60	56	0	4	0
		Gaibandha	Civil Surgeon Office	57	11	10	0	0	0
		Kurigram 	Civil Surgeon Office	26	24	23	0	1	0
		lalmonirhat	Civil Surgeon Office	21	11	5	0	0	0
		Nilphamari	Civil Surgeon Office	65	9	7	0	2	0
		Panchagarh	Civil Surgeon Office	21	0	0	0	0	0
		Rangpur	Civil Surgeon Office	30	0	0	0	0	0
			Kasir Uddin Hospital  & Diagnostic Center	0	0	0	0	0	0
		Thakurgaon	Civil Surgeon Office	50	15	8	0	3	0
	Sylhet	Habiganj	Civil Surgeon Office	58	46	34	0	6	0
		Moulvibazar	Civil Surgeon Office	108	43	24	0	10	0
		Sunamganj 	Civil Surgeon Office	138	73	41	0	11	0
		Sylhet 	Civil Surgeon Office	162	125	80	1	10	0
`;

const districtMap: { [key: string]: string } = {
  'jhalkathi': 'Jhalokati',
  'coxsbazar': "Cox's Bazar",
  'khagrachari': 'Khagrachhari',
  'lalmonirhat': 'Lalmonirhat',
  'jashore': 'Jashore',
};

async function main() {
  console.log('Cleaning up old reports as requested...');
  const outbreakId = 'measles-2026';
  
  // Clear all existing report data for this outbreak
  await prisma.reportFieldValue.deleteMany({
    where: {
      OR: [
        { report: { outbreakId } },
        { dailyReport: { outbreakId } }
      ]
    }
  });
  await prisma.report.deleteMany({ where: { outbreakId } });
  await prisma.dailyReport.deleteMany({ where: { outbreakId } });
  
  console.log('Old reports dropped.');

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('Admin user not found');

  const facilities = await prisma.facility.findMany();
  const formFields = await prisma.formField.findMany({ where: { outbreakId } });
  const fMap: any = {};
  formFields.forEach(f => fMap[f.fieldKey] = f.id);

  // Parsing logic
  const lines = rawText.split('\n').filter(l => l.trim() !== '');
  // Skip header
  const dataLines = lines.slice(1);

  let currentDivision = '';
  let currentDistrict = '';
  let currentDate = '2026-04-07'; // Forced to April 7th as per user request

  const items: any[] = [];

  for (const line of dataLines) {
    const parts = line.split('\t').map(p => p.trim());
    
    // We ignore the date column in the input and use the forced April 7th date
    if (parts[1]) currentDivision = parts[1];
    if (parts[2]) currentDistrict = parts[2];
    
    const facilityName = parts[3];
    const s = parseInt(parts[4]?.replace(/,/g, '') || '0');
    const a = parseInt(parts[5]?.replace(/,/g, '') || '0');
    const d = parseInt(parts[6]?.replace(/,/g, '') || '0');
    const sd = parseInt(parts[7]?.replace(/,/g, '') || '0');
    const c = parseInt(parts[8]?.replace(/,/g, '') || '0');
    const cd = parseInt(parts[9]?.replace(/,/g, '') || '0');

    if (!facilityName) continue;

    items.push({
        date: currentDate,
        division: currentDivision,
        district: currentDistrict,
        facility: facilityName,
        s, a, d, sd, c, cd
    });
  }

  console.log(`Parsed ${items.length} records.`);

  const reportDate = new Date(currentDate);
  reportDate.setHours(12, 0, 0, 0);

  const entriesToCreate: any[] = [];

  for (const item of items) {
    const normalizedDist = districtMap[item.district.toLowerCase().trim()] || item.district.trim();
    
    let facility = facilities.find(f => {
        const nameMatch = f.facilityName.toLowerCase().includes(item.facility.toLowerCase()) || 
                          item.facility.toLowerCase().includes(f.facilityName.toLowerCase());
        const distMatch = f.district.toLowerCase() === normalizedDist.toLowerCase();
        return nameMatch && distMatch;
    });

    // Fallback for Civil Surgeon Office
    if (!facility && item.facility.toLowerCase().includes('civil surgeon')) {
        facility = facilities.find(f => 
            f.district.toLowerCase() === normalizedDist.toLowerCase() && 
            f.facilityName.toLowerCase().includes('civil surgeon')
        );
    }
    
    // Last resort for Dhaka hospitals
    if (!facility && normalizedDist.toLowerCase() === 'dhaka') {
        const keywords = item.facility.split(' ').filter((w: string) => w.length > 3);
        facility = facilities.find(f => 
            f.district.toLowerCase() === 'dhaka' && 
            keywords.some((k: string) => f.facilityName.toLowerCase().includes(k.toLowerCase()))
        );
    }

    if (!facility) {
        // If still not found, especially for Dhaka, we might need to create it or skip.
        // For this task, let's create a placeholder if it's a major hospital.
        if (normalizedDist.toLowerCase() === 'dhaka' || item.facility.toLowerCase().includes('hospital')) {
            console.log(`Creating missing facility: ${normalizedDist} | ${item.facility}`);
            const type = await prisma.facilityType.findFirst({ where: { slug: 'private-hospital' } });
            facility = await prisma.facility.create({
                data: {
                    facilityCode: 'TEMP_' + Math.random().toString(36).substring(7),
                    facilityName: item.facility,
                    division: item.division,
                    district: normalizedDist,
                    facilityTypeId: type?.id
                }
            });
            facilities.push(facility); // Add to local list for next iterations
        } else {
            console.warn(`Could not find facility: ${normalizedDist} | ${item.facility}. Skipping.`);
            continue;
        }
    }

    entriesToCreate.push({
        facility,
        data: item,
        reportDate
    });
  }

  console.log(`Matched ${entriesToCreate.length} facilities. Aggregating data...`);

  const aggregatedEntries = new Map<string, { facility: any, data: any, reportDate: Date }>();

  for (const entry of entriesToCreate) {
    const fid = entry.facility.id;
    if (aggregatedEntries.has(fid)) {
        const existing = aggregatedEntries.get(fid)!;
        existing.data.s += entry.data.s;
        existing.data.a += entry.data.a;
        existing.data.d += entry.data.d;
        existing.data.sd += entry.data.sd;
        existing.data.c += entry.data.c;
        existing.data.cd += entry.data.cd;
    } else {
        aggregatedEntries.set(fid, entry);
    }
  }

  console.log(`Aggregated into ${aggregatedEntries.size} unique reports. Starting insertion...`);

  const fieldValuesData: any[] = [];

  for (const entry of aggregatedEntries.values()) {
    const { facility, data, reportDate } = entry;
    
    const report = await prisma.report.create({
        data: {
            outbreakId,
            facilityId: facility.id,
            userId: admin.id,
            periodStart: reportDate,
            periodEnd: reportDate,
            status: ReportStatus.PUBLISHED,
            publishedAt: new Date(),
            dataSnapshot: {
                suspected24h: data.s,
                admitted24h: data.a,
                discharged24h: data.d,
                suspectedDeath24h: data.sd,
                confirmed24h: data.c,
                confirmedDeath24h: data.cd
            }
        }
    });

    const dailyReport = await prisma.dailyReport.create({
        data: {
            outbreakId,
            facilityId: facility.id,
            userId: admin.id,
            reportingDate: reportDate,
            published: true,
            suspected24h: data.s,
            admitted24h: data.a,
            discharged24h: data.d,
            suspectedDeath24h: data.sd,
            confirmed24h: data.c,
            confirmedDeath24h: data.cd
        }
    });

    // Prepare field values
    const fields = [
        { key: 'suspected24h', val: data.s },
        { key: 'admitted24h', val: data.a },
        { key: 'discharged24h', val: data.d },
        { key: 'suspectedDeath24h', val: data.sd },
        { key: 'confirmed24h', val: data.c },
        { key: 'confirmedDeath24h', val: data.cd }
    ];

    for (const f of fields) {
        const fieldId = fMap[f.key];
        if (fieldId) {
            fieldValuesData.push({
                modernReportId: report.id,
                formFieldId: fieldId,
                value: String(f.val)
            });
            fieldValuesData.push({
                reportId: dailyReport.id,
                formFieldId: fieldId,
                value: String(f.val)
            });
        }
    }
  }

  console.log(`Inserting ${fieldValuesData.length} field values...`);
  // Bulk insert field values
  await prisma.reportFieldValue.createMany({
    data: fieldValuesData
  });

  console.log('--- DATA REPLACEMENT COMPLETE ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
