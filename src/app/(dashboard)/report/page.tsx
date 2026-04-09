"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { 
  ClipboardList, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  Calendar,
  ShieldAlert,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const InputGroup = ({ 
  label, 
  labelBn, 
  name, 
  value, 
  onChange, 
  type = "number", 
  required = true, 
  disabled = false 
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
      className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 px-3 border bg-white placeholder-slate-300 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      placeholder={type === 'number' ? '0' : 'Enter details...'}
    />
  </div>
);

export default function DailyReportPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const isAdmin = session?.user?.role === 'ADMIN';
  
  const [formData, setFormData] = useState<any>({
    reportingDate: new Date().toISOString().split('T')[0],
    suspected24h: '', 
    confirmed24h: '', 
    suspectedDeath24h: '', 
    confirmedDeath24h: '', 
    admitted24h: '', 
    discharged24h: '',
    serumSent24h: ''
  });
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('--:--:--');
  const [currentDate, setCurrentDate] = useState<string>('Loading...');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [existingReport, setExistingReport] = useState<any>(null);
  const [ytdData, setYtdData] = useState<any>(null);

  useEffect(() => {
    checkTodaySubmission();
    fetchYtdData();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      setCurrentTime(bdTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(bdTime.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', weekday: 'long', month: 'short', day: 'numeric' }));
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const checkTodaySubmission = async () => {
    if (!session?.user?.id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/reports?userId=${session.user.id}&date=${today}`);
      const data = await res.json();
      if (data.length > 0) {
        setAlreadySubmitted(true);
        setExistingReport(data[0]);
        setFormData({
          reportingDate: data[0].reportingDate.split('T')[0],
          suspected24h: data[0].suspected24h?.toString() || '',
          confirmed24h: data[0].confirmed24h?.toString() || '',
          suspectedDeath24h: data[0].suspectedDeath24h?.toString() || '',
          confirmedDeath24h: data[0].confirmedDeath24h?.toString() || '',
          admitted24h: data[0].admitted24h?.toString() || '',
          discharged24h: data[0].discharged24h?.toString() || '',
          serumSent24h: data[0].serumSent24h?.toString() || ''
        });
      }
    } catch (e) {
      console.error('Failed to check submission');
    }
  };

  const fetchYtdData = async () => {
    if (!session?.user?.id) return;
    try {
      const startOfYear = new Date();
      startOfYear.setMonth(0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      const res = await fetch(`/api/reports?userId=${session.user.id}&from=${startOfYear.toISOString()}&to=${today.toISOString()}`);
      const data = await res.json();
      
      if (data.length > 0) {
        const ytd = data.reduce((acc: any, report: any) => ({
          suspected: acc.suspected + (report.suspected24h || 0),
          confirmed: acc.confirmed + (report.confirmed24h || 0),
          suspectedDeath: acc.suspectedDeath + (report.suspectedDeath24h || 0),
          confirmedDeath: acc.confirmedDeath + (report.confirmedDeath24h || 0),
          admitted: acc.admitted + (report.admitted24h || 0),
          discharged: acc.discharged + (report.discharged24h || 0),
          serumSent: acc.serumSent + (report.serumSent24h || 0)
        }), { suspected: 0, confirmed: 0, suspectedDeath: 0, confirmedDeath: 0, admitted: 0, discharged: 0, serumSent: 0 });
        
        setYtdData(ytd);
      }
    } catch (e) {
      console.error('Failed to fetch YTD data');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      let res;
      if (alreadySubmitted && existingReport) {
        res = await fetch(`/api/reports/${existingReport.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      const data = await res.json();

      if (res.ok) {
        setIsSubmitted(true);
        setAlreadySubmitted(true);
        fetchYtdData();
        setTimeout(() => setIsSubmitted(false), 5000);
      } else {
        setError(data.error || 'Failed to submit report');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  if (alreadySubmitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-12 text-center shadow-xl shadow-emerald-500/5"
        >
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">{t('dailyReport.alreadySubmitted')}</h2>
          <p className="text-slate-600 mb-6">{t('dailyReport.alreadySubmittedMsg')}</p>
          
          {ytdData && (
            <div className="bg-white rounded-2xl p-6 text-left mt-6 border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('dailyReport.ytdStats')}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">Suspected:</span> <span className="font-bold text-slate-800">{ytdData.suspected}</span></div>
                <div><span className="text-slate-500">Confirmed:</span> <span className="font-bold text-slate-800">{ytdData.confirmed}</span></div>
                <div><span className="text-slate-500">Deaths (Suspected):</span> <span className="font-bold text-slate-800">{ytdData.suspectedDeath}</span></div>
                <div><span className="text-slate-500">Deaths (Confirmed):</span> <span className="font-bold text-slate-800">{ytdData.confirmedDeath}</span></div>
                <div><span className="text-slate-500">Admitted:</span> <span className="font-bold text-slate-800">{ytdData.admitted}</span></div>
                <div><span className="text-slate-500">Discharged:</span> <span className="font-bold text-slate-800">{ytdData.discharged}</span></div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('dailyReport.title')}</h1>
          <p className="text-slate-500 mt-2">{t('dailyReport.authenticatedAs')} <span className="text-indigo-600 font-semibold">{session?.user.facilityName}</span></p>
        </div>
        <div className="flex flex-col items-end bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-500"/>{t('dailyReport.bdTime')}
          </span>
          <span className="text-xl font-bold text-slate-800 tabular-nums">{currentTime}</span>
          <span className="text-xs font-medium text-slate-500 mt-0.5">{currentDate}</span>
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
            <h2 className="text-3xl font-bold text-slate-800 mb-3">{t('dailyReport.submissionSuccess')}</h2>
            <p className="text-slate-600 text-lg mb-8">{t('dailyReport.submissionSuccessMsg')}</p>
            <button 
              onClick={() => setIsSubmitted(false)}
              className="text-emerald-600 font-semibold hover:text-emerald-700 underline flex items-center gap-2 mx-auto"
            >
              {t('dailyReport.submitAnother')}
            </button>
          </motion.div>
        ) : (
          <motion.form 
            key="form"
            onSubmit={handleSubmit} 
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 shadow-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-indigo-800">
                <p className="font-semibold mb-1">{t('dailyReport.infoTitle')}</p>
                <p>{t('dailyReport.infoMsg')}</p>
              </div>
            </div>

            {ytdData && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('dailyReport.currentYtd')}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                  <div className="text-center p-2 bg-white rounded-lg border border-slate-100">
                    <div className="text-slate-500">{t('dailyReport.suspected')}</div>
                    <div className="font-bold text-slate-800">{ytdData.suspected}</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg border border-slate-100">
                    <div className="text-slate-500">{t('dailyReport.confirmed')}</div>
                    <div className="font-bold text-slate-800">{ytdData.confirmed}</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg border border-slate-100">
                    <div className="text-slate-500">{t('dailyReport.suspectedDeath')}</div>
                    <div className="font-bold text-slate-800">{ytdData.suspectedDeath}</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg border border-slate-100">
                    <div className="text-slate-500">{t('dailyReport.confirmedDeath')}</div>
                    <div className="font-bold text-slate-800">{ytdData.confirmedDeath}</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg border border-slate-100">
                    <div className="text-slate-500">{t('dailyReport.admitted')}</div>
                    <div className="font-bold text-slate-800">{ytdData.admitted}</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg border border-slate-100">
                    <div className="text-slate-500">{t('dailyReport.discharged')}</div>
                    <div className="font-bold text-slate-800">{ytdData.discharged}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800">{t('dailyReport.sections.cases')}</h3>
                <p className="text-sm text-slate-500 mt-1">{t('dailyReport.sections.casesSub')}</p>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup 
                  label={t('dailyReport.fields.suspected24h')} 
                  labelBn="গত ২৪ ঘণ্টায় সন্দেহজনক রোগীর সংখ্যা"
                  name="suspected24h" 
                  value={formData.suspected24h} 
                  onChange={handleChange} 
                />
                <InputGroup 
                  label={t('dailyReport.fields.confirmed24h')} 
                  labelBn="গত ২৪ ঘণ্টায় নিশ্চিত রোগীর সংখ্যা"
                  name="confirmed24h" 
                  value={formData.confirmed24h} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800">{t('dailyReport.sections.mortality')}</h3>
                <p className="text-sm text-slate-500 mt-1">{t('dailyReport.sections.mortalitySub')}</p>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup 
                  label={t('dailyReport.fields.suspectedDeath24h')} 
                  name="suspectedDeath24h" 
                  value={formData.suspectedDeath24h} 
                  onChange={handleChange} 
                />
                <InputGroup 
                  label={t('dailyReport.fields.confirmedDeath24h')} 
                  name="confirmedDeath24h" 
                  value={formData.confirmedDeath24h} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800">{t('dailyReport.sections.hospitalization')}</h3>
                <p className="text-sm text-slate-500 mt-1">{t('dailyReport.sections.hospitalizationSub')}</p>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup 
                  label={t('dailyReport.fields.admitted24h')} 
                  name="admitted24h" 
                  value={formData.admitted24h} 
                  onChange={handleChange} 
                />
                <InputGroup 
                  label={t('dailyReport.fields.discharged24h')} 
                  name="discharged24h" 
                  value={formData.discharged24h} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800">{t('dailyReport.sections.lab')}</h3>
              </div>
              <div className="p-6">
                <InputGroup 
                  label={t('dailyReport.fields.serumSent24h')} 
                  name="serumSent24h" 
                  value={formData.serumSent24h} 
                  onChange={handleChange} 
                  required={false}
                  fullWidth
                />
              </div>
            </div>

            <div className="flex justify-end pt-6 pb-8">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center text-lg group active:scale-95"
              >
                {t('dailyReport.submitReport')}
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}