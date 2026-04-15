/**
 * Validation Engine — shared between client (form UI) and server (API).
 *
 * Rules are stored as JSON in FormField.validationRules.
 * Each rule is a ValidationRule object.
 * The engine evaluates rules against the full set of form values so
 * cross-field rules (e.g. confirmed ≤ suspected) work correctly.
 */

// Stub for backward compatibility
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ─── Rule type registry ──────────────────────────────────────────────────────

export type ValidationRuleType =
  // Number rules
  | "min"           // value >= min
  | "max"           // value <= max
  | "integer"       // value is whole number
  | "positive"      // value > 0
  // Text / general rules
  | "exactLength"   // length === value
  | "minLength"     // length >= value
  | "maxLength"     // length <= value
  | "regex"         // value matches pattern
  | "phone"         // exactly 11 digits (BD phone)
  | "email"         // valid email format
  // Date rules
  | "dateGte"       // this date >= compareToField date
  | "dateLte"       // this date <= compareToField date
  | "dateGteToday"  // this date >= today
  | "dateLteToday"  // this date <= today
  // Cross-field numeric rules
  | "gte"           // this value >= compareToField value
  | "lte"           // this value <= compareToField value
  | "sumLte"        // this value + compareToField <= limitValue
  // Conditional
  | "requiredIf"    // required when compareToField equals compareValue

export interface ValidationRule {
  type: ValidationRuleType
  value?: number | string        // for scalar comparisons (min, max, exactLength, regex)
  compareToField?: string        // fieldKey of the other field for cross-field rules
  compareValue?: string          // for requiredIf: the trigger value
  message?: string               // custom error message (falls back to default)
  severity?: "error" | "warning" // warning = show but don't block submit
}

export interface ValidationResult {
  fieldKey: string
  rule: ValidationRule
  message: string
  severity: "error" | "warning"
}

// ─── Default messages ────────────────────────────────────────────────────────

function defaultMessage(rule: ValidationRule, fieldLabel: string, compareLabel?: string): string {
  const c = compareLabel ?? rule.compareToField ?? "another field"
  switch (rule.type) {
    case "min":         return `${fieldLabel} must be at least ${rule.value}`
    case "max":         return `${fieldLabel} must be at most ${rule.value}`
    case "integer":     return `${fieldLabel} must be a whole number`
    case "positive":    return `${fieldLabel} must be greater than zero`
    case "exactLength": return `${fieldLabel} must be exactly ${rule.value} characters`
    case "minLength":   return `${fieldLabel} must be at least ${rule.value} characters`
    case "maxLength":   return `${fieldLabel} must be at most ${rule.value} characters`
    case "regex":       return `${fieldLabel} format is invalid`
    case "phone":       return `${fieldLabel} must be exactly 11 digits`
    case "email":       return `${fieldLabel} must be a valid email address`
    case "dateGte":     return `${fieldLabel} cannot be before ${c}`
    case "dateLte":     return `${fieldLabel} cannot be after ${c}`
    case "dateGteToday":return `${fieldLabel} cannot be in the past`
    case "dateLteToday":return `${fieldLabel} cannot be in the future`
    case "gte":         return `${fieldLabel} must be greater than or equal to ${c}`
    case "lte":         return `${fieldLabel} cannot exceed ${c}`
    case "sumLte":      return `${fieldLabel} plus ${c} cannot exceed ${rule.value}`
    case "requiredIf":  return `${fieldLabel} is required when ${c} is "${rule.compareValue}"`
    default:            return `${fieldLabel} is invalid`
  }
}

// ─── Single rule evaluator ───────────────────────────────────────────────────

/**
 * Evaluates one rule for one field.
 * Returns null if the rule passes, or a ValidationResult if it fails.
 *
 * @param rule      The rule to evaluate
 * @param fieldKey  The fieldKey of the field being validated
 * @param rawValue  The raw string value of the field
 * @param allValues Map of fieldKey → raw string value (for cross-field rules)
 * @param fieldLabels Map of fieldKey → display label (for error messages)
 */
