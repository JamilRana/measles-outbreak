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
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useSession } from 'next-auth/react';
import { getBdDateString, getBdTime, toBdTime } from '@/lib/timezone';

import { FormField } from '@/types/form';
import { Settings } from '@/types/config';
import { DailyReport } from '@/types/report';

interface UnifiedReportFormProps {
  outbreakId: string;
  facilityId?: string;
  initialData?: any;
  mode?: 'CREATE' | 'EDIT' | 'VIEW';
  onDateChange?: (date: string) => void;
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
  const { i18n } = useTranslation();
  const iconMap: any = {
    cases: Activity,
    mortality: AlertTriangle,
    hospitalization: Hospital,
    lab: FlaskConical
  };
  const Icon = iconMap[field.section || 'cases'] || Activity;
  const label = i18n.language === 'bn' ? field.labelBn || field.label : field.label;
  
  if (field.fieldType === 'SELECT' && field.options) {
    let opts: string[] = [];
    try { opts = JSON.parse(field.options); } catch (e) { opts = []; }
    return (
      <div className="flex flex-col">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 opacity-50" />
          {label} {field.isRequired && <span className="text-red-500">*</span>}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(field.fieldKey, e.target.value)}
          disabled={disabled}
          className="block w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 border bg-white text-slate-800 disabled:bg-slate-50 transition-all font-medium"
        >
          <option value="">{t('common.selectOption')}</option>
          {opts.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 opacity-50" />
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
        className={`block w-full rounded-lg border shadow-sm sm:text-sm py-2.5 px-3 border bg-white placeholder-slate-300 transition-all text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-medium ${
          disabled 
            ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100' 
            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'
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
  mode: initialMode,
  onDateChange,
  onSuccess 
}: UnifiedReportFormProps) {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const [mode, setMode] = useState<'CREATE' | 'EDIT' | 'VIEW'>(initialMode || 'CREATE');

  useEffect(() => {
    if (session?.user?.role === 'VIEWER') {
      setMode('VIEW');
    }
  }, [session]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialData?.reportingDate ? initialData.reportingDate.split('T')[0] : getBdDateString());
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [reportSettings, setReportSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData?.reportingDate) {
      setSelectedDate(initialData.reportingDate.split('T')[0]);
    }
  }, [initialData]);

  useEffect(() => {
    if (!outbreakId) return;
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/config?outbreakId=${outbreakId}`);
        if (res.ok) {
          const data = await res.json();
          setReportSettings(data);
        }
      } catch (err) { console.error("Failed to fetch config:", err); }
    }
    fetchConfig();
  }, [outbreakId]);

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
        const res = await fetch(`/api/reports?outbreakId=${outbreakId}&facilityId=${facilityId}&date=${selectedDate}`);
        if (res.ok) {
          const reports = await res.json();
          const existing = reports[0];

          const values: Record<string, string> = {};
          fields.forEach(f => {
            values[f.fieldKey] = existing?.[f.fieldKey] !== undefined ? String(existing[f.fieldKey]) : '';
          });
          
          if (existing?.fieldValues) {
            existing.fieldValues.forEach((fv: any) => {
              const field = fields.find(f => f.id === fv.formFieldId);
              if (field) values[field.fieldKey] = String(fv.value);
            });
          }
          setFormData(values);

          // Use BD time for comparison
          const now = getBdTime();
          const todayStr = getBdDateString();
          const isToday = selectedDate === todayStr;
          
          if (existing) {
             if (isToday) {
                const editDeadline = new Date(now);
                editDeadline.setHours(reportSettings?.editDeadlineHour ?? 23, reportSettings?.editDeadlineMinute ?? 59, 59, 999);
                setMode(now > editDeadline ? 'VIEW' : 'EDIT');
             } else {
                const backlog = reportSettings?.outbreakBacklog;
                if (!backlog?.allowBacklogReporting) {
                  setMode('VIEW');
                } else {
                  // Robust date comparison for past dates
                  const dateToCheck = new Date(selectedDate);
                  dateToCheck.setHours(12, 0, 0, 0); // Midday to avoid TZ shifts
                  
                  const start = backlog.backlogStartDate ? new Date(backlog.backlogStartDate) : null;
                  if (start) start.setHours(0, 0, 0, 0);
                  
                  const end = backlog.backlogEndDate ? new Date(backlog.backlogEndDate) : null;
                  if (end) end.setHours(23, 59, 59, 999);

                  if ((start && dateToCheck < start) || (end && dateToCheck > end)) {
                    setMode('VIEW');
                  } else {
                    setMode('EDIT');
                  }
                }
             }
          } else {
             if (isToday) {
                const cutoff = new Date(now);
                cutoff.setHours(reportSettings?.cutoffHour ?? 23, reportSettings?.cutoffMinute ?? 59, 59, 999);
                setMode(now > cutoff && !reportSettings?.outbreakBacklog?.allowBacklogReporting ? 'VIEW' : 'CREATE');
             } else {
                const backlog = reportSettings?.outbreakBacklog;
                if (!backlog?.allowBacklogReporting) {
                  setMode('VIEW');
                } else {
                  const dateToCheck = new Date(selectedDate);
                  dateToCheck.setHours(12, 0, 0, 0);
                  
                  const start = backlog.backlogStartDate ? new Date(backlog.backlogStartDate) : null;
                  if (start) start.setHours(0, 0, 0, 0);
                  
                  const end = backlog.backlogEndDate ? new Date(backlog.backlogEndDate) : null;
                  if (end) end.setHours(23, 59, 59, 999);

                  if ((start && dateToCheck < start) || (end && dateToCheck > end)) {
                    setMode('VIEW');
                  } else {
                    setMode('CREATE');
                  }
                }
             }
          }
        }
      } catch (err) { console.error("Failed to fetch data:", err); }
      finally { setIsDataLoading(false); }
    }
    fetchData();
  }, [facilityId, outbreakId, selectedDate, fields, reportSettings]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
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
    setIsPreview(true);
  };

  const handleFinalSubmit = async () => {
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
        reportingDate: new Date(selectedDate).toISOString(), 
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
        setIsPreview(false);
        if (onSuccess) onSuccess(result.id);
        if (result.mode) setMode(result.mode as 'CREATE' | 'EDIT' | 'VIEW');
      } else {
        setError(result.error || 'Submission failed');
        setIsPreview(false);
      }
    } catch (err) { setError('An unexpected error occurred'); setIsPreview(false); }
    finally { setIsSubmitting(false); }
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
      <div className={`bg-indigo-50/50 border ${reportSettings?.outbreakBacklog?.allowBacklogReporting ? 'border-indigo-300 shadow-md' : 'border-indigo-100'} rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all relative overflow-hidden`}>
         {isDataLoading && (
           <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px] z-10 transition-all">
             <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
           </div>
         )}
         <div className="flex items-center gap-4 flex-1">
            <div className={`w-12 h-12 ${reportSettings?.outbreakBacklog?.allowBacklogReporting ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'} rounded-xl shadow-sm flex items-center justify-center`}>
              {mode === 'VIEW' ? <Lock className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-0.5">Reporting Date</p>
              {reportSettings?.outbreakBacklog?.allowBacklogReporting ? (
                <div className="relative group">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    max={getBdDateString()}
                    min={reportSettings?.outbreakBacklog?.backlogStartDate ? reportSettings.outbreakBacklog.backlogStartDate.split('T')[0] : undefined}
                    className="bg-transparent border-none p-0 text-lg font-black text-slate-800 tracking-tight focus:ring-0 cursor-pointer hover:text-indigo-600 transition-colors"
                  />
                  <div className="absolute left-0 -bottom-1 w-0 h-0.5 bg-indigo-600 group-hover:w-full transition-all duration-300"></div>
                </div>
              ) : (
                <p className="text-lg font-black text-slate-800 tracking-tight">{reportingDateLabel}</p>
              )}
            </div>
         </div>
         <div className="flex items-center gap-4 bg-white/30 p-2 rounded-xl backdrop-blur-sm border border-indigo-100/50">
           {reportSettings?.outbreakBacklog?.allowBacklogReporting && (
             <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 rounded-full">
               <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
               <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Backlog Active</span>
             </div>
           )}
           <div className="hidden md:block w-px h-8 bg-indigo-100"></div>
           <div className="flex items-center gap-3">
              <div className={`p-1.5 ${mode === 'VIEW' ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-600'} rounded-lg`}>
                <Activity className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{mode === 'VIEW' ? 'Archived Record' : 'Live Reporting'}</span>
           </div>
         </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium text-sm">{error}</p>
          </motion.div>
        )}

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
              {mode === 'EDIT' ? t('dashboard.saveChanges') : t('report.submissionSuccess')}
            </h2>
            <p className="text-slate-600 mb-8">{t('report.submissionSuccessMsg')}</p>
            <button 
              onClick={() => setIsSuccess(false)}
              className="px-8 py-3 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm active:scale-95"
            >
              {i18n.language === 'bn' ? 'ফর্মে ফিরে যান' : 'Back to Form'}
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
                      {mode === 'VIEW' ? t('publicSubmit.banner.archived') : t('publicSubmit.newReport')}
                    </h2>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                      {mode === 'VIEW' ? t('publicSubmit.archivedCannotModify') : t('publicSubmit.reviewAndSubmit')}
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
                          {sectionFields.map(field => {
                            const fieldLabel = i18n.language === 'bn' ? field.labelBn || field.label : field.label;
                            return (
                              <div key={field.id} className="group">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2 truncate" title={fieldLabel}>{fieldLabel}</p>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl group-hover:bg-white group-hover:border-indigo-100 transition-all">
                                  <p className={`text-2xl font-black ${formData[field.fieldKey] && formData[field.fieldKey] !== '0' ? 'text-indigo-600' : 'text-slate-300'}`}>
                                    {formData[field.fieldKey] || '0'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
               </div>

               <div className="flex gap-4 mt-12 pt-8 border-t border-slate-100">
                  {mode === 'VIEW' ? (
                    <div className="flex-1 flex items-center justify-center gap-3 py-4 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 shadow-inner">
                       <Lock className="w-4 h-4" />
                       View-Only Perspective Access
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
                          {isSubmitting ? t('common.loading') : t('publicSubmit.confirmSubmission')}
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
                    <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Section {sectionFields.length} Fields</div>
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
                className="bg-indigo-600 hover:bg-black disabled:bg-slate-200 text-white font-black py-4 px-16 rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center text-xs uppercase tracking-[0.2em] active:scale-95 w-full md:w-auto"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  mode === 'EDIT' ? 'Optimize Report Record' : 'Submit for Verification >'
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}