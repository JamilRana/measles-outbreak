"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { getBdDateString, getBdTime } from '@/lib/timezone';
import UnifiedReportForm from '@/components/UnifiedReportForm';
import DeadlineCard from '@/components/reporting/DeadlineCard';
import LocationSelector from '@/components/reporting/LocationSelector';
import SimpleHeader from '@/components/SimpleHeader';
import Footer from '@/components/Footer';
import OutbreakSelector from '@/components/OutbreakSelector';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { hasPermission } from '@/lib/rbac';

export default function AuthenticatedReportPage() {
  const { data: session } = useSession();
  const [selectedOutbreakId, setSelectedOutbreakId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getBdDateString());
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [windowStatus, setWindowStatus] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<Date>(getBdTime());
  const [mounted, setMounted] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT' | 'VIEW'>('CREATE');

  const canSubmit = hasPermission(session?.user?.role || "", 'report:create');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getBdTime()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session?.user?.facilityId) {
      setSelectedFacilityId(session.user.facilityId || '');
    }
  }, [session]);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!selectedOutbreakId) return;
      try {
        const url = `/api/config?outbreakId=${selectedOutbreakId}`;
        const res = await fetch(url);
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

  if (!mounted) return null;

  if (session && !canSubmit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3rem] shadow-xl max-w-md text-center border border-slate-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-[0.03] -rotate-12">
              <ShieldAlert className="w-48 h-48" />
           </div>
           <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 relative z-10">
              <ShieldAlert className="w-10 h-10" />
           </div>
           <h1 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Access Restricted</h1>
           <p className="text-slate-500 font-medium mb-10 leading-relaxed">
              Your account has <b>Viewer-only</b> privileges. You do not have permission to submit or modify surveillance records.
           </p>
           <button 
             onClick={() => window.location.href = '/dashboard'} 
             className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 w-full"
           >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30 flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pb-20 pt-10">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">1. Outbreak Context</label>
              <OutbreakSelector onSelect={setSelectedOutbreakId} defaultValue={selectedOutbreakId} />
            </div>
            {!session?.user?.facilityId && (
              <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">2. Reporting Location</label>
                 <LocationSelector onSelect={handleLocationSelect} />
              </div>
            )}
          </div>
          
          {selectedFacilityId ? (
            <div className="space-y-6">
              {settings && deadlineInfo && (
                <DeadlineCard 
                  cutoffHour={settings.cutoffHour}
                  cutoffMinute={settings.cutoffMinute}
                  editDeadlineHour={settings.editDeadlineHour}
                  editDeadlineMinute={settings.editDeadlineMinute}
                  mode={formMode}
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

              <div className="bg-white border border-slate-100 rounded-xl p-4 md:p-8 shadow-sm">
                 <UnifiedReportForm 
                   outbreakId={selectedOutbreakId}
                   facilityId={selectedFacilityId}
                   onDateChange={setSelectedDate}
                   onModeChange={setFormMode}
                   onSuccess={() => {}}
                 />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 border-dashed rounded-2xl p-12 text-center opacity-60">
               <p className="text-slate-500 font-medium whitespace-pre-wrap">Please select a facility above to continue.{"\n"}If you are an authorized facility user, this should load automatically.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}