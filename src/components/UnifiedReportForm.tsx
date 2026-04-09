"use client";

import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  Info,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface FormField {
  id: string;
  label: string;
  labelBn: string | null;
  fieldKey: string;
  fieldType: 'NUMBER' | 'TEXT' | 'SELECT' | 'DATE' | 'BOOLEAN';
  isRequired: boolean;
  section: string | null;
  options?: string;
}

interface UnifiedReportFormProps {
  outbreakId: string;
  facilityId?: string;
  facilityCode?: string;
  initialData?: any;
  mode?: 'CREATE' | 'EDIT' | 'VIEW';
  onSuccess?: (reportId: string) => void;
}

const InputGroup = ({ 
  label, 
  labelBn, 
  name, 
  value, 
  onChange, 
  type = "number",
  disabled = false,
  required = true,
}: any) => (
  <div className="flex flex-col">
    <label className="text-sm font-semibold text-slate-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {labelBn && <span className="text-xs text-slate-500 mb-2 leading-tight">{labelBn}</span>}
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      inputMode={type === "number" ? "numeric" : "text"}
      className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 border bg-white placeholder-slate-300 transition-all disabled:bg-slate-100 disabled:text-slate-500"
      placeholder={type === "number" ? "0" : ""}
    />
  </div>
);

export default function UnifiedReportForm({ 
  outbreakId, 
  facilityId, 
  facilityCode, 
  initialData, 
  mode: initialMode = 'CREATE',
  onSuccess 
}: UnifiedReportFormProps) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState(initialMode);
  const [dynamicFields, setDynamicFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState({
    suspected24h: initialData?.suspected24h || '',
    confirmed24h: initialData?.confirmed24h || '',
    suspectedDeath24h: initialData?.suspectedDeath24h || '',
    confirmedDeath24h: initialData?.confirmedDeath24h || '',
    admitted24h: initialData?.admitted24h || '',
    discharged24h: initialData?.discharged24h || '',
    serumSent24h: initialData?.serumSent24h || '',
    dynamicValues: initialData?.dynamicValues || {}
  });

  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!outbreakId) return;

    async function fetchFields() {
      setIsLoadingFields(true);
      try {
        const res = await fetch(`/api/outbreaks/${outbreakId}/fields`);
        if (res.ok) {
          const fields = await res.json();
          setDynamicFields(fields);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic fields:", err);
      } finally {
        setIsLoadingFields(false);
      }
    }
    fetchFields();
  }, [outbreakId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleDynamicChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      dynamicValues: { ...prev.dynamicValues, [fieldId]: value }
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'VIEW') return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        outbreakId,
        facilityId,
        facilityCode,
        ...formData,
        dynamicFields: formData.dynamicValues,
        reportingDate: new Date().toISOString()
      };

      const res = await fetch('/api/public/submit', {
        method: mode === 'EDIT' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        if (onSuccess) onSuccess(result.id);
        if (result.mode) setMode(result.mode);
      } else {
        setError(result.error || 'Submission failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group dynamic fields by section
  const sections = dynamicFields.reduce((acc: any, field) => {
    const sectionName = field.section || "Additional Information";
    if (!acc[sectionName]) acc[sectionName] = [];
    acc[sectionName].push(field);
    return acc;
  }, {});

  if (isLoadingFields) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-medium">Loading form configuration...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-50 border border-emerald-200 rounded-3xl p-12 text-center"
          >
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Submission Successful</h2>
            <p className="text-slate-600 mb-8">Your report has been captured in the monitoring platform.</p>
            <button 
              onClick={() => setIsSuccess(false)}
              className="px-6 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-100 transition-colors"
            >
              Back to Form
            </button>
          </motion.div>
        ) : (
          <motion.form 
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Core Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="md:col-span-2 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Core Surveillance Fields</h3>
              </div>
              <InputGroup label={t('dailyReport.fields.suspected24h')} name="suspected24h" value={formData.suspected24h} onChange={handleChange} disabled={mode === 'VIEW'} />
              <InputGroup label={t('dailyReport.fields.confirmed24h')} name="confirmed24h" value={formData.confirmed24h} onChange={handleChange} disabled={mode === 'VIEW'} />
              <InputGroup label="Suspected Deaths (24h)" name="suspectedDeath24h" value={formData.suspectedDeath24h} onChange={handleChange} disabled={mode === 'VIEW'} />
              <InputGroup label="Confirmed Deaths (24h)" name="confirmedDeath24h" value={formData.confirmedDeath24h} onChange={handleChange} disabled={mode === 'VIEW'} />
            </div>

            {/* Dynamic Sections */}
            {Object.entries(sections).map(([sectionName, fields]: [string, any]) => (
              <div key={sectionName} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="md:col-span-2 pb-2 border-b border-slate-100 uppercase tracking-wider text-xs font-black text-indigo-600">
                  {sectionName}
                </div>
                {fields.map((field: FormField) => (
                  <InputGroup 
                    key={field.id}
                    label={i18n.language === 'bn' && field.labelBn ? field.labelBn : field.label}
                    labelBn={i18n.language === 'en' ? field.labelBn : null}
                    name={field.fieldKey}
                    value={formData.dynamicValues[field.id] || ""}
                    onChange={(e: any) => handleDynamicChange(field.id, e.target.value)}
                    type={field.fieldType === 'NUMBER' ? 'number' : 'text'}
                    required={field.isRequired}
                    disabled={mode === 'VIEW'}
                  />
                ))}
              </div>
            ))}

            {mode !== 'VIEW' && (
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center text-lg active:scale-95"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  ) : (
                    mode === 'EDIT' ? 'Update Report' : 'Submit Daily Report'
                  )}
                  {!isSubmitting && <ChevronRight className="w-5 h-5 ml-2" />}
                </button>
              </div>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
