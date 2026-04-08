"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Hospital, 
  Skull, 
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
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

interface Report {
  id: string;
  reportingDate: string;
  division: string;
  district: string;
  facilityName: string;
  suspected24h: number;
  suspectedYTD: number;
  confirmed24h: number;
  confirmedYTD: number;
  suspectedDeath24h: number;
  suspectedDeathYTD: number;
  confirmedDeath24h: number;
  confirmedDeathYTD: number;
  admitted24h: number;
  admittedYTD: number;
  discharged24h: number;
  dischargedYTD: number;
  serumSentYTD: number;
}

export default function IndexPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

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
    const data: any = {};
    DIVISIONS.forEach(div => {
      data[div] = { name: div, suspected: 0, confirmed: 0 };
    });
    reports.forEach(report => {
      if (data[report.division]) {
        data[report.division].suspected += report.suspected24h;
        data[report.division].confirmed += report.confirmed24h;
      }
    });
    return Object.values(data);
  }, [reports]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            <span className="font-bold text-xl text-slate-800 tracking-tight">Measles Monitor</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Login</Link>
            <Link href="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all">Register Facility</Link>
          </div>
        </div>
      </nav>

      <main className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Public Monitoring Dashboard</h1>
          <p className="text-slate-500 text-lg leading-relaxed text-balance">Real-time situational awareness and outbreak tracking across all districts of Bangladesh. Data updated manually by health facilities.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard title="Total Suspected" value={totals.suspected} icon={<Users className="w-6 h-6" />} color="indigo" />
          <StatsCard title="Total Confirmed" value={totals.confirmed} icon={<CheckCircle2 className="w-6 h-6" />} color="emerald" />
          <StatsCard title="Total Mortality" value={totals.deaths} icon={<Skull className="w-6 h-6" />} color="rose" />
          <StatsCard title="Total Hospitalized" value={totals.hospitalized} icon={<Hospital className="w-6 h-6" />} color="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative">
            <div className="flex items-center gap-3 mb-8"><div className="p-2 bg-indigo-50 rounded-lg"><TrendingUp className="w-5 h-5 text-indigo-600" /></div><h3 className="text-xl font-bold text-slate-800">Geographic Distribution</h3></div>
            <div className="h-[350px] w-full">
              {loading ? <LoadingSkeleton /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={divisionData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" stroke="#64748b" fontSize={12}/><YAxis stroke="#64748b" fontSize={12}/><Tooltip cursor={{ fill: '#f8fafc' }}/><Bar dataKey="suspected" fill="#6366f1" radius={[6, 6, 0, 0]} /><Bar dataKey="confirmed" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-8"><div className="p-2 bg-rose-50 rounded-lg"><PieChartIcon className="w-5 h-5 text-rose-600" /></div><h3 className="text-xl font-bold text-slate-800">Case Proportions</h3></div>
            <div className="h-[350px] w-full flex-1">
              {loading ? <LoadingSkeleton circular /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={[{ name: 'Suspected', value: totals.suspected }, { name: 'Confirmed', value: totals.confirmed }, { name: 'Deaths', value: totals.deaths }]} innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value"><Cell fill="#6366f1" /><Cell fill="#10b981" /><Cell fill="#f43f5e" /></Pie><Tooltip /><Legend /></PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-slate-200 rounded-lg"><BarChart3 className="w-5 h-5 text-slate-600" /></div>
               <h3 className="text-xl font-bold text-slate-800">Recent Submissions</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-black tracking-[0.1em]">
                  <th className="px-8 py-4">Division / District</th>
                  <th className="px-6 py-4">Facility</th>
                  <th className="px-6 py-4 text-center">Suspected</th>
                  <th className="px-6 py-4 text-center">Confirmed</th>
                  <th className="px-6 py-4 text-center">Deaths</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && reports.slice(0, 10).map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-4">
                      <div className="font-semibold text-slate-800">{report.division}</div>
                      <div className="text-xs text-slate-500">{report.district}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{report.facilityName}</td>
                    <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-bold text-sm">{report.suspected24h}</span></td>
                    <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md font-bold text-sm">{report.confirmed24h}</span></td>
                    <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-md font-bold text-sm">{report.suspectedDeath24h + report.confirmedDeath24h}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" /></div>}
            {!loading && reports.length === 0 && <div className="p-20 text-center text-slate-400 font-medium flex flex-col items-center gap-4"><p>No reports available</p></div>}
          </div>
          <div className="p-8 text-center bg-slate-50/50 border-t border-slate-100">
            <p className="text-slate-500 text-sm font-medium">To access full details, filtering, and export tools, please <Link href="/login" className="text-indigo-600 font-bold hover:underline">sign in</Link>.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatsCard({ title, value, icon, color }: any) {
  const colors: any = { indigo: "bg-indigo-600 text-indigo-50", emerald: "bg-emerald-600 text-emerald-50", rose: "bg-rose-600 text-rose-50", amber: "bg-amber-600 text-amber-50" };
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

function Loader2(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}
