"use client";

import React, { useState, useEffect } from 'react';
import PublicSubmissionSection from '@/components/landing/PublicSubmissionSection';
import Footer from '@/components/Footer';
import SimpleHeader from '@/components/SimpleHeader';
import DeadlineCard from '@/components/reporting/DeadlineCard';
import { getBdDateString, getBdTime } from '@/lib/timezone';

export default function LandingPage() {
  const [settings, setSettings] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<Date>(getBdTime());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getBdTime()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setSettings(data));
  }, []);

  const deadlineInfo = React.useMemo(() => {
    if (!settings) return null;
    const now = currentTime;
    const cutoff = new Date(now);
    cutoff.setHours(settings.cutoffHour, settings.cutoffMinute, 0, 0);
    const editDeadline = new Date(now);
    editDeadline.setHours(settings.editDeadlineHour, settings.editDeadlineMinute, 0, 0);
    
    return {
      isPastCutoff: now > cutoff,
      isPastEditDeadline: now > editDeadline,
    };
  }, [settings, currentTime]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <SimpleHeader />
      <main className="max-w-4xl mx-auto px-4 pb-32 space-y-12">
        <div className="pt-12">
          {settings && deadlineInfo && (
             <DeadlineCard 
               cutoffHour={settings.cutoffHour}
               cutoffMinute={settings.cutoffMinute}
               editDeadlineHour={settings.editDeadlineHour}
               editDeadlineMinute={settings.editDeadlineMinute}
               mode="CREATE"
               isPastEditDeadline={deadlineInfo.isPastEditDeadline}
               isPastCutoff={deadlineInfo.isPastCutoff}
               isToday={true}
               selectedDate={getBdDateString()}
             />
          )}
        </div>
        
        <PublicSubmissionSection />
      </main>
      <Footer />
    </div>
  );
}