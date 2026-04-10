export interface CutoffSettings {
  cutoffHour: number;
  cutoffMinute: number;
  editDeadlineHour: number;
  editDeadlineMinute: number;
  allowBacklogReporting: boolean;
  backlogStartDate: string | null;
  backlogEndDate: string | null;
}

export interface Outbreak {
  id: string;
  name: string;
  disease: { name: string; code: string };
}

export interface FormField {
  id: string;
  label: string;
  labelBn?: string;
  fieldKey: string;
  fieldType: string;
  options?: string;
  section?: string;
  isRequired: boolean;
  sortOrder: number;
}

export interface ExistingReport {
  id: string;
  facilityId: string;
  fieldValues: { formFieldId: string; value: string }[];
  [key: string]: any;
}

export interface DynamicInputProps {
  field: FormField;
  value: string;
  onChange: (name: string, value: string) => void;
  disabled: boolean;
  readOnly: boolean;
  t: any;
}
