"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { 
  TrendingUp, 
  Users, 
  Hospital, 
  Skull, 
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  Globe,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { motion } from 'motion/react';
import { DIVISIONS } from '@/lib/constants';
import Link from 'next/link';
import MarqueeBanner from '@/components/MarqueeBanner';
import Footer from '@/components/Footer';
import OutbreakMap from '@/components/OutbreakMap';
import EpiInsights from '@/components/EpiInsights';

interface DailyReport {
  id: string;
  reportingDate: string;
  suspected24h: number;
  confirmed24h: number;
  suspectedDeath24h: number;
  confirmedDeath24h: number;
  admitted24h: number;
  discharged24h: number;
  serumSent24h: number;
  user: {
    facilityName: string;
    division: string;
    district: string;
  };
}

export default function IndexPage() {
  const { t, i18n } = useTranslation();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'bn' ? 'en' : 'bn';
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch(`/api/reports`);
        const data = await res.json();
        setReports(data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const totals = useMemo(() => {
    return reports.reduce((acc, report) => ({
      suspected: acc.suspected + report.suspected24h,
      confirmed: acc.confirmed + report.confirmed24h,
      deaths: acc.deaths + report.suspectedDeath24h + report.confirmedDeath24h,
      hospitalized: acc.hospitalized + report.admitted24h,
    }), { suspected: 0, confirmed: 0, deaths: 0, hospitalized: 0 });
  }, [reports]);

  const divisionData = useMemo(() => {
    const data: Record<string, { name: string; suspected: number; confirmed: number }> = {};
    DIVISIONS.forEach(div => {
      data[div] = { name: div, suspected: 0, confirmed: 0 };
    });
    reports.forEach(report => {
      if (data[report.user.division]) {
        data[report.user.division].suspected += report.suspected24h;
        data[report.user.division].confirmed += report.confirmed24h;
      }
    });
    return Object.values(data);
  }, [reports]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
              <Image src="/dghs_logo.svg" alt="DGHS Logo" width={36} height={36} className="w-9 h-9" />
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">{t('app.shortTitle')}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-all text-sm font-semibold"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{i18n.language === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">{t('nav.login')}</Link>
            <Link href="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all">{t('nav.register')}</Link>
          </div>
        </div>
      </nav>

      {/* Marquee Banner */}
      <MarqueeBanner />

      <main className="p-8 max-w-7xl mx-auto space-y-8 pb-16 flex-1">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">{t('home.title')}</h1>
          <p className="text-slate-500 text-lg leading-relaxed text-balance">{t('home.subtitle')}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard title={t('stats.totalSuspected')} value={totals.suspected} icon={<Users className="w-6 h-6" />} color="indigo" />
          <StatsCard title={t('stats.totalConfirmed')} value={totals.confirmed} icon={<CheckCircle2 className="w-6 h-6" />} color="emerald" />
          <StatsCard title={t('stats.totalMortality')} value={totals.deaths} icon={<Skull className="w-6 h-6" />} color="rose" />
          <StatsCard title={t('stats.totalHospitalized')} value={totals.hospitalized} icon={<Hospital className="w-6 h-6" />} color="amber" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative">
            <div className="flex items-center gap-3 mb-8"><div className="p-2 bg-indigo-50 rounded-lg"><TrendingUp className="w-5 h-5 text-indigo-600" /></div><h3 className="text-xl font-bold text-slate-800">{t('charts.geographicDistribution')}</h3></div>
            <div className="h-[350px] w-full">
              {loading ? <LoadingSkeleton /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={divisionData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" stroke="#64748b" fontSize={12}/><YAxis stroke="#64748b" fontSize={12}/><Tooltip cursor={{ fill: '#f8fafc' }}/><Bar dataKey="suspected" fill="#6366f1" radius={[6, 6, 0, 0]} /><Bar dataKey="confirmed" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-8"><div className="p-2 bg-rose-50 rounded-lg"><PieChartIcon className="w-5 h-5 text-rose-600" /></div><h3 className="text-xl font-bold text-slate-800">{t('charts.caseProportions')}</h3></div>
            <div className="h-[350px] w-full flex-1">
              {loading ? <LoadingSkeleton circular /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={[{ name: t('stats.suspected'), value: totals.suspected }, { name: t('stats.confirmed'), value: totals.confirmed }, { name: t('stats.mortality'), value: totals.deaths }]} innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value"><Cell fill="#6366f1" /><Cell fill="#10b981" /><Cell fill="#f43f5e" /></Pie><Tooltip /><Legend /></PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Outbreak Map */}
        <OutbreakMap apiEndpoint="/api/reports/geo" />

        {/* Epidemiological Insights */}
        <EpiInsights apiEndpoint="/api/reports/timeseries" />

        {/* Recent Submissions Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-slate-200 rounded-lg"><BarChart3 className="w-5 h-5 text-slate-600" /></div>
               <h3 className="text-xl font-bold text-slate-800">{t('charts.recentSubmissions')}</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-black tracking-[0.1em]">
                  <th className="px-8 py-4">{t('charts.divisionDistrict')}</th>
                  <th className="px-6 py-4">{t('charts.facility')}</th>
                  <th className="px-6 py-4 text-center">{t('stats.suspected')}</th>
                  <th className="px-6 py-4 text-center">{t('stats.confirmed')}</th>
                  <th className="px-6 py-4 text-center">{t('stats.mortality')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && reports.slice(0, 10).map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-4">
                      <div className="font-semibold text-slate-800">{report.user.division}</div>
                      <div className="text-xs text-slate-500">{report.user.district}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{report.user.facilityName}</td>
                    <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-bold text-sm">{report.suspected24h}</span></td>
                    <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md font-bold text-sm">{report.confirmed24h}</span></td>
                    <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-md font-bold text-sm">{report.suspectedDeath24h + report.confirmedDeath24h}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" /></div>}
            {!loading && reports.length === 0 && <div className="p-20 text-center text-slate-400 font-medium flex flex-col items-center gap-4"><p>{t('charts.noReports')}</p></div>}
          </div>
          <div className="p-8 text-center bg-slate-50/50 border-t border-slate-100">
            <p className="text-slate-500 text-sm font-medium">{t('home.signInPrompt')} <Link href="/login" className="text-indigo-600 font-bold hover:underline">{t('home.signInLink')}</Link>.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function StatsCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = { indigo: "bg-indigo-600 text-indigo-50", emerald: "bg-emerald-600 text-emerald-50", rose: "bg-rose-600 text-rose-50", amber: "bg-amber-600 text-amber-50" };
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
      <div className={`p-4 rounded-2xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-slate-900 mt-1 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton({ circular = false }) {
  return (
    <div className={`w-full h-full bg-slate-100 animate-pulse ${circular ? 'rounded-full' : 'rounded-2xl'}`} />
  );
}

function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}
