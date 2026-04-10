"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { 
  Clock, 
  Calendar,
  Zap
} from 'lucide-react';
import { getBdDateString, getBdEndOfDay } from '@/lib/timezone';
import OutbreakSelector from '@/components/OutbreakSelector';
import UnifiedReportForm from '@/components/UnifiedReportForm';

export default function DailyReportPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  
  const [selectedOutbreakId, setSelectedOutbreakId] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(getBdDateString());
  const [currentTime, setCurrentTime] = useState<string>('--:--:--');
  const [currentDate, setCurrentDate] = useState<string>('Loading...');
  const [ytdData, setYtdData] = useState<any>(null);
  const [existingReport, setExistingReport] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const bdTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
      setCurrentTime(bdTime.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(bdTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session?.user?.facilityId && selectedOutbreakId) {
      fetchYtdData();
      fetchExistingReport();
    }
  }, [session?.user?.facilityId, selectedOutbreakId, selectedDate]);

  const fetchExistingReport = async () => {
    if (!session?.user?.facilityId || !selectedOutbreakId) return;
    setIsLoadingReport(true);
    try {
      const res = await fetch(`/api/public/reports?facilityId=${session.user.facilityId}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setExistingReport(data.report || null);
      }
    } catch (e) {
      console.error('Failed to fetch existing report');
    } finally {
      setIsLoadingReport(false);
    }
  };

  const fetchYtdData = async () => {
    if (!session?.user?.facilityId || !selectedOutbreakId) return;
    try {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      const today = getBdEndOfDay();
      
      const res = await fetch(`/api/reports?facilityId=${session.user.facilityId}&outbreakId=${selectedOutbreakId}&from=${startOfYear.toISOString()}&to=${today.toISOString()}`);
      const data = await res.json();
      
      if (data.length > 0) {
        const ytd = data.reduce((acc: any, report: any) => ({
          suspected: acc.suspected + (report.suspected24h || 0),
          confirmed: acc.confirmed + (report.confirmed24h || 0),
          suspectedDeath: acc.suspectedDeath + (report.suspectedDeath24h || 0),
          confirmedDeath: acc.confirmedDeath + (report.confirmedDeath24h || 0),
        }), { suspected: 0, confirmed: 0, suspectedDeath: 0, confirmedDeath: 0 });
        
        setYtdData(ytd);
      } else {
        setYtdData({ suspected: 0, confirmed: 0, suspectedDeath: 0, confirmedDeath: 0 });
      }
    } catch (e) {
      console.error('Failed to fetch YTD data');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Daily Reporting</h1>
          </div>
          <p className="text-slate-500 font-medium">
            Submitting data for <span className="text-indigo-600 font-bold">{session?.user.facilityName}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end bg-white dark:bg-slate-800 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-500"/>BD TIME
            </span>
            <span className="text-xl font-black text-slate-800 dark:text-white tabular-nums">{currentTime}</span>
            <span className="text-xs font-bold text-slate-500 mt-0.5">{currentDate}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Selector & YTD */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
              Outbreak Context
            </label>
            <OutbreakSelector onSelect={(id) => setSelectedOutbreakId(id)} />
            <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
              * Switch outbreak to report for different disease events.
            </p>
          </div>

          {ytdData && (
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                YTD Summary (2026)
              </h3>
              <div className="space-y-4">
                <YtdItem label="Suspected" value={ytdData.suspected} color="bg-indigo-500" />
                <YtdItem label="Confirmed" value={ytdData.confirmed} color="bg-emerald-500" />
                <YtdItem label="Suspected Deaths" value={ytdData.suspectedDeath} color="bg-rose-500" />
                <YtdItem label="Confirmed Deaths" value={ytdData.confirmedDeath} color="bg-slate-500" />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Form */}
        <div className="lg:col-span-2">
          {selectedOutbreakId ? (
            <UnifiedReportForm 
              key={`${selectedOutbreakId}-${selectedDate}-${existingReport?.id || 'new'}`}
              outbreakId={selectedOutbreakId} 
              facilityId={session?.user?.facilityId}
              initialData={existingReport}
              onDateChange={(date) => setSelectedDate(date)}
              onSuccess={() => {
                fetchYtdData();
                fetchExistingReport();
              }}
            />
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Select Outbreak</h3>
              <p className="text-slate-500 max-w-xs">Please select an outbreak context from the sidebar to continue with reporting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function YtdItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className={`w-1 h-4 rounded-full ${color}`}></div>
        <span className="text-sm font-semibold text-slate-300">{label}</span>
      </div>
      <span className="text-xl font-black tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}