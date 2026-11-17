import { prisma } from './lib/prisma';

async function main() {
  const outbreakId = 'measles-2026';
  const date = '2026-04-10';

  const breakdownResult: any[] = await prisma.$queryRaw`
    SELECT
      f.division AS "groupKey",
      COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspected24h', '')::numeric, 0)), 0) AS "suspected24h",
      COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspectedDeath24h', '')::numeric, 0)), 0) AS "suspectedDeath24h",
      COUNT(r.id)::int AS "reportCount"
    FROM "Report" r
    JOIN "Facility" f ON f.id = r."facilityId"
    WHERE r."outbreakId" = ${outbreakId}
      AND r.status = 'PUBLISHED'
      AND r."periodStart"::date = ${new Date(date)}::date
    GROUP BY f.division
    ORDER BY "suspectedDeath24h" DESC
  `;
  console.log('Divisions sorted by suspected deaths on 2026-04-10:', breakdownResult);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
