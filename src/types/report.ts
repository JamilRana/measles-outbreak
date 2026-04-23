export interface Report {
  id: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  facilityId: string;
  userId: string;
  outbreakId: string;
  status: 'SUBMITTED' | 'PUBLISHED' | 'DRAFT';
  isLocked: boolean;
  publishedAt?: string | null;
  dataSnapshot: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  facility?: {
    facilityName: string;
    division: string;
    district: string;
    facilityCode: string;
  };
  user?: {
    name: string;
  };
  fieldValues?: {
    formFieldId: string;
    value: string;
    formField?: {
      fieldKey: string;
      label: string;
    };
  }[];
}

// Helper to access common stats from a report (via snapshot or fieldValues)
export function getReportValue(report: Report, key: string, defaultValue: number = 0): number {
  if (report.dataSnapshot && report.dataSnapshot[key] !== undefined) {
    return Number(report.dataSnapshot[key]);
  }
  const fv = report.fieldValues?.find(v => v.formField?.fieldKey === key);
  return fv ? Number(fv.value) : defaultValue;
}
