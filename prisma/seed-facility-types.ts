import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * DGHS Standard Facility Types
 * Source: User-provided list (April 2026)
 */
const FACILITY_TYPES = [
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
];

async function main() {
  console.log("🏥 Seeding facility types...");

  for (const ft of FACILITY_TYPES) {
    await prisma.facilityType.upsert({
      where: { slug: ft.slug },
      update: { name: ft.name, tier: ft.tier },
      create: ft,
    });
  }

  console.log(`✅ Upserted ${FACILITY_TYPES.length} facility types`);

  // Back-fill: match existing Facility.facilityType (string) → FacilityType.id
  const allTypes = await prisma.facilityType.findMany();
  const nameMap = new Map(allTypes.map(t => [t.name.toLowerCase(), t.id]));

  const facilitiesWithoutTypeId = await prisma.facility.findMany({
    where: { facilityTypeId: null, facilityType: { not: null } },
  });

  let matched = 0;
  for (const f of facilitiesWithoutTypeId) {
    if (!f.facilityType) continue;
    const typeId = nameMap.get(f.facilityType.toLowerCase());
    if (typeId) {
      await prisma.facility.update({
        where: { id: f.id },
        data: { facilityTypeId: typeId },
      });
      matched++;
    }
  }

  console.log(`🔗 Back-filled ${matched}/${facilitiesWithoutTypeId.length} facilities with facilityTypeId`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
