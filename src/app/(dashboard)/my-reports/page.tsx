"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  TrendingUp,
  ActivitySquare
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface Report {
  id: string;
  periodStart: string;
  status: string;
  dataSnapshot: {
    suspected24h: number;
    confirmed24h: number;
    suspectedDeath24h: number;
    confirmedDeath24h: number;
    admitted24h: number;
    discharged24h: number;
    serumSent24h: number;
  };
  facility: {
    facilityName: string;
    division: string;
    district: string;
  };
}

export default function MyReportsPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [lastSync, setLastSync] = useState<string>('');

  useEffect(() => {
    fetchMyReports();
  }, []);

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/my-reports');
      const data = await res.json();
      setReports(data);
      
      const now = new Date();
      const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      setLastSync(bdTime.toLocaleString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
      }) + ' BST');
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    return reports.reduce((acc, report) => {
      const snap = report.dataSnapshot || {};
      return {
        suspected24h: acc.suspected24h + (Number(snap.suspected24h) || 0),
        confirmed24h: acc.confirmed24h + (Number(snap.confirmed24h) || 0),
        deaths24h: acc.deaths24h + (Number(snap.confirmedDeath24h) || 0) + (Number(snap.suspectedDeath24h) || 0),
        admitted24h: acc.admitted24h + (Number(snap.admitted24h) || 0),
        discharged24h: acc.discharged24h + (Number(snap.discharged24h) || 0),
        totalReports: acc.totalReports + 1,
      };
    }, { suspected24h: 0, confirmed24h: 0, deaths24h: 0, admitted24h: 0, discharged24h: 0, totalReports: 0 });
  }, [reports]);

  const indicators = useMemo(() => {
    const cfr = totals.confirmed24h > 0 ? (totals.deaths24h / totals.confirmed24h) * 100 : 0;
    const confirmationRate = totals.suspected24h > 0 ? (totals.confirmed24h / totals.suspected24h) * 100 : 0;
    const hospitalizationEfficiency = totals.suspected24h > 0 ? (totals.admitted24h / totals.suspected24h) * 100 : 0;
    return { cfr, confirmationRate, hospitalizationEfficiency };
  }, [totals]);

  const monthlyData = useMemo(() => {
    const data: Record<string, any> = {};
    reports.forEach(report => {
      const month = new Date(report.periodStart).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (!data[month]) {
        data[month] = { name: month, suspected: 0, confirmed: 0, deaths: 0 };
      }
      const snap = report.dataSnapshot || {};
      data[month].suspected += (Number(snap.suspected24h) || 0);
      data[month].confirmed += (Number(snap.confirmed24h) || 0);
      data[month].deaths += (Number(snap.confirmedDeath24h) || 0) + (Number(snap.suspectedDeath24h) || 0);
    });
    return Object.values(data).reverse();
  }, [reports]);

  const filteredReports = useMemo(() => {
    let filtered = [...reports];
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.facility?.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.facility?.division.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.facility?.district.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (dateFilter) {
      filtered = filtered.filter(r => r.periodStart.startsWith(dateFilter));
    }
    return filtered.sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());
  }, [reports, searchTerm, dateFilter]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const handleExportExcel = () => {
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(reports);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "My Reports");
      XLSX.writeFile(wb, `My_Daily_Reports.xlsx`);
    });
  };

  if (!session) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
            My Reports <span className="text-slate-400 font-medium lowercase">/ আমার প্রতিবেদন</span>
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Submitted daily reports for {session.user.facilityName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 flex flex-col items-end shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last sync: {lastSync || '--:--'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Suspected (24h)</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{totals.suspected24h}</p>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100">
              <ActivitySquare className="w-5 h-5 text-rose-600" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Confirmed (24h)</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{totals.confirmed24h}</p>
          <p className="text-xs font-bold text-slate-400 mt-1">{indicators.confirmationRate.toFixed(1)}% confirmation rate</p>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Deaths (24h)</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{totals.deaths24h}</p>
          <p className="text-xs font-bold text-slate-400 mt-1">CFR: {indicators.cfr.toFixed(2)}%</p>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
              <ActivitySquare className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Submissions</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{totals.totalReports}</p>
        </motion.div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black text-slate-800 tracking-tight mb-6">Monthly Trends</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="suspected" name="Suspected" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="confirmed" name="Confirmed" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-black text-slate-800">Report History</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="month" 
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase">
              <Download className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Suspected (24h)</th>
                <th className="px-6 py-4">Confirmed (24h)</th>
                <th className="px-6 py-4">Deaths (24h)</th>
                <th className="px-6 py-4">Admitted (24h)</th>
                <th className="px-6 py-4">Discharged (24h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && paginatedReports.map((report) => {
                const snap = report.dataSnapshot || {};
                return (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {new Date(report.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg font-bold text-xs">{Number(snap.suspected24h) || 0}</span></td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold text-xs">{Number(snap.confirmed24h) || 0}</span></td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-800 text-white rounded-lg font-bold text-xs">{(Number(snap.suspectedDeath24h) || 0) + (Number(snap.confirmedDeath24h) || 0)}</span></td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs">{Number(snap.admitted24h) || 0}</span></td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-xs">{Number(snap.discharged24h) || 0}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && <div className="p-12 text-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>}
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredReports.length)} of {filteredReports.length}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30">←</button>
              <span className="text-xs font-bold text-indigo-600">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-white disabled:opacity-30">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}