"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { 
  ClipboardList, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  Hospital,
  Calendar,
  AlertTriangle,
  Phone,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DISTRICTS_BY_DIVISION, DIVISIONS } from '@/lib/constants';

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="mb-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
      {children}
    </div>
  </div>
);

const InputGroup = ({ 
  label, 
  labelBn, 
  name, 
  value, 
  onChange, 
  type = "number", 
  required = true, 
  isSelect = false, 
  options = [], 
  fullWidth = false, 
  disabled = false 
}: any) => (
  <div className={`flex flex-col ${fullWidth ? 'md:col-span-2' : ''}`}>
    <label className="text-sm font-semibold text-slate-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {labelBn && <span className="text-xs text-slate-500 mb-2 leading-tight">{labelBn}</span>}
    
    {isSelect ? (
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`mt-1 block w-full rounded-lg shadow-sm sm:text-sm py-2.5 px-3 border transition-all ${
          disabled 
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
            : 'bg-white border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
        }`}
      >
        <option value="" disabled>Select an option</option>
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 border bg-white placeholder-slate-300 transition-all"
        placeholder={type === 'number' ? '0' : 'Enter details...'}
      />
    )}
  </div>
);

export default function ReportPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const isAdmin = session?.user?.role === 'ADMIN';
  
  const [formData, setFormData] = useState<any>({
    reportingDate: new Date().toISOString().split('T')[0],
    suspected24h: '', 
    suspectedYTD: '',
    confirmed24h: '', 
    confirmedYTD: '',
    suspectedDeath24h: '', 
    suspectedDeathYTD: '',
    confirmedDeath24h: '', 
    confirmedDeathYTD: '',
    admitted24h: '', 
    admittedYTD: '',
    discharged24h: '', 
    dischargedYTD: '',
    serumSentYTD: ''
  });
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cutoffPassed, setCutoffPassed] = useState(false);

  const cutoffHour = parseInt(process.env.NEXT_PUBLIC_REPORT_CUTOFF_HOUR || '14', 10);
  const cutoffMinute = parseInt(process.env.NEXT_PUBLIC_REPORT_CUTOFF_MINUTE || '0', 10);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Check cutoff in Bangladesh time
      const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      const hour = bdTime.getHours();
      const minute = bdTime.getMinutes();
      const isPast = hour > cutoffHour || (hour === cutoffHour && minute >= cutoffMinute);
      setCutoffPassed(isPast);
    }, 1000);
    return () => clearInterval(timer);
  }, [cutoffHour, cutoffMinute]);

  // Check if user is entering historical data
  const isHistoricalEntry = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return formData.reportingDate < today;
  }, [formData.reportingDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    setValidationErrors([]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const errors: string[] = [];
    if (Number(formData.suspectedYTD) < Number(formData.suspected24h)) errors.push(t('validation.suspectedYTDError'));
    if (Number(formData.confirmedYTD) < Number(formData.confirmed24h)) errors.push(t('validation.confirmedYTDError'));
    if (Number(formData.suspectedDeathYTD) < Number(formData.suspectedDeath24h)) errors.push(t('validation.suspectedDeathYTDError'));
    if (Number(formData.confirmedDeathYTD) < Number(formData.confirmedDeath24h)) errors.push(t('validation.confirmedDeathYTDError'));
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setIsSubmitted(true);
        setTimeout(() => setIsSubmitted(false), 5000);
      } else {
        if (data.cutoffPassed) {
          setError(data.message);
        } else {
          setError(data.error);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError(t('validation.unexpectedError'));
    }
  };

  // Show cutoff notice for non-admin users
  if (cutoffPassed && !isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-12 text-center shadow-xl shadow-amber-500/5"
        >
          <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/20">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">{t('report.cutoffTitle')}</h2>
          <p className="text-slate-600 text-lg mb-4">{t('report.cutoffMessage')}</p>
          <div className="bg-white rounded-2xl border border-amber-200 p-6 mt-6 inline-block">
            <div className="flex items-center gap-3 text-amber-700">
              <Phone className="w-5 h-5" />
              <span className="font-semibold">{t('report.cutoffContact')}</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('report.title')}</h1>
          <p className="text-slate-500 mt-2">{t('report.authenticatedAs')} <span className="text-indigo-600 font-semibold">{session?.user.facilityName}</span></p>
        </div>
        <div className="flex flex-col items-end bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm min-w-[200px]">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-500"/>{t('report.bdTime')}
          </span>
          <span className="text-xl font-bold text-slate-800 tabular-nums">
            {currentTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-xs font-medium text-slate-500 mt-0.5">
            {currentTime.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isSubmitted ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-emerald-50 border border-emerald-200 rounded-3xl p-16 text-center shadow-xl shadow-emerald-500/5"
          >
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3">{t('report.submissionSuccess')}</h2>
            <p className="text-slate-600 text-lg mb-8">{t('report.submissionSuccessMsg')}</p>
            <button 
              onClick={() => setIsSubmitted(false)}
              className="text-emerald-600 font-semibold hover:text-emerald-700 underline flex items-center gap-2 mx-auto"
            >
              {t('report.submitAnother')}
            </button>
          </motion.div>
        ) : (
          <motion.form 
            key="form"
            onSubmit={handleSubmit} 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 shadow-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                <p className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> {t('validation.correctErrors')}
                </p>
                <ul className="text-sm text-amber-700 space-y-1 list-disc pl-5">
                  {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {/* Historical data warning for admin */}
            {isAdmin && isHistoricalEntry && (
              <div className="p-4 bg-violet-50 border border-violet-200 text-violet-700 rounded-xl flex items-center gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{t('report.historicalWarning')}: <span className="font-bold">{formData.reportingDate}</span></p>
              </div>
            )}

            <Section title={t('report.sections.generalInfo')} subtitle={t('report.sections.generalInfoSub')}>
              <InputGroup 
                label={t('report.fields.division')} 
                name="divisionDisplay" 
                value={session?.user.division || ''} 
                disabled 
                type="text" 
              />
              <InputGroup 
                label={t('report.fields.district')} 
                name="districtDisplay" 
                value={session?.user.district || ''} 
                disabled 
                type="text" 
              />
              <InputGroup 
                label={t('report.fields.reportingDate')} 
                name="reportingDate" 
                value={formData.reportingDate} 
                onChange={handleChange} 
                type="date"
                disabled={!isAdmin}
              />
              <InputGroup 
                label={t('report.fields.facilityName')} 
                name="facilityDisplay" 
                value={session?.user.facilityName || ''} 
                disabled 
                type="text" 
              />
            </Section>

            <Section title={t('report.sections.suspected')} subtitle={t('report.sections.suspectedSub')}>
              <InputGroup label={t('report.fields.last24h')} labelBn="গত ২৪ ঘণ্টায় রোগীর সংখ্যা" name="suspected24h" value={formData.suspected24h} onChange={handleChange} />
              <InputGroup label={t('report.fields.yearToDate')} labelBn="অদ্যাবধি মোট রোগীর সংখ্যা" name="suspectedYTD" value={formData.suspectedYTD} onChange={handleChange} />
            </Section>

            <Section title={t('report.sections.confirmed')} subtitle={t('report.sections.confirmedSub')}>
              <InputGroup label={t('report.fields.last24h')} labelBn="গত ২৪ ঘণ্টায় নিশ্চিত রোগীর সংখ্যা" name="confirmed24h" value={formData.confirmed24h} onChange={handleChange} />
              <InputGroup label={t('report.fields.yearToDate')} labelBn="অদ্যাবধি মোট নিশ্চিত রোগীর সংখ্যা" name="confirmedYTD" value={formData.confirmedYTD} onChange={handleChange} />
            </Section>

            <Section title={t('report.sections.mortality')} subtitle={t('report.sections.mortalitySub')}>
              <InputGroup label={t('report.fields.suspectedDeath24h')} name="suspectedDeath24h" value={formData.suspectedDeath24h} onChange={handleChange} />
              <InputGroup label={t('report.fields.suspectedDeathYTD')} name="suspectedDeathYTD" value={formData.suspectedDeathYTD} onChange={handleChange} />
              <InputGroup label={t('report.fields.confirmedDeath24h')} name="confirmedDeath24h" value={formData.confirmedDeath24h} onChange={handleChange} />
              <InputGroup label={t('report.fields.confirmedDeathYTD')} name="confirmedDeathYTD" value={formData.confirmedDeathYTD} onChange={handleChange} />
            </Section>

            <Section title={t('report.sections.hospitalization')} subtitle={t('report.sections.hospitalizationSub')}>
              <InputGroup label={t('report.fields.admitted24h')} name="admitted24h" value={formData.admitted24h} onChange={handleChange} />
              <InputGroup label={t('report.fields.admittedYTD')} name="admittedYTD" value={formData.admittedYTD} onChange={handleChange} />
              <InputGroup label={t('report.fields.discharged24h')} name="discharged24h" value={formData.discharged24h} onChange={handleChange} />
              <InputGroup label={t('report.fields.dischargedYTD')} name="dischargedYTD" value={formData.dischargedYTD} onChange={handleChange} />
            </Section>

            <Section title={t('report.sections.labSurveillance')} subtitle={t('report.sections.labSurveillanceSub')}>
              <InputGroup 
                label={t('report.fields.serumSentYTD')} 
                name="serumSentYTD" 
                value={formData.serumSentYTD} 
                onChange={handleChange} 
                required={false} 
                fullWidth 
              />
            </Section>

            <div className="flex justify-end pt-8 pb-12">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center text-lg group active:scale-95"
              >
                {t('report.submitReport')}
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
