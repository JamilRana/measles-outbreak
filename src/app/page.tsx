"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2,
  MapPin,
  Activity,
  Globe,
  Clock,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import { getBdTime } from '@/lib/timezone';
import Footer from '@/components/Footer';
import OutbreakSelector from '@/components/OutbreakSelector';
import UnifiedReportForm from '@/components/UnifiedReportForm';

export default function PublicSubmitPage() {
  const { t, i18n } = useTranslation();
  
  const [selectedOutbreakId, setSelectedOutbreakId] = useState("");
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(getBdTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const districts = useMemo(() => {
    if (!selectedDivision) return [];
    return DISTRICTS[selectedDivision] || [];
  }, [selectedDivision]);

  useEffect(() => {
    if (selectedDivision && selectedDistrict) {
      fetch(`/api/facilities?division=${encodeURIComponent(selectedDivision)}&district=${encodeURIComponent(selectedDistrict)}`)
        .then(res => res.json())
        .then(data => setFacilities(data))
        .catch(() => setFacilities([]));
    }
  }, [selectedDivision, selectedDistrict]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'bn' : 'en');
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Header/Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0c10]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-white tracking-tight leading-none uppercase">HealthMonitor</h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] mt-1 uppercase">Outbreak Reporting Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <div className="flex items-center gap-2 text-indigo-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-sm font-black tabular-nums uppercase" suppressHydrationWarning>
                  {mounted ? currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5" suppressHydrationWarning>
                {mounted ? currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--- --, ----'}
              </span>
            </div>

            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-bold text-xs"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>{i18n.language === 'en' ? 'বাংলা' : 'ENGLISH'}</span>
            </button>
            
            <a href="/login" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/20">
              LOGIN
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">National Health Surveillance</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight"
          >
            Report Daily <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Cases</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Help track and prevent the spread of diseases by providing real-time facility-level data. Select your outbreak context and location to begin.
          </motion.p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Sidebar: Context Selection */}
          <div className="lg:col-span-4 space-y-8 sticky top-28">
            <div className="bg-[#11141b] border border-white/5 p-8 rounded-[32px] shadow-2xl">
              <h2 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                <Zap className="w-5 h-5 text-indigo-500" />
                Step 1: Context
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                    Outbreak Event
                  </label>
                  <OutbreakSelector onSelect={(id) => setSelectedOutbreakId(id)} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                    Division
                  </label>
                  <select
                    value={selectedDivision}
                    onChange={(e) => { setSelectedDivision(e.target.value); setSelectedDistrict(''); setSelectedFacilityId(''); }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="" className="bg-slate-900">Select Division</option>
                    {DIVISIONS.map(div => <option key={div} value={div} className="bg-slate-900">{div}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                    District
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedFacilityId(''); }}
                    disabled={!selectedDivision}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-30 transition-opacity"
                  >
                    <option value="" className="bg-slate-900">Select District</option>
                    {districts.map(dis => <option key={dis} value={dis} className="bg-slate-900">{dis}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                    Healthcare Facility
                  </label>
                  <select
                    value={selectedFacilityId}
                    onChange={(e) => setSelectedFacilityId(e.target.value)}
                    disabled={!selectedDistrict}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-30 transition-opacity"
                  >
                    <option value="" className="bg-slate-900">Select Facility</option>
                    {facilities.map(fac => <option key={fac.id} value={fac.id} className="bg-slate-900">{fac.facilityName}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-3xl flex items-start gap-4">
              <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-1" />
              <div className="text-xs text-slate-400 leading-relaxed font-medium">
                Public submissions are time-limited. Reports must be submitted before the daily cutoff at 2:00 PM (14:00 BD Time).
              </div>
            </div>
          </div>

          {/* Right Section: The Form */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {selectedOutbreakId && selectedFacilityId ? (
                <motion.div
                  key="form-active"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-[#11141b]/50 backdrop-blur-md border border-white/5 p-8 md:p-12 rounded-[40px] shadow-2xl"
                >
                  <div className="flex items-center gap-4 mb-10 pb-6 border-b border-white/5">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-lg">Daily Outbreak Form</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                        Reporting for {facilities.find(f => f.id === selectedFacilityId)?.facilityName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-slate-900 dark:text-slate-100">
                    <UnifiedReportForm 
                      outbreakId={selectedOutbreakId}
                      facilityId={selectedFacilityId}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-[600px] flex flex-col items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-[40px] text-center p-12"
                >
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <MapPin className="w-10 h-10 text-slate-700" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-4 tracking-tight">Ready to Report?</h3>
                  <p className="text-slate-500 max-w-sm font-medium leading-relaxed">
                    Please select an <span className="text-indigo-400 font-bold">outbreak context</span> and your <span className="text-indigo-400 font-bold">healthcare facility</span> from the menu to start your daily submission.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}