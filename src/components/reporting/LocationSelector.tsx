"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Hospital, Navigation, ChevronDown } from 'lucide-react';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import { Facility } from '@/types/facility';
import { useTranslation } from 'react-i18next';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

interface LocationSelectorProps {
  onSelect: (facilityId: string, division: string, district: string) => void;
  disabled?: boolean;
}

export default function LocationSelector({ onSelect, disabled }: LocationSelectorProps) {
  const { t, i18n } = useTranslation();
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Tracking what the user types
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);

  const districts = useMemo(() => 
    selectedDivision ? DISTRICTS[selectedDivision] || [] : [], 
    [selectedDivision]
  );

  // Filter facilities based on search query
  const filteredFacilities = useMemo(() => {
    if (!searchQuery) return facilities;
    return facilities.filter((f) =>
      f.facilityName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [facilities, searchQuery]);

  const activeFacility = useMemo(() => 
    facilities.find(f => f.id === selectedFacilityId),
    [facilities, selectedFacilityId]
  );

  useEffect(() => {
    let isMounted = true;
    if (selectedDivision && selectedDistrict) {
      setLoading(true);
      fetch(`/api/facilities?division=${encodeURIComponent(selectedDivision)}&district=${encodeURIComponent(selectedDistrict)}`)
        .then(r => r.json())
        .then(d => {
          if (isMounted) {
            setFacilities(Array.isArray(d) ? d : []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setFacilities([]);
            setLoading(false);
          }
        });
    } else {
      setFacilities([]);
    }
    return () => { isMounted = false; };
  }, [selectedDivision, selectedDistrict]);

  const handleFacilityChange = (id: string | null) => {
    const facilityId = id || '';
    setSelectedFacilityId(facilityId);
    
    // Sync the search input text with the selected facility name
    const selected = facilities.find(f => f.id === facilityId);
    if (selected) setSearchQuery(selected.facilityName);

    if (facilityId) {
      onSelect(facilityId, selectedDivision, selectedDistrict);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm relative">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-50 bg-blue-50/50 flex items-center gap-2 rounded-t-xl">
        <Navigation className="w-4 h-4 text-blue-600" />
        <h3 className="font-bold text-sm text-blue-600">
          {t('publicSubmit.selectLocation')}
        </h3>
      </div>
      
      <div className="p-6">
        {/* Division & District Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Division <span className="normal-case font-bold opacity-70">(বিভাগ)</span> <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedDivision}
                onChange={(e) => {
                  setSelectedDivision(e.target.value);
                  setSelectedDistrict('');
                  setSelectedFacilityId('');
                  setSearchQuery('');
                }}
                disabled={disabled}
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none appearance-none disabled:bg-slate-50"
              >
                <option value="">{t('common.selectOption')}</option>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
              District <span className="normal-case font-bold opacity-70">(জেলা)</span> <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedFacilityId('');
                  setSearchQuery('');
                }}
                disabled={!selectedDivision || disabled}
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none appearance-none disabled:bg-slate-50"
              >
                <option value="">{t('common.selectOption')}</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Facility Combobox - FIXED BOX MODEL */}
        <div className="space-y-1.5 w-full">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
            Facility Name <span className="normal-case font-bold opacity-70">(স্বাস্থ্যসেবা কেন্দ্রের নাম)</span> <span className="text-red-500">*</span>
          </label>
          
          <div className="relative w-full">
            <Combobox 
              items={filteredFacilities} 
              value={selectedFacilityId}
              onValueChange={handleFacilityChange}
            >
              {/* This relative wrapper ensures the icon and input stay together */}
              <div className="relative w-full">
                <ComboboxInput
                  placeholder={loading ? "Loading facilities..." : t('common.selectOption')}
                  disabled={!selectedDistrict || disabled || loading}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-bold text-slate-900 
                    focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 
                    transition-all duration-150 ease-out outline-none
                    disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
                <Hospital className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Dropped z-index slightly to be safe but high, fixed positioning */}
              <ComboboxContent className="absolute left-0 right-0 top-full mt-2 z-[50] bg-white shadow-2xl border border-slate-200 rounded-xl max-h-[250px] overflow-y-auto">
                {filteredFacilities.length === 0 && !loading && (
                  <ComboboxEmpty className="p-4 text-sm text-slate-500 text-center italic">
                    {i18n.language === 'bn' ? 'কিছু পাওয়া যায়নি' : 'No items found.'}
                  </ComboboxEmpty>
                )}
                <ComboboxList>
                  {(facility: Facility) => (
                    <ComboboxItem 
                      key={facility.id} 
                      value={facility.id}
                      className="flex cursor-pointer items-center px-4 py-3 text-sm font-medium text-slate-700 hover:bg-indigo-50 data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-600 transition-colors border-b border-slate-50 last:border-0"
                    >
                      {facility.facilityName}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        </div>

        {/* Active Facility Banner */}
        <AnimatePresence>
          {activeFacility && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
                <Hospital className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">
                  {i18n.language === 'bn' ? 'সক্রিয় ফ্যাসিলিটি' : 'Selected Facility'}
                </p>
                <p className="text-sm font-black text-slate-800 truncate">
                  {activeFacility.facilityName}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}