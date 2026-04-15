"use client";

import React, { useState, useEffect, useMemo } from 'react';
import LocationSelector from '@/components/reporting/LocationSelector';
import UnifiedReportForm from '@/components/UnifiedReportForm';
import OutbreakSelector from '@/components/OutbreakSelector';
import DeadlineCard from '@/components/reporting/DeadlineCard';
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getBdTime()), 30000);
    return () => clearInterval(timer);
  }, []);

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

  const handleLocationSelect = (facilityId: string) => {
    setSelectedFacilityId(facilityId);
  };

  return (
    <div className="space-y-8">
      {settings && deadlineInfo && (
          <DeadlineCard 
            cutoffHour={settings.cutoffHour}
            cutoffMinute={settings.cutoffMinute}
            editDeadlineHour={settings.editDeadlineHour}
            editDeadlineMinute={settings.editDeadlineMinute}
            mode="CREATE"
            isPastEditDeadline={deadlineInfo.isPastEditDeadline}
            isPastCutoff={deadlineInfo.isPastCutoff}
            isToday={deadlineInfo.isToday}
            allowBacklog={settings.outbreakBacklog?.allowBacklogReporting}
            backlogStartDate={settings.outbreakBacklog?.backlogStartDate}
            backlogEndDate={settings.outbreakBacklog?.backlogEndDate}
            selectedDate={selectedDate}
            windowStatus={windowStatus}
          />
      )}

      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
          {t('report.sections.generalInfo')}
        </label>
        <OutbreakSelector onSelect={setSelectedOutbreakId} />
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200 border-dashed"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#F8FAFC] px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identify Location</span>
        </div>
      </div>

      <LocationSelector onSelect={handleLocationSelect} />

      {selectedFacilityId && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <div className="bg-white border border-slate-100 rounded-[2rem] p-6 md:p-12 shadow-sm">
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
  );
}
