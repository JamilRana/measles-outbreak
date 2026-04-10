"use client";

import React, { useState } from 'react';
import LocationSelector from '@/components/reporting/LocationSelector';
import UnifiedReportForm from '@/components/UnifiedReportForm';
import OutbreakSelector from '@/components/OutbreakSelector';
import DeadlineCard from '@/components/reporting/DeadlineCard';
import { getBdDateString, getBdTime } from '@/lib/timezone';

import { useTranslation } from 'react-i18next';

export default function PublicSubmissionSection() {
  const { t } = useTranslation();
  const [selectedOutbreakId, setSelectedOutbreakId] = useState('measles-outbreak');
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getBdDateString());

  const handleLocationSelect = (facilityId: string) => {
    setSelectedFacilityId(facilityId);
  };

  return (
    <div className="space-y-8">
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
