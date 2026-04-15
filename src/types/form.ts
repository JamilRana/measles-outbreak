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
  isCoreField?: boolean;
  activeFrom?: string;
  activeTo?: string;
  validationRules?: any[];
}
