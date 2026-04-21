const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDhakaDiscrepancy() {
  const dateStr = '2026-04-07';
  const start = new Date(dateStr);
  const end = new Date(start.getTime() + 86400000);

  // 1. Get all facilities in Dhaka
  const dhakaFacilities = await prisma.facility.findMany({
    where: { division: 'Dhaka' },
    select: { id: true, facilityName: true, district: true }
  });
  console.log(`Dhaka division has ${dhakaFacilities.length} facilities.`);

  // 2. Fetch reports from both tables
  const [modern, legacy] = await Promise.all([
    prisma.report.findMany({
      where: { periodStart: { gte: start, lt: end }, facility: { division: 'Dhaka' } },
      select: { facilityId: true, dataSnapshot: true }
    }),
    prisma.dailyReport.findMany({
      where: { reportingDate: { gte: start, lt: end }, facility: { division: 'Dhaka' } },
      select: { facilityId: true, suspected24h: true }
    })
  ]);

  const modMap = new Map();
  modern.forEach(r => modMap.set(r.facilityId, (r.dataSnapshot as any)?.suspected24h || 0));

  const legMap = new Map();
  legacy.forEach(r => legMap.set(r.facilityId, r.suspected24h || 0));

  let totalCase = 0;
  const processedFacilities = new Set();

  console.log('\n--- Facility Analysis ---');
  
  // De-duplication logic similar to API
  const allFacIds = new Set([...modMap.keys(), ...legMap.keys()]);

  allFacIds.forEach(fid => {
    const fromMod = modMap.get(fid) || 0;
    const fromLeg = legMap.get(fid) || 0;
    const chosen = modMap.has(fid) ? fromMod : fromLeg;
    
    totalCase += chosen;
    
    // if (fromMod !== fromLeg && modMap.has(fid) && legMap.has(fid)) {
    //   console.log(`Facility ${fid}: Modern=${fromMod}, Legacy=${fromLeg} -> Chose Modern: ${chosen}`);
    // }
  });

  console.log(`\nDe-duplicated Total Suspected for Dhaka on ${dateStr}: ${totalCase}`);
  
  // If we summed EVERYTHING (including duplicates)
  let bruteSum = 0;
  modMap.forEach(v => bruteSum += v);
  legMap.forEach(v => bruteSum += v);
  console.log(`Brute Sum (All records in both tables): ${bruteSum}`);

  // Check if any modern report fieldValues differ from snapshot again, more specifically
  const detailedModern = await prisma.report.findMany({
    where: { periodStart: { gte: start, lt: end }, facility: { division: 'Dhaka' } },
    include: { fieldValues: { include: { formField: true } } }
  });

  console.log('\n--- Modern Snapshot Sync Check ---');
  detailedModern.forEach(r => {
    const snap = (r.dataSnapshot as any)?.suspected24h || 0;
    const fieldsVal = parseInt(r.fieldValues.find(fv => fv.formField.fieldKey === 'suspected24h')?.value || '0');
    if (snap !== fieldsVal) {
      console.log(`SYNC DISCREPANCY: Report ${r.id} (${r.facilityId}): Snapshot=${snap}, FieldValues=${fieldsVal}`);
    }
  });
}

checkDhakaDiscrepancy().catch(console.error).finally(() => prisma.$disconnect());
