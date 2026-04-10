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
