"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Link from "next/link";
import { 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  MapPin,
  Clock,
  AlertTriangle,
  Timer,
  Activity,
  Hospital,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Users,
  Loader2,
  Globe,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import { getBdDateString, getBdTime } from '@/lib/timezone';
import Footer from '@/components/Footer';

interface CutoffSettings {
  cutoffHour: number;
  cutoffMinute: number;
  editDeadlineHour: number;
  editDeadlineMinute: number;
  allowBacklogReporting: boolean;
  backlogStartDate: string | null;
  backlogEndDate: string | null;
}

interface Outbreak {
  id: string;
  name: string;
  disease: { name: string; code: string };
}

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

interface ExistingReport {
  id: string;
  facilityId: string;
  fieldValues: { formFieldId: string; value: string }[];
  [key: string]: any;
}

type FormMode = 'CREATE' | 'EDIT' | 'VIEW';

interface DynamicInputProps {
  field: FormField;
  value: string;
  onChange: (name: string, value: string) => void;
  disabled: boolean;
  readOnly: boolean;
  t: any;
}

const DynamicInput = ({ field, value, onChange, disabled, readOnly, t }: DynamicInputProps) => {
  const label = field.label;
  
  if (field.fieldType === 'SELECT' && field.options) {
    let opts: string[] = [];
    try { opts = JSON.parse(field.options); } catch (e) { opts = []; }
    return (
      <div className="flex flex-col">
        <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
          {field.section === 'cases' && <Activity className="w-4 h-4 text-slate-400" />}
          {field.section === 'mortality' && <AlertTriangle className="w-4 h-4 text-slate-400" />}
          {field.section === 'hospitalization' && <Hospital className="w-4 h-4 text-slate-400" />}
          {field.section === 'lab' && <FlaskConical className="w-4 h-4 text-slate-400" />}
          {label} {field.isRequired && <span className="text-red-500">*</span>}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(field.fieldKey, e.target.value)}
          disabled={disabled || readOnly}
          className="mt-1 block w-full rounded-lg border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border bg-white disabled:bg-slate-50 disabled:text-slate-500"
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
      <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
        {field.section === 'cases' && <Activity className="w-4 h-4 text-slate-400" />}
        {field.section === 'mortality' && <AlertTriangle className="w-4 h-4 text-slate-400" />}
        {field.section === 'hospitalization' && <Hospital className="w-4 h-4 text-slate-400" />}
        {field.section === 'lab' && <FlaskConical className="w-4 h-4 text-slate-400" />}
        {label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      <input
        type={field.fieldType === 'NUMBER' ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(field.fieldKey, e.target.value)}
        disabled={disabled || readOnly}
        readOnly={readOnly}
        inputMode="numeric"
        min="0"
        required={field.isRequired}
        className={`mt-1 block w-full rounded-lg border shadow-sm sm:text-sm py-3 px-4 border bg-white placeholder-slate-400 transition-all text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
          disabled || readOnly 
            ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200' 
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
        }`}
        placeholder={readOnly ? '—' : '0'}
      />
    </div>
  );
};

const CountdownTimer = ({ targetTime, label, urgency }: { targetTime: Date; label: string; urgency: 'low' | 'medium' | 'high' | 'expired' }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetTime.getTime() - now.getTime();
      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }
      setTimeLeft({
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false
      });
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  const urgencyColors = {
    low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    high: 'bg-red-100 text-red-800 border-red-200',
    expired: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const iconColors = {
    low: 'text-emerald-600',
    medium: 'text-amber-600',
    high: 'text-red-600',
    expired: 'text-slate-500'
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${urgencyColors[urgency]}`}>
      <Timer className={`w-5 h-5 ${iconColors[urgency]}`} />
      <div className="flex-1">
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="text-lg font-bold font-mono">
          {timeLeft.isExpired ? 'Expired' : 
            `${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`}
        </p>
      </div>
    </div>
  );
};

const DeadlineBanner = ({ settings, currentTime, mode, editDeadlinePassed }: { settings: CutoffSettings; currentTime: Date; mode: FormMode; editDeadlinePassed: boolean }) => {
  const today = new Date(currentTime);
  const cutoffTime = new Date(today);
  cutoffTime.setHours(settings.cutoffHour, settings.cutoffMinute, 0, 0);
  
  const timeUntilCutoff = cutoffTime.getTime() - today.getTime();
  const isPastCutoff = timeUntilCutoff <= 0;
  
  let urgency: 'low' | 'medium' | 'high' | 'expired' = 'low';
  if (isPastCutoff) urgency = 'expired';
  else if (timeUntilCutoff < 30 * 60 * 1000) urgency = 'high';
  else if (timeUntilCutoff < 2 * 60 * 60 * 1000) urgency = 'medium';

  const getTitle = () => {
    if (mode === 'VIEW' && editDeadlinePassed) return 'Report Archived (Read-Only)';
    if (mode === 'EDIT') return 'Editing Existing Report';
    if (isPastCutoff) return 'Edit Window Open';
    if (urgency === 'high') return 'Deadline Approaching!';
    if (urgency === 'medium') return 'Submission Deadline Today';
    return 'Submission Open';
  };

  const getMessage = () => {
    if (mode === 'VIEW' && editDeadlinePassed) return 'The edit deadline has passed. This report is now archived and cannot be modified.';
    if (mode === 'EDIT') return "You're editing today's report. Changes will be saved automatically.";
    if (isPastCutoff) return `Standard submission closed at ${String(settings.cutoffHour).padStart(2, '0')}:00. ${settings.allowBacklogReporting ? 'Late reporting is active.' : `You can still edit until ${String(settings.editDeadlineHour).padStart(2, '0')}:00.`}`;
    return `Submit your daily report by ${String(settings.cutoffHour).padStart(2, '0')}:${String(settings.cutoffMinute).padStart(2, '0')} (Bangladesh Time)`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-6 border-2 shadow-lg ${
        mode === 'VIEW' && editDeadlinePassed
          ? 'bg-slate-100 border-slate-300'
          : isPastCutoff 
            ? 'bg-amber-50 border-amber-200' 
            : urgency === 'high' 
              ? 'bg-red-50 border-red-200' 
              : urgency === 'medium' 
                ? 'bg-amber-50 border-amber-200' 
                : 'bg-emerald-50 border-emerald-200'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${
          mode === 'VIEW' && editDeadlinePassed ? 'bg-slate-200' :
          isPastCutoff ? 'bg-amber-200' : urgency === 'high' ? 'bg-red-200' : urgency === 'medium' ? 'bg-amber-200' : 'bg-emerald-200'
        }`}>
          {mode === 'VIEW' && editDeadlinePassed || isPastCutoff ? (
            <Clock className="w-6 h-6 text-slate-600" />
          ) : urgency === 'high' ? (
            <AlertTriangle className="w-6 h-6 text-red-700" />
          ) : urgency === 'medium' ? (
            <AlertCircle className="w-6 h-6 text-amber-700" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-700" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className={`font-bold text-lg ${
              mode === 'VIEW' && editDeadlinePassed || isPastCutoff ? 'text-slate-800' : urgency === 'high' ? 'text-red-800' : 'text-emerald-800'
            }`}>
              {getTitle()}
            </h3>
            {mode !== 'CREATE' && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                mode === 'EDIT' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {mode === 'EDIT' ? 'Update' : 'Archived'}
              </span>
            )}
          </div>
          <p className="text-sm opacity-80 mb-4">{getMessage()}</p>
          {mode !== 'VIEW' && !editDeadlinePassed && !isPastCutoff && (
            <CountdownTimer targetTime={cutoffTime} label="Time until cutoff" urgency={urgency} />
          )}
          {(mode === 'EDIT' || (isPastCutoff && !editDeadlinePassed)) && (
            <div className="mt-4 pt-4 border-t border-slate-200/50">
              <div className="flex items-center gap-2 text-xs opacity-70">
                <Clock className="w-4 h-4" />
                <span>Edit deadline: {String(settings.editDeadlineHour).padStart(2, '0')}:{String(settings.editDeadlineMinute).padStart(2, '0')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function PublicSubmitPage() {
  const { t, i18n } = useTranslation();
  
  const [settings, setSettings] = useState<CutoffSettings>({
    cutoffHour: 14, cutoffMinute: 0,
    editDeadlineHour: 10, editDeadlineMinute: 0,
    allowBacklogReporting: false,
    backlogStartDate: null,
    backlogEndDate: null
  });
  const [selectedDate, setSelectedDate] = useState(getBdDateString());
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [selectedOutbreakId, setSelectedOutbreakId] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [facilities, setFacilities] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showSummary, setShowSummary] = useState(false);
  const [mode, setMode] = useState<FormMode>('CREATE');
  const [existingReport, setExistingReport] = useState<ExistingReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    fetch('/api/public/outbreaks')
      .then(r => r.json())
      .then(d => setOutbreaks(Array.isArray(d) ? d : []))
      .catch(() => setOutbreaks([]));
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const url = selectedOutbreakId 
          ? `/api/config?outbreakId=${selectedOutbreakId}`
          : '/api/config';
        const res = await fetch(url);
        const d = await res.json();
        
        setSettings(p => ({ 
          ...p, 
          cutoffHour: d.cutoffHour ?? p.cutoffHour, 
          cutoffMinute: d.cutoffMinute ?? p.cutoffMinute, 
          editDeadlineHour: d.editDeadlineHour ?? p.editDeadlineHour, 
          editDeadlineMinute: d.editDeadlineMinute ?? p.editDeadlineMinute,
        }));

        if (d.outbreakBacklog) {
          setSettings(p => ({ 
            ...p,
            allowBacklogReporting: d.outbreakBacklog.allowBacklogReporting,
            backlogStartDate: d.outbreakBacklog.backlogStartDate,
            backlogEndDate: d.outbreakBacklog.backlogEndDate
          }));
        } else {
          // Reset backlog settings if no outbreak-specific backlog is found
          setSettings(p => ({
            ...p,
            allowBacklogReporting: false,
            backlogStartDate: null,
            backlogEndDate: null
          }));
        }
      } catch (err) {
        console.error("Failed to fetch config:", err);
      }
    };

    fetchConfig();
  }, [selectedOutbreakId]);

  useEffect(() => {
    const updateTime = () => setCurrentTime(getBdTime());
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedDivision && selectedDistrict) {
      fetch(`/api/facilities?division=${encodeURIComponent(selectedDivision)}&district=${encodeURIComponent(selectedDistrict)}`)
        .then(r => r.json()).then(d => setFacilities(d)).catch(() => setFacilities([]));
    }
  }, [selectedDivision, selectedDistrict]);

  useEffect(() => {
    if (selectedOutbreakId) {
      fetch(`/api/public/fields?outbreakId=${selectedOutbreakId}`).then(r => r.json()).then(d => setFields(d)).catch(() => setFields([]));
    } else {
      setFields([]);
    }
  }, [selectedOutbreakId]);

  useEffect(() => {
    if (selectedFacilityId && selectedOutbreakId) {
      fetchExistingReport(selectedFacilityId, selectedDate);
    } else {
      setExistingReport(null);
      setMode('CREATE');
    }
  }, [selectedFacilityId, selectedOutbreakId, selectedDate]);

  const districts = useMemo(() => selectedDivision ? DISTRICTS[selectedDivision] || [] : [], [selectedDivision]);

  const timeWindows = useMemo(() => {
    const now = new Date(currentTime);
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const cutoffTime = new Date(today); cutoffTime.setHours(settings.cutoffHour, settings.cutoffMinute, 0, 0);
    const editDeadlineTime = new Date(today); editDeadlineTime.setHours(settings.editDeadlineHour, settings.editDeadlineMinute, 0, 0);
    
    return { 
      now, 
      cutoffTime, 
      editDeadlineTime, 
      isPastCutoff: now > cutoffTime, 
      isPastEditDeadline: now > editDeadlineTime 
    };
  }, [currentTime, settings]);

  useEffect(() => {
    const isToday = selectedDate === getBdDateString();
    
    if (!existingReport) {
      if (isToday) {
        // If past cutoff, only allow CREATE if backlog is enabled
        setMode(timeWindows.isPastCutoff && !settings.allowBacklogReporting ? 'VIEW' : 'CREATE');
      } else {
        // Backlog reporting logic
        setMode('CREATE'); 
      }
    } else {
      if (isToday) {
        // Edit possible until edit deadline
        setMode(timeWindows.isPastEditDeadline ? 'VIEW' : 'EDIT');
      } else {
        // Backlog editing logic - always allowed if backlog enabled
        setMode('EDIT');
      }
    }
  }, [existingReport, timeWindows, selectedDate]);

  const fetchExistingReport = async (facilityId: string, date: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/public/reports?facilityId=${facilityId}&date=${date}`);
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setExistingReport(data.report);
          const values: Record<string, string> = { facilityId };
          fields.forEach(f => {
            // First check if it's a static field on the report object (e.g. suspected24h)
            if (data.report[f.fieldKey] !== undefined && data.report[f.fieldKey] !== null) {
              values[f.fieldKey] = String(data.report[f.fieldKey]);
            } else {
              // Otherwise check dynamic fieldValues
              const fv = data.report.fieldValues?.find((v: any) => v.formFieldId === f.id);
              values[f.fieldKey] = fv?.value ?? '';
            }
          });
          setFormData(values);
        } else {
          setExistingReport(null);
          const newFormData: Record<string, string> = { ...formData, facilityId };
          fields.forEach(f => { newFormData[f.fieldKey] = ''; });
          setFormData(newFormData);
        }
      }
    } catch (e) { setExistingReport(null); }
    finally { setLoadingReport(false); }
  };

  const handleChange = (name: string, value: string) => {
    if (mode === 'VIEW') return;
    if (name === 'division') { setSelectedDivision(value); setSelectedDistrict(''); setFacilities([]); setSelectedFacilityId(''); setFormData({}); setExistingReport(null); }
    else if (name === 'district') { setSelectedDistrict(value); setFacilities([]); setSelectedFacilityId(''); setFormData({}); setExistingReport(null); }
    else if (name === 'facilityId') { 
      const fac = facilities.find(f => f.id === value); setSelectedFacility(fac || null); setSelectedFacilityId(value); 
      setFormData(prev => ({ ...prev, facilityId: value }));
    }
    else if (name === 'outbreakId') { setSelectedOutbreakId(value); setSelectedFacilityId(''); setSelectedDivision(''); setSelectedDistrict(''); setFormData({}); setExistingReport(null); }
    else { setFormData(prev => ({ ...prev, [name]: value })); }
    
    // Validate date reporting permissions
    if (name === 'reportingDate' || (name === 'outbreakId' && selectedDate)) {
      const isToday = (name === 'reportingDate' ? value : selectedDate) === getBdDateString();
      if (!isToday && settings.allowBacklogReporting) {
        const d = new Date(name === 'reportingDate' ? value : selectedDate);
        const start = settings.backlogStartDate ? new Date(settings.backlogStartDate) : null;
        const end = settings.backlogEndDate ? new Date(settings.backlogEndDate) : null;
        
        if ((start && d < start) || (end && d > end)) {
          setError(`Date not within authorized backlog range (${start?.toLocaleDateString()} - ${end?.toLocaleDateString()})`);
        } else {
          setError(null);
        }
      } else {
        setError(null);
      }
    }

    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.facilityId) errors.facilityId = 'Please select a facility';
    if (!selectedOutbreakId) errors.outbreakId = 'Please select an outbreak';
    fields.filter(f => f.isRequired).forEach(f => {
      if (!formData[f.fieldKey]) errors[f.fieldKey] = 'This field is required';
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'VIEW') { setError(t('This report is archived.')); return; }
    if (!validateForm()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    
    // Check cutoff ONLY if today and NOT allowBacklogReporting
    if (selectedDate === getBdDateString() && !settings.allowBacklogReporting && timeWindows.isPastCutoff && mode === 'CREATE') {
      setError(t('Submission deadline passed.')); return; 
    }
    
    setShowSummary(true);
  };

  const confirmSubmission = async () => {
    setShowSummary(false); setLoading(true); setError(null);
    try {
      const dynamicFields: Record<string, string> = {};
      fields.forEach(f => { if (formData[f.fieldKey]) dynamicFields[f.id] = formData[f.fieldKey]; });
      
      const numericFields: Record<string, number> = {};
      fields.forEach(f => { if (formData[f.fieldKey]) numericFields[f.fieldKey] = parseInt(formData[f.fieldKey]) || 0; });
      
      const payload: Record<string, any> = { 
        facilityId: selectedFacilityId, 
        outbreakId: selectedOutbreakId, 
        dynamicFields, 
        reportingDate: new Date(selectedDate).toISOString(), 
        ...numericFields 
      };
      
      const method = existingReport ? 'PUT' : 'POST';
      const url = existingReport ? `/api/public/submit?existingId=${existingReport.id}` : '/api/public/submit';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) { setIsSubmitted(true); if (selectedFacilityId) fetchExistingReport(selectedFacilityId, selectedDate); }
      else { setError(data.error || 'Failed to save'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    } catch (err) { setError('An unexpected error occurred'); }
    finally { setLoading(false); }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const groupedFields = useMemo(() => {
    const groups: Record<string, FormField[]> = {};
    fields.forEach(f => { const s = f.section || 'other'; if (!groups[s]) groups[s] = []; groups[s].push(f); });
    Object.keys(groups).forEach(k => groups[k].sort((a, b) => a.sortOrder - b.sortOrder));
    return groups;
  }, [fields]);

  const sectionInfo: Record<string, { title: string; icon: any; gradient: string; color: string }> = {
    cases: { title: 'Cases', icon: Users, gradient: 'from-blue-50 to-indigo-50', color: 'text-blue-600' },
    mortality: { title: 'Mortality', icon: AlertTriangle, gradient: 'from-red-50 to-rose-50', color: 'text-red-600' },
    hospitalization: { title: 'Hospitalization', icon: Hospital, gradient: 'from-amber-50 to-orange-50', color: 'text-amber-600' },
    lab: { title: 'Laboratory', icon: FlaskConical, gradient: 'from-purple-50 to-violet-50', color: 'text-purple-600' }
  };

  const isFormDisabled = mode === 'VIEW' || loadingReport;
  const selectedOutbreak = Array.isArray(outbreaks) ? outbreaks.find(o => o.id === selectedOutbreakId) : undefined;

  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'en' ? 'bn' : 'en');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-800 block leading-tight">Daily Report</span>
              <span className="text-xs text-slate-500">Bangladesh Surveillance System</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-4">
              <Link 
                href="/surveillance"
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                Surveillance Hub
              </Link>
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
              >
                <Globe className="w-4 h-4" />
                {i18n.language === 'en' ? 'বাংলা' : 'English'}
              </button>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-semibold text-slate-700" suppressHydrationWarning>{mounted ? formatTime(currentTime) : '--:--:--'}</span>
              <span className="text-xs text-slate-500" suppressHydrationWarning>{mounted ? formatDate(currentTime) : '---------'}</span>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"><Clock className="w-5 h-5 text-slate-600" /></div>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {isSubmitted ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-200">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"><CheckCircle2 className="w-12 h-12 text-white" /></div>
              <h2 className="text-3xl font-bold text-slate-800 mb-3">{existingReport ? 'Report Updated' : 'Report Submitted'}</h2>
              <p className="text-slate-600 mb-2 font-medium">{selectedFacility?.facilityName}</p>
              <p className="text-sm text-slate-500 mb-2">{selectedDivision}, {selectedDistrict}</p>
              <p className="font-bold text-indigo-600 mb-2">Reporting Date: {selectedDate}</p>
              <p className="text-xs text-slate-400 mb-8">{formatDate(currentTime)} at {formatTime(currentTime)}</p>
              <button onClick={() => { setIsSubmitted(false); setExistingReport(null); setMode('CREATE'); fetchExistingReport(selectedFacilityId, selectedDate); }} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors">
                Close
              </button>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <DeadlineBanner settings={settings} currentTime={currentTime} mode={mode} editDeadlinePassed={timeWindows.isPastEditDeadline} />
              {error && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" /><p className="font-medium">{error}</p>
              </motion.div>}

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><MapPin className="w-5 h-5 text-indigo-600" />Select Context & Location</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">Outbreak <span className="text-red-500">*</span></label>
                      <select name="outbreakId" value={selectedOutbreakId} onChange={(e) => handleChange('outbreakId', e.target.value)} disabled={mode === 'VIEW'} className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500">
                        <option value="">Select Outbreak</option>
                        {outbreaks.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">Division <span className="text-red-500">*</span></label>
                      <select name="division" value={selectedDivision} onChange={(e) => handleChange('division', e.target.value)} required disabled={mode === 'VIEW'} className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500">
                        <option value="">Select Division</option>
                        {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">District <span className="text-red-500">*</span></label>
                      <select name="district" value={selectedDistrict} onChange={(e) => handleChange('district', e.target.value)} required disabled={!selectedDivision || mode === 'VIEW'} className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500">
                        <option value="">Select District</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">Facility <span className="text-red-500">*</span></label>
                      <select name="facilityId" value={selectedFacilityId} onChange={(e) => handleChange('facilityId', e.target.value)} required disabled={!selectedDistrict || mode === 'VIEW'} className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500">
                        <option value="">Select Facility</option>
                        {facilities.map(f => <option key={f.id} value={f.id}>{f.facilityName}</option>)}
                      </select>
                    </div>

                    {settings.allowBacklogReporting && (
                      <div className="md:col-span-1">
                        <label className="text-sm font-semibold text-slate-700 mb-1 block">Reporting Date <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => { 
                            const val = e.target.value;
                            setSelectedDate(val); 
                            handleChange('reportingDate', val); 
                          }}
                          disabled={mode === 'VIEW'}
                          min={settings.backlogStartDate?.split('T')[0]}
                          max={getBdDateString()}
                          className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>
                    )}
                  </div>
                  {loadingReport && <div className="flex items-center justify-center py-4 text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading existing report...</div>}
                  {selectedFacility && !loadingReport && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div><div className="flex items-center gap-2 text-emerald-700 font-semibold mb-1"><CheckCircle2 className="w-5 h-5" />{existingReport ? 'Existing Report Found' : 'New Report'}</div><p className="font-bold text-slate-800">{selectedFacility.facilityName}</p></div>
                      {existingReport && <div className="text-right text-xs text-slate-500"><p>Last updated:</p><p className="font-medium">{formatDate(new Date(existingReport.updatedAt || Date.now()))}</p></div>}
                    </div>
                  </motion.div>}
                </div>
              </div>

              {selectedOutbreakId && fields.length > 0 && Object.entries(groupedFields).map(([section, sectionFields]) => {
                const info = sectionInfo[section] || { title: section, icon: Activity, gradient: 'from-slate-50 to-slate-100', color: 'text-slate-600' };
                return (
                  <div key={section} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className={`px-6 py-5 border-b border-slate-100 bg-gradient-to-r ${info.gradient}`}>
                      <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><info.icon className={`w-5 h-5 ${info.color}`} />{info.title}</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {sectionFields.map(field => (
                        <DynamicInput key={field.id} field={field} value={formData[field.fieldKey] || ''} onChange={handleChange} disabled={isFormDisabled} readOnly={mode === 'VIEW'} t={t} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {selectedOutbreakId && fields.length === 0 && !loading && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
                  <p className="text-slate-500">Loading form fields...</p>
                </div>
              )}

              <div className="flex justify-end pt-4 pb-8">
                {mode === 'VIEW' ? (
                  <div className="w-full text-center py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-medium flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5" />Report archived - cannot be modified
                  </div>
                ) : (
                  <button type="submit" disabled={loading || isFormDisabled || !formData.facilityId || !selectedOutbreakId} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center text-lg group active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center">
                    {loading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : <>{existingReport ? 'Update Report' : 'Review & Submit'}<ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>}
                  </button>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showSummary && mode !== 'VIEW' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSummary(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-slate-800 mb-6">{existingReport ? 'Confirm Update' : 'Confirm Submission'}</h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between py-3 border-b border-slate-100"><span className="text-slate-600">Outbreak</span><span className="font-semibold text-slate-800">{selectedOutbreak?.name}</span></div>
                <div className="flex justify-between py-3 border-b border-slate-100"><span className="text-slate-600">Facility</span><span className="font-semibold text-slate-800">{selectedFacility?.facilityName}</span></div>
                {fields.slice(0, 4).map(f => <div key={f.id} className="flex justify-between py-3 border-b border-slate-100"><span className="text-slate-600">{f.label}</span><span className="font-semibold text-slate-800">{formData[f.fieldKey] || '0'}</span></div>)}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowSummary(false)} className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={confirmSubmission} className="flex-1 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" />{existingReport ? 'Save' : 'Submit'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}