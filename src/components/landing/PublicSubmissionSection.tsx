"use client";

import React, { useState, useEffect, useMemo } from 'react';
import LocationSelector from '@/components/reporting/LocationSelector';
import UnifiedReportForm from '@/components/UnifiedReportForm';
import OutbreakSelector from '@/components/OutbreakSelector';
import SimpleHeader from '@/components/SimpleHeader';
import { getBdDateString, getBdTime } from '@/lib/timezone';
import { useTranslation } from 'react-i18next';

export default function PublicSubmissionSection() {
  const { t } = useTranslation();
  const [selectedOutbreakId, setSelectedOutbreakId] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getBdDateString());
  const [settings, setSettings] = useState<any>(null);
  const [windowStatus, setWindowStatus] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<Date>(getBdTime());

  // Timer for deadline accuracy
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getBdTime()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Config
  useEffect(() => {
    const fetchConfig = async () => {
      if (!selectedOutbreakId) return;
      try {
        const res = await fetch(`/api/config?outbreakId=${selectedOutbreakId}`);
        if (res.ok) {
           const d = await res.json();
           setSettings(d);
        }
      } catch (err) { console.error("Failed to fetch config:", err); }
    };
    fetchConfig();
  }, [selectedOutbreakId]);

  // Fetch Window Status
  useEffect(() => {
    const fetchWindowStatus = async () => {
      if (!selectedOutbreakId || !selectedFacilityId || !selectedDate) return;
      try {
        const url = `/api/submission/open-window?outbreakId=${selectedOutbreakId}&facilityId=${selectedFacilityId}&date=${selectedDate}`;
        const res = await fetch(url);
        if (res.ok) {
           const d = await res.json();
           setWindowStatus(d);
        }
      } catch (err) { console.error("Failed to fetch window status:", err); }
    };
    fetchWindowStatus();
  }, [selectedOutbreakId, selectedFacilityId, selectedDate]);

  const deadlineInfo = useMemo(() => {
    if (!settings) return null;
    const now = currentTime;
    const cutoff = new Date(now);
    cutoff.setHours(settings.cutoffHour, settings.cutoffMinute, 0, 0);
    const editDeadline = new Date(now);
    editDeadline.setHours(settings.editDeadlineHour, settings.editDeadlineMinute, 0, 0);
    
    return {
      isPastCutoff: now > cutoff,
      isPastEditDeadline: now > editDeadline,
      isToday: selectedDate === getBdDateString()
    };
  }, [settings, currentTime, selectedDate]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-10">
      {/* 1. UNIFIED HEADER */}
      <SimpleHeader 
        settings={settings}
        deadlineInfo={deadlineInfo}
        windowStatus={windowStatus}
        selectedDate={selectedDate}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 2. LEFT SIDEBAR: CONFIGURATION (Sticky) */}
          <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="space-y-8">
                <section>
                  <label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                    1. Outbreak Context
                  </label>
                  <OutbreakSelector onSelect={setSelectedOutbreakId} />
                </section>

                <section>
                  <label className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                    2. Facility Identity
                  </label>
                  <LocationSelector onSelect={setSelectedFacilityId} />
                </section>
              </div>
            </div>

            {/* Visual Guide / Tip */}
            <div className="hidden lg:block p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
              <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest leading-relaxed">
                Ensure all daily figures are cross-checked with your local registry before clicking submit.
              </p>
            </div>
          </aside>

          {/* 3. RIGHT COLUMN: MAIN FORM (Less Scrollable) */}
          <div className="lg:col-span-8">
            {!selectedFacilityId ? (
              <div className="bg-white/60 border-2 border-dashed border-slate-300 rounded-[3rem] py-24 text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <span className="text-2xl font-black">!</span>
                </div>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                  Select a facility on the left to load the reporting form.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl overflow-hidden transition-all">
                <div className="p-1 sm:p-2">
                  <UnifiedReportForm 
                    outbreakId={selectedOutbreakId} 
                    facilityId={selectedFacilityId}
                    onDateChange={setSelectedDate}
                    onSuccess={() => {}}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}