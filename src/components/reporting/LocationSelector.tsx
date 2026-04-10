"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { MapPin, Hospital, Search, Navigation } from 'lucide-react';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import { Facility } from '@/types/facility';
import { useTranslation } from 'react-i18next';

interface LocationSelectorProps {
  onSelect: (facilityId: string, division: string, district: string) => void;
  disabled?: boolean;
}

export default function LocationSelector({ onSelect, disabled }: LocationSelectorProps) {
  const { t, i18n } = useTranslation();
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);

  const districts = useMemo(() => selectedDivision ? DISTRICTS[selectedDivision] || [] : [], [selectedDivision]);

  useEffect(() => {
    if (selectedDivision && selectedDistrict) {
      setLoading(true);
      fetch(`/api/facilities?division=${encodeURIComponent(selectedDivision)}&district=${encodeURIComponent(selectedDistrict)}`)
        .then(r => r.json())
        .then(d => {
          setFacilities(Array.isArray(d) ? d : []);
          setLoading(false);
        })
        .catch(() => {
          setFacilities([]);
          setLoading(false);
        });
    } else {
      setFacilities([]);
    }
  }, [selectedDivision, selectedDistrict]);

  const handleFacilityChange = (id: string) => {
    setSelectedFacilityId(id);
    onSelect(id, selectedDivision, selectedDistrict);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-50 bg-blue-50/50 flex items-center gap-2">
        <Navigation className="w-4 h-4 text-blue-600" />
        <h3 className="font-bold text-sm text-blue-600">
          {t('publicSubmit.selectLocation')}
        </h3>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('report.fields.division')} <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={selectedDivision}
                onChange={(e) => {
                  setSelectedDivision(e.target.value);
                  setSelectedDistrict('');
                  setSelectedFacilityId('');
                }}
                disabled={disabled}
                className="block w-full rounded-2xl border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer shadow-sm outline-none appearance-none"
              >
                <option value="">{t('common.selectOption')}</option>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Navigation className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('report.fields.district')} <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedFacilityId('');
                }}
                disabled={!selectedDivision || disabled}
                className="block w-full rounded-2xl border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer shadow-sm outline-none appearance-none"
              >
                <option value="">{t('common.selectOption')}</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('report.fields.facilityName')} <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={selectedFacilityId}
                onChange={(e) => handleFacilityChange(e.target.value)}
                disabled={!selectedDistrict || disabled || loading}
                className="block w-full rounded-2xl border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer shadow-sm outline-none appearance-none"
              >
                <option value="">{loading ? t('common.loading') : t('common.selectOption')}</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.facilityName}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Hospital className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {selectedFacilityId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <Hospital className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-0.5">{i18n.language === 'bn' ? 'সক্রিয় ফ্যাসিলিটি' : 'Active Facility'}</p>
                <p className="text-sm font-black text-slate-800">
                  {facilities.find(f => f.id === selectedFacilityId)?.facilityName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{i18n.language === 'bn' ? 'অবস্থান' : 'Location'}</p>
              <p className="text-[11px] font-bold text-slate-600">{selectedDivision} / {selectedDistrict}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
