"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Activity,
  Hospital,
  FlaskConical,
  AlertTriangle,
  Users,
  Calendar,
  Lock,
  ArrowRightCircle,
  Clock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useSession } from 'next-auth/react';
import { getBdDateString, getBdTime } from '@/lib/timezone';

import { FormField } from '@/types/form';
import { Settings } from '@/types/config';
import { validateForm, ValidationResult } from '@/lib/validation-engine';
import { title } from 'process';

interface UnifiedReportFormProps {
  outbreakId: string;
  facilityId?: string;
  initialData?: any;
  mode?: 'CREATE' | 'EDIT' | 'VIEW';
  onDateChange?: (date: string) => void;
  onModeChange?: (mode: 'CREATE' | 'EDIT' | 'VIEW') => void;
  onSuccess?: (reportId: string) => void;
}

const DynamicInput = ({ 
  field, 
  value, 
  onChange, 
  disabled, 
  t,
  fieldErrors = [],
  fieldWarnings = [],
}: { 
  field: FormField; 
  value: string; 
  onChange: (name: string, val: string) => void; 
  disabled: boolean;
  t: any;
  fieldErrors?: ValidationResult[];
  fieldWarnings?: ValidationResult[];
}) => {
  const { i18n } = useTranslation();
  const iconMap: any = {
    cases: Activity,
    mortality: AlertTriangle,
    hospitalization: Hospital,
    lab: FlaskConical
  };
  const Icon = iconMap[field.section || 'cases'] || Activity;
  const label = field.label;
  const labelBn = field.labelBn;
  const hasError   = fieldErrors.length > 0;
  const hasWarning = !hasError && fieldWarnings.length > 0;

  const baseInputCls = `block w-full rounded-lg border shadow-sm sm:text-sm py-2.5 px-3 bg-white placeholder-slate-300 transition-all text-slate-900 font-medium`;
  const stateInputCls = disabled
    ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100'
    : hasError
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30'
    : hasWarning
    ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/20 bg-amber-50/30'
    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500';

  if (field.fieldType === 'SELECT' && field.options) {
    let opts: string[] = [];
    try { opts = JSON.parse(field.options); } catch (e) { opts = []; }
    return (
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 opacity-50" />
          <span className="flex items-baseline gap-1">
            <span>{label}</span>
            {labelBn && <span className="text-[10px] text-slate-400 normal-case font-medium">({labelBn})</span>}
          </span>
          {field.isRequired && <span className="text-red-500">*</span>}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(field.fieldKey, e.target.value)}
          disabled={disabled}
          className={`block w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 border bg-white text-slate-800 disabled:bg-slate-50 transition-all font-medium ${hasError ? 'border-red-400 bg-red-50/30' : hasWarning ? 'border-amber-400 bg-amber-50/30' : ''}`}
        >
          <option value="">{t('common.selectOption')}</option>
          {opts.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {hasError   && <ValidationMessages messages={fieldErrors}   severity="error"   />}
        {hasWarning && <ValidationMessages messages={fieldWarnings} severity="warning" />}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 opacity-50" />
        <span className="flex items-baseline gap-1">
          <span>{label}</span>
          {labelBn && <span className="text-[10px] text-slate-400 normal-case font-medium lowercase">({labelBn})</span>}
        </span>
        {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      <input
        type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'DATE' ? 'date' : 'text'}
        value={value}
        onChange={(e) => onChange(field.fieldKey, e.target.value)}
        disabled={disabled}
        readOnly={disabled}
        inputMode={field.fieldType === 'NUMBER' ? 'numeric' : undefined}
        min={field.fieldType === 'NUMBER' ? '0' : undefined}
        required={field.isRequired}
        className={`${baseInputCls} ${stateInputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        placeholder={disabled ? '—' : field.fieldType === 'NUMBER' ? '0' : ''}
      />
      {hasError   && <ValidationMessages messages={fieldErrors}   severity="error"   />}
      {hasWarning && <ValidationMessages messages={fieldWarnings} severity="warning" />}
    </div>
  );
};

// Inline validation message list shown below a field
function ValidationMessages({ messages, severity }: { messages: ValidationResult[]; severity: 'error' | 'warning' }) {
  const isError = severity === 'error';
  return (
    <div className={`flex flex-col gap-0.5 ${isError ? 'text-red-600' : 'text-amber-600'}`}>
      {messages.map((m, i) => (
        <p key={i} className="flex items-start gap-1.5 text-xs font-medium">
          {isError
            ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          }
          {m.message}
        </p>
      ))}
    </div>
  );
}

export default function UnifiedReportForm({ 
  outbreakId, 
  facilityId, 
  initialData, 
  mode: initialMode,
  onDateChange,
  onModeChange,
  onSuccess 
}: UnifiedReportFormProps) {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const [mode, setMode] = useState<'CREATE' | 'EDIT' | 'VIEW'>(initialMode || 'VIEW');
  const [windowInfo, setWindowInfo] = useState<{ open: boolean; type: string | null; details: any } | null>(null);

  useEffect(() => {
    if (session?.user?.role === 'VIEWER') {
      setMode('VIEW');
    }
  }, [session]);

  const [fields, setFields] = useState<FormField[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialData?.reportingDate ? initialData.reportingDate.split('T')[0] : getBdDateString());
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationResult[]>([]);
  const [reportId, setReportId] = useState<string | null>(initialData?.id || null);

  useEffect(() => {
    if (initialData?.reportingDate) {
      setSelectedDate(initialData.reportingDate.split('T')[0]);
    }
  }, [initialData]);

  // Phase 2: Dynamic Form Fields Fetch
  useEffect(() => {
    if (!outbreakId) return;
    async function fetchFields() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/public/fields?outbreakId=${outbreakId}`);
        if (res.ok) {
          const data = await res.json();
          setFields(data);
        }
      } catch (err) { console.error("Failed to fetch fields:", err); }
      finally { setIsLoading(false); }
    }
    fetchFields();
  }, [outbreakId]);

  // Phase 2/3: Combined Data Fetch + Window Validation
  useEffect(() => {
    if (!facilityId || !outbreakId || !selectedDate || fields.length === 0) {
      if (fields.length > 0) {
         const empty: Record<string, string> = {};
         fields.forEach(f => { empty[f.fieldKey] = ''; });
         setFormData(empty);
      }
      return;
    }

    async function fetchData() {
      setIsDataLoading(true);
      try {
        // 1. Fetch Existing Submission (if any)
        const reportRes = await fetch(`/api/reports?outbreakId=${outbreakId}&facilityId=${facilityId}&date=${selectedDate}&limit=1`);
        const reportData = await reportRes.json();
        const existing = reportData.reports?.[0];
        setReportId(existing?.id || null);

        const values: Record<string, string> = {};
        fields.forEach(f => {
          // Check hybrid model (top-level spread from Snapshot or legacy column)
          values[f.fieldKey] = existing?.[f.fieldKey] !== undefined ? String(existing[f.fieldKey]) : '';
        });
        
        // Check dynamic field values relation
        if (existing?.fieldValues) {
          existing.fieldValues.forEach((fv: any) => {
            const field = fields.find(f => f.id === fv.formFieldId);
            if (field) values[field.fieldKey] = String(fv.value);
          });
        }
        setFormData(values);

        // 2. Validate Submission Window via Dedicated API (Source of Truth)
        const windowRes = await fetch(`/api/submission/open-window?outbreakId=${outbreakId}&facilityId=${facilityId}&date=${selectedDate}`);
        const windowStatus = await windowRes.json();
        setWindowInfo(windowStatus);

        // Logic cutover to new platform gatekeeper
        let newMode: 'CREATE' | 'EDIT' | 'VIEW' = 'VIEW';
        const isAdminOrEditor = session?.user?.role === 'ADMIN' || session?.user?.role === 'EDITOR';

        if (isAdminOrEditor) {
          newMode = existing ? 'EDIT' : 'CREATE';
        } else if (!windowStatus.open) {
          newMode = 'VIEW';
        } else if (existing) {
          newMode = existing.isLocked ? 'VIEW' : 'EDIT';
        } else {
          newMode = 'CREATE';
        }
        
        setMode(newMode);
        if (onModeChange) onModeChange(newMode);

      } catch (err) { 
        console.error("Data fetch error:", err); 
        setMode('VIEW');
        if (onModeChange) onModeChange('VIEW');
      } finally { 
        setIsDataLoading(false); 
      }
    }
    fetchData();
  }, [facilityId, outbreakId, selectedDate, fields, session]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    // Clear errors for this specific field as user types
    setValidationErrors(prev => prev.filter(e => e.fieldKey !== name));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    if (onDateChange) onDateChange(newDate);
    setIsPreview(false);
    setError(null);
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'VIEW') return;

    // Run client-side validation
    const results = validateForm(
      fields.map(f => ({
        fieldKey: f.fieldKey,
        label: f.label,
        isRequired: f.isRequired,
        validationRules: (f as any).validationRules ?? [],
      })),
      formData
    );

    const errors = results.filter(r => r.severity === 'error');
    const warnings = results.filter(r => r.severity === 'warning');
    setValidationErrors(results);

    // Block submission on errors; warnings are shown but don't block
    if (errors.length > 0) return;

    setIsPreview(true);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const dynamicFields: Record<string, string> = {};
      fields.forEach(f => { if (formData[f.fieldKey]) dynamicFields[f.id] = formData[f.fieldKey]; });
      
      const payload: Record<string, any> = { 
        outbreakId,
        facilityId,
        reportId,
        dynamicFields, 
        reportingDate: new Date(selectedDate).toISOString(), 
      };

      const res = await fetch('/api/public/submit', {
        method: mode === 'EDIT' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (res.ok) {
        setIsSuccess(true);
        setIsPreview(false);
        if (result.id) setReportId(result.id);
        if (onSuccess) onSuccess(result.id);
        if (result.mode) setMode(result.mode as 'CREATE' | 'EDIT' | 'VIEW');
      } else if (res.status === 422 && result.validationErrors) {
        // Server caught validation errors the client missed — surface them inline
        setValidationErrors(result.validationErrors);
        setIsPreview(false);
      } else {
        if (result.existingId) setReportId(result.existingId);
        if (result.mode) setMode(result.mode as 'CREATE' | 'EDIT' | 'VIEW');
        setError(result.error || 'Submission failed');
        setIsPreview(false);
      }
    } catch (err) { 
      setError('An unexpected error occurred'); 
      setIsPreview(false); 
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

  const sectionInfo: Record<string, { title: string; icon: any; color: string; bg: string }> = {
    cases: { title: t('dailyReport.sections.cases'), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    mortality: { title: t('dailyReport.sections.mortality'), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    hospitalization: { title: t('dailyReport.sections.hospitalization'), icon: Hospital, color: 'text-amber-600', bg: 'bg-amber-50' },
    lab: { title: t('dailyReport.sections.lab'), icon: FlaskConical, color: 'text-purple-600', bg: 'bg-purple-50' }
  };

  if (!outbreakId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Activity className="w-10 h-10 mb-4 animate-pulse" />
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Select Outbreak Context</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-medium">Loading form configuration...</p>
      </div>
    );
  }

  const reportingDateLabel = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="relative space-y-6">
      {/* Date & Mode Banner */}
      <div className={`bg-indigo-50/50 border ${windowInfo?.open ? 'border-indigo-300 shadow-md' : 'border-indigo-100'} rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all relative overflow-hidden`}>
         {isDataLoading && (
           <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px] z-10">
             <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
           </div>
         )}
         <div className="flex items-center gap-4 flex-1">
            <div className={`w-12 h-12 ${windowInfo?.open ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'} rounded-xl shadow-sm flex items-center justify-center`}>
              {mode === 'VIEW' ? <Lock className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-0.5">
                Reporting Date <span className="normal-case font-bold opacity-70">(রিপোর্টিং তারিখ)</span>
              </p>
              <div className="relative group">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  max={getBdDateString()}
                  className="bg-transparent border-none p-0 text-lg font-black text-slate-800 tracking-tight focus:ring-0 cursor-pointer hover:text-indigo-600 transition-colors"
                />
                <div className="absolute left-0 -bottom-1 w-0 h-0.5 bg-indigo-600 group-hover:w-full transition-all duration-300"></div>
              </div>
            </div>
         </div>
         <div className="flex items-center gap-4 bg-white/30 p-2 rounded-xl backdrop-blur-sm border border-indigo-100/50">
           {windowInfo?.type === 'ADMIN_OVERRIDE' && (
             <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 rounded-full border border-indigo-200">
               <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
               <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Admin Override</span>
             </div>
           )}
           {windowInfo?.type === 'BACKLOG' && (
             <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 rounded-full border border-amber-200">
               <Clock className="w-3.5 h-3.5 text-amber-600" />
               <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Backlog Slot Open</span>
             </div>
           )}
           {windowInfo?.open ? (
             <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 rounded-full border border-emerald-200">
               <ArrowRightCircle className="w-3.5 h-3.5 text-emerald-600" />
               <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Accepting Data</span>
             </div>
           ) : (
             <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
               <Lock className="w-3.5 h-3.5 text-slate-600" />
               <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Submission Closed</span>
             </div>
           )}
         </div>
      </div>

      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-50 border border-emerald-200 rounded-3xl p-12 text-center"
          >
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-left">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium text-sm">{error}</p>
              </div>
            )}
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {mode === 'EDIT' ? 'Changes Saved' : 'Report Submitted'}
            </h2>
            <p className="text-slate-600 mb-8">Data has been successfully recorded in the monitoring platform.</p>
            <button 
              onClick={() => setIsSuccess(false)}
              className="px-8 py-3 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm active:scale-95"
            >
              Back to Form
            </button>
          </motion.div>
        ) : (isPreview || mode === 'VIEW') ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium text-sm">{error}</p>
              </div>
            )}
            <div className={`bg-white border-2 ${mode === 'VIEW' ? 'border-slate-200' : 'border-indigo-600'} rounded-[2rem] p-6 md:p-10 shadow-xl relative overflow-hidden`}>
               <div className="absolute top-0 right-0 p-10 opacity-5">
                  <Activity className="w-48 h-48" />
               </div>
               
               <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 ${mode === 'VIEW' ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white'} rounded-2xl flex items-center justify-center`}>
                    {mode === 'VIEW' ? <Lock className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {mode === 'VIEW' ? 'Record Insight' : 'Review Submission'}
                    </h2>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                      {mode === 'VIEW' ? 'View-only historical data context' : 'Please verify all counts before final transmission'}
                    </p>
                  </div>
               </div>

               <div className="mt-10 space-y-12">
                  {Object.entries(groupedFields).map(([section, sectionFields]) => {
                    const info = sectionInfo[section] || { title: section, icon: Activity, color: 'text-slate-600' };
                    return (
                      <div key={section} className="relative">
                        <div className="flex items-center gap-3 mb-6">
                          <info.icon className={`w-5 h-5 ${info.color}`} />
                          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">{info.title}</h3>
                          <div className="flex-1 h-px bg-slate-100"></div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                           {sectionFields.map(field => (
                              <div key={field.id} className="group">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2 truncate flex items-center gap-1" title={`${field.label} ${field.labelBn ? `(${field.labelBn})` : ''}`}>
                                  <span>{field.label}</span>
                                  {field.labelBn && <span className="normal-case font-medium opacity-60">({field.labelBn})</span>}
                                </p>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl group-hover:bg-white group-hover:border-indigo-100 transition-all">
                                  <p className={`text-2xl font-black ${formData[field.fieldKey] && formData[field.fieldKey] !== '0' ? 'text-indigo-600' : 'text-slate-300'}`}>
                                    {formData[field.fieldKey] || '0'}
                                  </p>
                                </div>
                              </div>
                           ))}
                        </div>
                      </div>
                    );
                  })}
               </div>

               <div className="flex gap-4 mt-12 pt-8 border-t border-slate-100">
                  {mode === 'VIEW' ? (
                    <div className="flex-1 flex flex-col items-center gap-6">
                       <div className="w-full flex items-center justify-center gap-3 py-4 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
                          <Lock className="w-4 h-4" />
                          Historical Record Locked
                       </div>
                       {!windowInfo?.open && (
                         <p className="text-xs font-bold text-slate-400 italic">This window is closed. Contact MIS for retroactive backlog slots.</p>
                       )}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsPreview(false)}
                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                      >
                        Back to Edit
                      </button>
                      <button
                        onClick={handleFinalSubmit}
                        disabled={isSubmitting}
                        className="flex-[2] py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Confirm & Transmit
                      </button>
                    </>
                  )}
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.form 
            key="form"
            onSubmit={handlePreSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium text-sm">{error}</p>
              </div>
            )}
            {validationErrors.filter(e => e.severity === 'error').length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-red-700">
                    {validationErrors.filter(ve => ve.severity === 'error').length} {validationErrors.filter(ve => ve.severity === 'error').length === 1 ? 'error' : 'errors'} — please fix before submitting
                  </p>
                </div>
                <ul className="space-y-0.5 pl-6">
                  {validationErrors.filter(ve => ve.severity === 'error').map((ve, i) => (
                    <li key={i} className="text-xs text-red-600 list-disc">{ve.message}</li>
                  ))}
                </ul>
              </div>
            )}
            {validationErrors.filter(e => e.severity === 'warning').length > 0 && validationErrors.filter(e => e.severity === 'error').length === 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 font-medium">
                  {validationErrors.filter(ve => ve.severity === 'warning').length} warning{validationErrors.filter(ve => ve.severity === 'warning').length > 1 ? 's' : ''} — review highlighted fields. You can still submit.
                </p>
              </div>
            )}
            {isDataLoading && fields.length > 0 && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center rounded-3xl">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">Verifying Window...</p>
              </div>
            )}
            {Object.entries(groupedFields).map(([section, sectionFields]) => {
              const info = sectionInfo[section] || { title: section, icon: Activity, color: 'text-slate-600', bg: 'bg-slate-100' };
              return (
                <div key={section} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden group hover:border-indigo-100 transition-colors">
                  <div className={`px-6 py-4 border-b border-slate-50 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                       <div className={`p-1.5 ${info.bg} ${info.color} rounded-lg`}>
                        <info.icon className="w-5 h-5" />
                       </div>
                       <h3 className={`font-black text-sm text-slate-800 uppercase tracking-widest`}>
                         {info.title}
                       </h3>
                    </div>
                    <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{sectionFields.length} Channels</div>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                    {sectionFields.map(field => (
                      <DynamicInput 
                        key={field.id} 
                        field={field} 
                        value={formData[field.fieldKey] || ''} 
                        onChange={handleChange} 
                        disabled={(mode as string) === 'VIEW'}
                        t={t}
                        fieldErrors={validationErrors.filter(e => e.fieldKey === field.fieldKey && e.severity === 'error')}
                        fieldWarnings={validationErrors.filter(e => e.fieldKey === field.fieldKey && e.severity === 'warning')}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`font-black py-5 px-16 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] active:scale-95 w-full md:w-auto ${
                  validationErrors.filter(e => e.severity === 'error').length > 0
                    ? 'bg-red-100 text-red-400 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-black text-white shadow-indigo-100 disabled:bg-slate-200 disabled:text-slate-400'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : validationErrors.filter(e => e.severity === 'error').length > 0 ? (
                  <><AlertCircle className="w-4 h-4" /> Fix {validationErrors.filter(e => e.severity === 'error').length} {validationErrors.filter(e => e.severity === 'error').length === 1 ? 'error' : 'errors'} to continue</>
                ) : (
                  mode === 'EDIT' ? 'Save Updated Report' : 'Review & Submit >'
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}