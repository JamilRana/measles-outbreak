"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Map as MapIcon, 
  Activity, 
  ShieldCheck, 
  ChevronRight, 
  ArrowRight,
  Target,
  Zap,
  Globe,
  Users,
  LineChart as LineChartIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import OutbreakMap from '@/components/OutbreakMap';
import Footer from '@/components/Footer';
import { useTranslation } from 'react-i18next';

export default function LandingPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    suspected: 0,
    confirmed: 0,
    deaths: 0,
    hospitalized: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/reports/summary');
        const data = await res.json();
        setStats(data.totals);
      } catch (e) {
        console.error('Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden bg-[#1E3A5F]">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F] via-[#1E3A5F] to-indigo-900" />
          <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            className="absolute inset-x-0 top-0 bottom-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs font-black uppercase tracking-widest mb-6"
            >
              <Zap className="w-3 h-3 text-indigo-400 fill-indigo-400" />
              National Surveillance Portal
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight uppercase"
            >
              Real-time Outbreak <br/>
              <span className="text-indigo-400 italic">Monitoring Platform</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-lg text-indigo-100/70 font-medium max-w-2xl mx-auto"
            >
              Unified multi-disease surveillance engine for Bangladesh. Empowering public health decisions through dynamic data and interactive geolocation.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link 
                href="/" 
                className="w-full sm:w-auto px-8 py-4 bg-white text-[#1E3A5F] rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-950/20 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
              >
                Submit Facilty Report
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-8 py-4 bg-indigo-500/20 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                Sign In to Dashboard
                <Target className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Float Stats Line */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatMini label="Suspected" value={stats.suspected} color="amber" />
             <StatMini label="Confirmed" value={stats.confirmed} color="rose" />
             <StatMini label="Hospitalized" value={stats.hospitalized} color="indigo" />
             <StatMini label="Mortality" value={stats.deaths} color="slate" />
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
             <div className="lg:w-1/3 space-y-8">
                <div>
                   <div className="inline-flex p-3 bg-indigo-50 rounded-2xl text-indigo-600 mb-4 border border-indigo-100 shadow-sm">
                      <Globe className="w-6 h-6" />
                   </div>
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Geographic <br/> Distribution</h2>
                   <p className="text-slate-500 mt-4 font-medium leading-relaxed">
                      Visualize outbreak intensity across divisions and districts. This map utilizes real-time facility submissions to generate bubble-weighted risk assessments.
                   </p>
                </div>

                <div className="space-y-4">
                   <FeatureItem icon={<ShieldCheck />} title="Verified Data" desc="All reports are strictly monitored by regional DHIS2 coordinators." />
                   <FeatureItem icon={<LineChartIcon />} title="Trend Analysis" desc="Longitudinal tracking of transmission rates and containment success." />
                   <FeatureItem icon={<Users />} title="Public Health Action" desc="Direct linkage between reporting and national response protocols." />
                </div>

                <Link href="/login" className="inline-flex items-center gap-2 text-indigo-600 font-extrabold uppercase tracking-widest text-xs hover:gap-3 transition-all pt-4 group">
                  Access Detailed Analytics 
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1" />
                </Link>
             </div>

             <div className="lg:w-2/3 w-full">
                <OutbreakMap />
             </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-center border-t border-white/5">
         <div className="max-w-4xl mx-auto px-6">
            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Are you a healthcare facility administrator?</h3>
            <p className="text-slate-400 mb-8 font-medium">Register your facility to begin contributing to the national outbreaks monitoring system.</p>
            <div className="flex justify-center gap-4">
               <Link href="/register" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/10">Register Facility</Link>
               <Link href="/" className="px-8 py-3 bg-transparent border border-slate-700 text-slate-300 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Report Outbreak</Link>
            </div>
         </div>
      </section>

      <Footer />
    </div>
  );
}

function StatMini({ label, value, color }: { label: string, value: number, color: string }) {
  const colors: Record<string, string> = {
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-500",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-500",
    indigo: "bg-[#3B82F6]/10 border-[#3B82F6]/20 text-[#3B82F6]",
    slate: "bg-white/10 border-white/10 text-white"
  };

  return (
    <div className={`p-4 rounded-2xl border backdrop-blur-md ${colors[color]}`}>
      <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">{label}</p>
      <p className="text-2xl font-black tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0 shadow-sm">
        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
      </div>
      <div>
        <h4 className="font-bold text-slate-800 text-sm tracking-tight capitalize">{title}</h4>
        <p className="text-slate-500 text-xs leading-relaxed mt-1">{desc}</p>
      </div>
    </div>
  );
}
