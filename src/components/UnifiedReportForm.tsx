"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  Loader2,
  Activity,
  Hospital,
  FlaskConical,
  AlertTriangle,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface FormField {
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

interface UnifiedReportFormProps {
  outbreakId: string;
  facilityId?: string;
  initialData?: any;
  mode?: 'CREATE' | 'EDIT' | 'VIEW';
  onSuccess?: (reportId: string) => void;
}

const DynamicInput = ({ 
  field, 
  value, 
  onChange, 
  disabled, 
  t 
}: { 
  field: FormField; 
  value: string; 
  onChange: (name: string, val: string) => void; 
  disabled: boolean;
  t: any;
}) => {
  const label = field.label;
  
  if (field.fieldType === 'SELECT' && field.options) {
    let opts: string[] = [];
    try { opts = JSON.parse(field.options); } catch (e) { opts = []; }
    return (
      <div className="flex flex-col">
        <label className="text-sm font-semibold text-slate-700 mb-1">
          {field.section === 'cases' && <Users className="w-4 h-4 inline mr-1 text-slate-400" />}
          {field.section === 'mortality' && <AlertTriangle className="w-4 h-4 inline mr-1 text-slate-400" />}
          {field.section === 'hospitalization' && <Hospital className="w-4 h-4 inline mr-1 text-slate-400" />}
          {field.section === 'lab' && <FlaskConical className="w-4 h-4 inline mr-1 text-slate-400" />}
          {label} {field.isRequired && <span className="text-red-500">*</span>}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(field.fieldKey, e.target.value)}
          disabled={disabled}
          className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 border bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
        >
          <option value="">Select</option>
          {opts.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col">
      <label className="text-sm font-semibold text-slate-700 mb-1">
        {field.section === 'cases' && <Activity className="w-4 h-4 inline mr-1 text-slate-400" />}
        {field.section === 'mortality' && <AlertTriangle className="w-4 h-4 inline mr-1 text-slate-400" />}
        {field.section === 'hospitalization' && <Hospital className="w-4 h-4 inline mr-1 text-slate-400" />}
        {field.section === 'lab' && <FlaskConical className="w-4 h-4 inline mr-1 text-slate-400" />}
        {label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      <input
        type={field.fieldType === 'NUMBER' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(field.fieldKey, e.target.value)}
        disabled={disabled}
        readOnly={disabled}
        inputMode="numeric"
        min="0"
        required={field.isRequired}
        className={`block w-full rounded-lg border shadow-sm sm:text-sm py-2.5 px-3 border bg-white placeholder-slate-400 transition-all text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
          disabled 
            ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' 
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
        }`}
        placeholder={disabled ? '—' : '0'}
      />
    </div>
  );
};

export default function UnifiedReportForm({ 
  outbreakId, 
  facilityId, 
  initialData, 
  mode: initialMode = 'CREATE',
  onSuccess 
}: UnifiedReportFormProps) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState(initialMode);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!outbreakId) return;
    
    async function fetchFields() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/public/fields?outbreakId=${outbreakId}`);
        if (res.ok) {
          const data = await res.json();
          setFields(data);
          
          const values: Record<string, string> = {};
          data.forEach((f: FormField) => {
            values[f.fieldKey] = initialData?.[f.fieldKey] || '';
          });
          if (initialData?.fieldValues) {
            initialData.fieldValues.forEach((fv: any) => {
              const field = data.find((df: FormField) => df.id === fv.formFieldId);
              if (field) values[field.fieldKey] = fv.value;
            });
          }
          setFormData(values);
        }
      } catch (err) {
        console.error("Failed to fetch fields:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFields();
  }, [outbreakId]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'VIEW') return;

    setIsSubmitting(true);
    setError(null);

    try {
      const dynamicFields: Record<string, string> = {};
      fields.forEach(f => { if (formData[f.fieldKey]) dynamicFields[f.id] = formData[f.fieldKey]; });
      
      const numericFields: Record<string, number> = {};
      fields.forEach(f => { if (formData[f.fieldKey]) numericFields[f.fieldKey] = parseInt(formData[f.fieldKey]) || 0; });
      
      const payload: Record<string, any> = { 
        outbreakId,
        facilityId,
        dynamicFields, 
        reportingDate: new Date().toISOString(), 
        ...numericFields 
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

  const groupedFields = useMemo(() => {
    const groups: Record<string, FormField[]> = {};
    fields.forEach(f => { 
      const s = f.section || 'other'; 
      if (!groups[s]) groups[s] = []; 
      groups[s].push(f); 
    });
    Object.keys(groups).forEach(k => groups[k].sort((a, b) => a.sortOrder - b.sortOrder));
    return groups;
  }, [fields]);

  const sectionInfo: Record<string, { title: string; icon: any; gradient: string; color: string }> = {
    cases: { title: 'Cases', icon: Users, gradient: 'from-blue-50 to-indigo-50', color: 'text-blue-600' },
    mortality: { title: 'Mortality', icon: AlertTriangle, gradient: 'from-red-50 to-rose-50', color: 'text-red-600' },
    hospitalization: { title: 'Hospitalization', icon: Hospital, gradient: 'from-amber-50 to-orange-50', color: 'text-amber-600' },
    lab: { title: 'Laboratory', icon: FlaskConical, gradient: 'from-purple-50 to-violet-50', color: 'text-purple-600' }
  };

  if (isLoading) {
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
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {mode === 'EDIT' ? 'Report Updated' : 'Submission Successful'}
            </h2>
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
            className="space-y-6"
          >
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {Object.entries(groupedFields).map(([section, sectionFields]) => {
              const info = sectionInfo[section] || { title: section, icon: Activity, gradient: 'from-slate-50 to-slate-100', color: 'text-slate-600' };
              return (
                <div key={section} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className={`px-6 py-4 border-b border-slate-100 bg-gradient-to-r ${info.gradient}`}>
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <info.icon className={`w-5 h-5 ${info.color}`} />
                      {info.title}
                    </h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(sectionFields as FormField[]).map(field => (
                      <DynamicInput 
                        key={field.id} 
                        field={field} 
                        value={formData[field.fieldKey] || ''} 
                        onChange={handleChange} 
                        disabled={mode === 'VIEW'}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {mode !== 'VIEW' && (
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:bg-slate-400 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center text-lg active:scale-95"
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