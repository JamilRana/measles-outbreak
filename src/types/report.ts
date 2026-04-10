import { FormField } from './form';
import { Outbreak } from './outbreak';

export interface DailyReport {
  id: string;
  reportingDate: string;
  updatedAt: string;
  suspected24h: number;
  confirmed24h: number;
  suspectedDeath24h: number;
  confirmedDeath24h: number;
  admitted24h: number;
  discharged24h: number;
  serumSent24h: number;
  facility?: {
    facilityName: string;
    division: string;
    district: string;
  };
  outbreak?: {
    name: string;
  };
  fieldValues?: { formFieldId: string; value: string }[];
  [key: string]: any;
}

export interface ExistingReport extends DailyReport {
  facilityId: string;
}
