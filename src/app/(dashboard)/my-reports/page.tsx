"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  Hospital, 
  Skull, 
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Activity
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
import { motion } from 'motion/react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
  createdAt: string;
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
    return reports.reduce((acc, report) => ({
      suspected24h: acc.suspected24h + report.suspected24h,
      confirmed24h: acc.confirmed24h + report.confirmed24h,
      deaths24h: acc.deaths24h + report.confirmedDeath24h + report.suspectedDeath24h,
      admitted24h: acc.admitted24h + report.admitted24h,
      discharged24h: acc.discharged24h + report.discharged24h,
      totalReports: acc.totalReports + 1,
    }), { suspected24h: 0, confirmed24h: 0, deaths24h: 0, admitted24h: 0, discharged24h: 0, totalReports: 0 });
  }, [reports]);

  const monthlyData = useMemo(() => {
    const data: Record<string, any> = {};
    reports.forEach(report => {
      const month = new Date(report.reportingDate).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (!data[month]) {
        data[month] = { name: month, suspected: 0, confirmed: 0, deaths: 0 };
      }
      data[month].suspected += report.suspected24h;
      data[month].confirmed += report.confirmed24h;
      data[month].deaths += report.confirmedDeath24h + report.suspectedDeath24h;
    });
    return Object.values(data).reverse();
  }, [reports]);

  const filteredReports = useMemo(() => {
    let filtered = [...reports];
    
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.division.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.district.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (dateFilter) {
      filtered = filtered.filter(r => 
        new Date(r.reportingDate).toISOString().split('T')[0] === dateFilter
      );
    }
    
    return filtered.sort((a, b) => new Date(b.reportingDate).getTime() - new Date(a.reportingDate).getTime());
  }, [reports, searchTerm, dateFilter]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text("My Submitted Reports", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    const tableData = paginatedReports.map(r => [
      new Date(r.reportingDate).toLocaleDateString(),
      r.division,
      r.district,
      r.suspected24h,
      r.confirmed24h,
      r.confirmedDeath24h + r.suspectedDeath24h,
    ]);

    autoTable(doc, { 
      startY: 35, 
      head: [['Date', 'Division', 'District', 'Susp.', 'Conf.', 'Deaths']], 
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95] }
    });
    doc.save(`My_Reports_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setCurrentPage(1);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Please login to view your reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <header className="bg-white border-b-2 border-slate-300 pt-8 pb-10 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Submitted Reports</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              {session.user.facilityName}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Sync</span>
              <span className="text-xs font-bold text-slate-700">{lastSync || 'Syncing...'}</span>
            </div>
            <button 
              onClick={fetchMyReports}
              className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100"
            >
              <Activity className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 mt-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard 
            title="Total Reports" 
            value={totals.totalReports} 
            icon={<FileText />} 
            color="#4F46E5"
          />
          <SummaryCard 
            title="Suspected (24h)" 
            value={totals.suspected24h.toLocaleString()} 
            icon={<Users />} 
            color="#F59E0B"
          />
          <SummaryCard 
            title="Confirmed (24h)" 
            value={totals.confirmed24h.toLocaleString()} 
            icon={<CheckCircle2 />} 
            color="#EF4444"
          />
          <SummaryCard 
            title="Deaths (24h)" 
            value={totals.deaths24h.toLocaleString()} 
            icon={<Skull />} 
            color="#0F172A"
          />
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-300 shadow-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Monthly Trend</h3>
              <p className="text-sm text-slate-400 font-medium">Your reported cases over time</p>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="suspected" name="Suspected" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="confirmed" name="Confirmed" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deaths" name="Deaths" fill="#0F172A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-md overflow-hidden">
          <div className="p-8 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-xl">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Report History</h3>
              <span className="text-xs font-bold text-slate-400">({filteredReports.length} records)</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  value={dateFilter}
                  onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              
              {(searchTerm || dateFilter) && (
                <button 
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  Clear filters
                </button>
              )}
              
              <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500">
                <Download className="w-4 h-4" /> PDF
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-4">Date & Time</th>
                  <th className="px-6 py-4">Division</th>
                  <th className="px-6 py-4">District</th>
                  <th className="px-6 py-4 text-center">Susp. (24h)</th>
                  <th className="px-6 py-4 text-center">Conf. (24h)</th>
                  <th className="px-6 py-4 text-center">Deaths (24h)</th>
                  <th className="px-6 py-4 text-center">Adm. (24h)</th>
                  <th className="px-8 py-4 text-right">Disch. (24h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-400 font-bold text-sm">Loading your reports...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-20 text-center text-slate-400 font-medium">
                      No reports found
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-900">
                          {new Date(report.reportingDate).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                          })}
                        </div>
                        <div className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(report.createdAt).toLocaleTimeString('en-US', { 
                            hour: '2-digit', minute: '2-digit', hour12: true 
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-5 font-medium text-slate-700">{report.division}</td>
                      <td className="px-6 py-5 font-medium text-slate-700">{report.district}</td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg font-black text-xs border border-amber-100">
                          {report.suspected24h}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-3 py-1 bg-red-50 text-red-700 rounded-lg font-black text-xs border border-red-100">
                          {report.confirmed24h}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-3 py-1 bg-slate-900 text-slate-100 rounded-lg font-black text-xs">
                          {report.suspectedDeath24h + report.confirmedDeath24h}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-black text-xs border border-blue-100">
                          {report.admitted24h}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-black text-xs border border-emerald-100">
                          {report.discharged24h}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredReports.length > itemsPerPage && (
            <div className="px-8 py-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-500 font-medium">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredReports.length)} of {filteredReports.length} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                        currentPage === pageNum 
                          ? 'bg-indigo-600 text-white' 
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-7 rounded-[2rem] border border-slate-300 shadow-md relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-500" />
      
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="p-3.5 rounded-2xl border shadow-md" style={{ backgroundColor: `${color}10`, borderColor: `${color}20`, color: color }}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })}
        </div>
      </div>
      
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">{title}</p>
        <p className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{value}</p>
      </div>
    </motion.div>
  );
}