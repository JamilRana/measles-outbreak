import { Prisma } from "@prisma/client";

/**
 * rebuildSnapshot
 * 
 * Rebuilds the dataSnapshot JSONB cache for a given report.
 * It fetches all current ReportFieldValue records for this report 
 * and maps their values to field keys based on the FormField definition.
 */
export async function rebuildSnapshot(reportId: string, tx: any) {
  const values = await tx.reportFieldValue.findMany({
    where: { reportId: reportId },
    include: { formField: true }
  });

  const snapshot: Record<string, any> = {};
  for (const v of values) {
    if (v.formField) {
      snapshot[v.formField.fieldKey] = v.formField.fieldType === 'NUMBER' 
        ? Number(v.value) : v.value;
    }
  }

  return snapshot;
}
