import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

/**
 * Dashboard Data Cache Layer
 * 
 * Uses Next.js unstable_cache for in-process caching with tag-based invalidation.
 * No Redis needed — leverages the built-in Next.js data cache.
 * 
 * Cache tags:
 *   - 'dashboard' — global invalidation on any report publish
 *   - 'dashboard-summary-{outbreakId}' — per-outbreak summary
 *   - 'dashboard-timeseries-{outbreakId}' — per-outbreak timeseries
 *   - 'dashboard-config-{outbreakId}' — per-outbreak config (1hr TTL)
 */

// --- Summary Cache (60s TTL) ---
export function getCachedSummary(
  outbreakId: string,
  dateFilter: { date?: string | null; from?: string | null; to?: string | null },
  geoFilter: { division?: string | null; district?: string | null }
) {
  const cacheKey = `summary-${outbreakId}-${dateFilter.date || ''}-${dateFilter.from || ''}-${dateFilter.to || ''}-${geoFilter.division || ''}-${geoFilter.district || ''}`;

  return unstable_cache(
    async () => {
      const vDate = dateFilter.date || null;
      const vFrom = dateFilter.from || null;
      const vTo = dateFilter.to || null;
      const division = geoFilter.division || '';
      const district = geoFilter.district || '';

      const totalsResult: any[] = await prisma.$queryRaw`
        SELECT
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspected24h', '')::numeric, 0)), 0) AS "suspected24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmed24h', '')::numeric, 0)), 0) AS "confirmed24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'admitted24h', '')::numeric, 0)), 0) AS "admitted24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'discharged24h', '')::numeric, 0)), 0) AS "discharged24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmedDeath24h', '')::numeric, 0)), 0) AS "confirmedDeath24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspectedDeath24h', '')::numeric, 0)), 0) AS "suspectedDeath24h",
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'serumSent24h', '')::numeric, 0)), 0) AS "serumSent24h",
          COUNT(r.id)::int AS "reportCount"
        FROM "Report" r
        JOIN "Facility" f ON f.id = r."facilityId"
        WHERE r."outbreakId" = ${outbreakId}
          AND r.status = 'PUBLISHED'
          AND (${vDate}::text IS NULL OR r."periodStart"::date = ${vDate}::date)
          AND (${vFrom}::text IS NULL OR r."periodStart"::date >= ${vFrom}::date)
          AND (${vTo}::text IS NULL OR r."periodStart"::date <= ${vTo}::date)
          AND (${division}::text = '' OR f.division = ${division})
          AND (${district}::text = '' OR f.district = ${district})
      `;

      const t = totalsResult[0] || {};
      return {
        suspected24h: Number(t.suspected24h) || 0,
        confirmed24h: Number(t.confirmed24h) || 0,
        admitted24h: Number(t.admitted24h) || 0,
        discharged24h: Number(t.discharged24h) || 0,
        confirmedDeath24h: Number(t.confirmedDeath24h) || 0,
        suspectedDeath24h: Number(t.suspectedDeath24h) || 0,
        serumSent24h: Number(t.serumSent24h) || 0,
        reportCount: Number(t.reportCount) || 0,
      };
    },
    [cacheKey],
    { revalidate: 60, tags: ['dashboard', `dashboard-summary-${outbreakId}`] }
  )();
}

// --- Timeseries Cache (5 min TTL) ---
export function getCachedTimeseries(
  outbreakId: string,
  days: number,
  geoFilter: { division?: string | null; district?: string | null }
) {
  const cacheKey = `timeseries-${outbreakId}-${days}-${geoFilter.division || ''}-${geoFilter.district || ''}`;

  return unstable_cache(
    async () => {
      const division = geoFilter.division || '';
      const district = geoFilter.district || '';

      const result: any[] = await prisma.$queryRaw`
        SELECT
          r."periodStart"::date AS date,
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspected24h', '')::numeric, 0)), 0) AS suspected,
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmed24h', '')::numeric, 0)), 0) AS confirmed,
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'confirmedDeath24h', '')::numeric, 0)), 0) +
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'suspectedDeath24h', '')::numeric, 0)), 0) AS deaths,
          COALESCE(SUM(COALESCE(NULLIF(r."dataSnapshot"->>'admitted24h', '')::numeric, 0)), 0) AS hospitalized
        FROM "Report" r
        JOIN "Facility" f ON f.id = r."facilityId"
        WHERE r."outbreakId" = ${outbreakId}
          AND r.status = 'PUBLISHED'
          AND r."periodStart" >= NOW() - INTERVAL '1 day' * ${days}
          AND (${division}::text = '' OR f.division = ${division})
          AND (${district}::text = '' OR f.district = ${district})
        GROUP BY r."periodStart"::date
        ORDER BY date ASC
      `;

      return result.map(row => ({
        date: row.date instanceof Date ? row.date.toISOString().split("T")[0] : String(row.date),
        suspected: Number(row.suspected) || 0,
        confirmed: Number(row.confirmed) || 0,
        deaths: Number(row.deaths) || 0,
        hospitalized: Number(row.hospitalized) || 0,
      }));
    },
    [cacheKey],
    { revalidate: 300, tags: ['dashboard', `dashboard-timeseries-${outbreakId}`] }
  )();
}

// --- Config Cache (1 hour TTL) ---
export function getCachedDashboardConfig(outbreakId: string) {
  return unstable_cache(
    async () => {
      const [outbreak, coreFields, indicators, settings] = await Promise.all([
        prisma.outbreak.findUnique({
          where: { id: outbreakId },
          include: { disease: { select: { name: true, code: true } } }
        }),
        prisma.formField.findMany({
          where: { outbreakId, isCoreField: true },
          orderBy: { sortOrder: 'asc' }
        }),
        prisma.indicator.findMany({ where: { isActive: true } }),
        prisma.settings.findFirst(),
      ]);

      return {
        outbreak,
        kpiFields: coreFields.map(f => ({
          id: f.id,
          fieldKey: f.fieldKey,
          label: f.label,
          labelBn: f.labelBn,
          section: f.section,
          fieldType: f.fieldType,
        })),
        indicators: indicators.map(i => ({
          id: i.id,
          name: i.name,
          numeratorKey: i.numeratorKey,
          denominatorKey: i.denominatorKey,
          multiplier: i.multiplier,
          unit: i.unit,
        })),
        settings: settings ? {
          enablePublicView: settings.enablePublicView,
          defaultOutbreakId: settings.defaultOutbreakId,
        } : null,
      };
    },
    [`dashboard-config-${outbreakId}`],
    { revalidate: 3600, tags: ['dashboard-config', `dashboard-config-${outbreakId}`] }
  )();
}