export function evaluateRule(
  rule: ValidationRule,
  fieldKey: string,
  rawValue: string,
  allValues: Record<string, string>,
  fieldLabels: Record<string, string>
): ValidationResult | null {
  const label = fieldLabels[fieldKey] ?? fieldKey
  const compareLabel = rule.compareToField ? fieldLabels[rule.compareToField] : undefined
  const message = rule.message ?? defaultMessage(rule, label, compareLabel)
  const severity = rule.severity ?? "error"

  const fail = (): ValidationResult => ({ fieldKey, rule, message, severity })

  const numVal = parseFloat(rawValue)
  const isEmpty = rawValue === "" || rawValue === null || rawValue === undefined

  switch (rule.type) {

    // ── Number ──
    case "min": {
      if (isEmpty) return null // isRequired handles empty separately
      if (isNaN(numVal) || numVal < Number(rule.value)) return fail()
      return null
    }
    case "max": {
      if (isEmpty) return null
      if (isNaN(numVal) || numVal > Number(rule.value)) return fail()
      return null
    }
    case "integer": {
      if (isEmpty) return null
      if (!Number.isInteger(Number(rawValue))) return fail()
      return null
    }
    case "positive": {
      if (isEmpty) return null
      if (isNaN(numVal) || numVal <= 0) return fail()
      return null
    }

    // ── Text ──
    case "exactLength": {
      if (isEmpty) return null
      if (rawValue.length !== Number(rule.value)) return fail()
      return null
    }
    case "minLength": {
      if (isEmpty) return null
      if (rawValue.length < Number(rule.value)) return fail()
      return null
    }
    case "maxLength": {
      if (isEmpty) return null
      if (rawValue.length > Number(rule.value)) return fail()
      return null
    }
    case "regex": {
      if (isEmpty) return null
      try {
        const pattern = new RegExp(String(rule.value))
        if (!pattern.test(rawValue)) return fail()
      } catch { return fail() }
      return null
    }
    case "phone": {
      if (isEmpty) return null
      if (!/^\d{11}$/.test(rawValue.replace(/\s/g, ""))) return fail()
      return null
    }
    case "email": {
      if (isEmpty) return null
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue)) return fail()
      return null
    }

    // ── Date ──
    case "dateGte": {
      if (isEmpty || !rule.compareToField) return null
      const compareRaw = allValues[rule.compareToField]
      if (!compareRaw) return null
      if (new Date(rawValue) < new Date(compareRaw)) return fail()
      return null
    }
    case "dateLte": {
      if (isEmpty || !rule.compareToField) return null
      const compareRaw = allValues[rule.compareToField]
      if (!compareRaw) return null
      if (new Date(rawValue) > new Date(compareRaw)) return fail()
      return null
    }
    case "dateGteToday": {
      if (isEmpty) return null
      if (new Date(rawValue) < new Date(new Date().toDateString())) return fail()
      return null
    }
    case "dateLteToday": {
      if (isEmpty) return null
      if (new Date(rawValue) > new Date(new Date().toDateString())) return fail()
      return null
    }

    // ── Cross-field numeric ──
    case "gte": {
      if (isEmpty || !rule.compareToField) return null
      const compareRaw = allValues[rule.compareToField]
      if (!compareRaw) return null
      if (isNaN(numVal) || numVal < parseFloat(compareRaw)) return fail()
      return null
    }
    case "lte": {
      if (isEmpty || !rule.compareToField) return null
      const compareRaw = allValues[rule.compareToField]
      if (!compareRaw) return null
      if (isNaN(numVal) || numVal > parseFloat(compareRaw)) return fail()
      return null
    }
    case "sumLte": {
      if (isEmpty || !rule.compareToField) return null
      const compareRaw = allValues[rule.compareToField]
      if (!compareRaw) return null
      const sum = numVal + parseFloat(compareRaw)
      if (isNaN(sum) || sum > Number(rule.value)) return fail()
      return null
    }

    // ── Conditional ──
    case "requiredIf": {
      if (!rule.compareToField) return null
      const triggerVal = allValues[rule.compareToField]
      if (triggerVal === rule.compareValue && isEmpty) return fail()
      return null
    }

    default:
      return null
  }
}

// ─── Full form validator ─────────────────────────────────────────────────────

export interface FormFieldWithRules {
  fieldKey: string
  label: string
  isRequired: boolean
  validationRules: ValidationRule[]
}

/**
 * Validates all fields in a form submission.
 * Returns array of failures (empty = all good).
 */
export function validateForm(
  fields: FormFieldWithRules[],
  values: Record<string, string>  // fieldKey → raw string value
): ValidationResult[] {
  const results: ValidationResult[] = []

  const fieldLabels: Record<string, string> = {}
  for (const f of fields) fieldLabels[f.fieldKey] = f.label

  for (const field of fields) {
    const rawValue = values[field.fieldKey] ?? ""

    // 1. isRequired check
    if (field.isRequired && (rawValue === "" || rawValue === null || rawValue === undefined)) {
      results.push({
        fieldKey: field.fieldKey,
        rule: { type: "min", message: `${field.label} is required` },
        message: `${field.label} is required`,
        severity: "error",
      })
      continue // skip further rules if empty and required
    }

    // 2. Custom validation rules
    for (const rule of (field.validationRules ?? [])) {
      const result = evaluateRule(rule, field.fieldKey, rawValue, values, fieldLabels)
      if (result) results.push(result)
    }
  }

  return results
}

// ─── Rule metadata (used by the builder UI) ──────────────────────────────────

export interface RuleMeta {
  type: ValidationRuleType
  label: string
  description: string
  appliesToTypes: ("NUMBER" | "TEXT" | "DATE" | "SELECT" | "BOOLEAN" | "ALL")[]
  hasValue: boolean        // needs a scalar `value` input
  hasCompareToField: boolean // needs a fieldKey selector
  hasCompareValue: boolean   // needs a string match value
  valueLabel?: string
  valueType?: "number" | "text" | "regex"
}

export const RULE_META: RuleMeta[] = [
  // Number
  { type: "min",         label: "Minimum value",      description: "Value must be ≥ this number",              appliesToTypes: ["NUMBER"],                    hasValue: true,  hasCompareToField: false, hasCompareValue: false, valueLabel: "Min value",  valueType: "number" },
  { type: "max",         label: "Maximum value",      description: "Value must be ≤ this number",              appliesToTypes: ["NUMBER"],                    hasValue: true,  hasCompareToField: false, hasCompareValue: false, valueLabel: "Max value",  valueType: "number" },
  { type: "integer",     label: "Whole number only",  description: "Decimals not allowed",                     appliesToTypes: ["NUMBER"],                    hasValue: false, hasCompareToField: false, hasCompareValue: false },
  { type: "positive",    label: "Must be positive",   description: "Value must be > 0",                        appliesToTypes: ["NUMBER"],                    hasValue: false, hasCompareToField: false, hasCompareValue: false },
  // Text
  { type: "phone",       label: "BD phone number",    description: "Exactly 11 digits (01X-XXXXXXXX)",         appliesToTypes: ["TEXT"],                      hasValue: false, hasCompareToField: false, hasCompareValue: false },
  { type: "email",       label: "Email address",      description: "Must be a valid email",                    appliesToTypes: ["TEXT"],                      hasValue: false, hasCompareToField: false, hasCompareValue: false },
  { type: "exactLength", label: "Exact length",       description: "Value must be exactly N characters",       appliesToTypes: ["TEXT"],                      hasValue: true,  hasCompareToField: false, hasCompareValue: false, valueLabel: "Length",     valueType: "number" },
  { type: "minLength",   label: "Minimum length",     description: "Must be at least N characters",            appliesToTypes: ["TEXT"],                      hasValue: true,  hasCompareToField: false, hasCompareValue: false, valueLabel: "Min chars",  valueType: "number" },
  { type: "maxLength",   label: "Maximum length",     description: "Cannot exceed N characters",               appliesToTypes: ["TEXT"],                      hasValue: true,  hasCompareToField: false, hasCompareValue: false, valueLabel: "Max chars",  valueType: "number" },
  { type: "regex",       label: "Pattern (regex)",    description: "Value must match regular expression",      appliesToTypes: ["TEXT"],                      hasValue: true,  hasCompareToField: false, hasCompareValue: false, valueLabel: "Pattern",    valueType: "regex" },
  // Date
  { type: "dateLteToday",label: "Cannot be future",  description: "Date must be today or in the past",        appliesToTypes: ["DATE"],                      hasValue: false, hasCompareToField: false, hasCompareValue: false },
  { type: "dateGteToday",label: "Cannot be past",    description: "Date must be today or in the future",      appliesToTypes: ["DATE"],                      hasValue: false, hasCompareToField: false, hasCompareValue: false },
  { type: "dateGte",     label: "Not before field",  description: "This date must be ≥ another field's date", appliesToTypes: ["DATE"],                      hasValue: false, hasCompareToField: true,  hasCompareValue: false, valueLabel: "Compare to" },
  { type: "dateLte",     label: "Not after field",   description: "This date must be ≤ another field's date", appliesToTypes: ["DATE"],                      hasValue: false, hasCompareToField: true,  hasCompareValue: false, valueLabel: "Compare to" },
  // Cross-field numeric
  { type: "lte",         label: "Cannot exceed field","description": "This value must be ≤ another field",    appliesToTypes: ["NUMBER"],                    hasValue: false, hasCompareToField: true,  hasCompareValue: false },
  { type: "gte",         label: "Must exceed field",  description: "This value must be ≥ another field",      appliesToTypes: ["NUMBER"],                    hasValue: false, hasCompareToField: true,  hasCompareValue: false },
  // Conditional
  { type: "requiredIf",  label: "Required when",      description: "Becomes required if another field = value",appliesToTypes: ["NUMBER","TEXT","DATE","SELECT","BOOLEAN"], hasValue: false, hasCompareToField: true, hasCompareValue: true },
]

export function rulesForFieldType(fieldType: string): RuleMeta[] {
  return RULE_META.filter(r =>
    r.appliesToTypes.includes("ALL") || r.appliesToTypes.includes(fieldType as any)
  )
}