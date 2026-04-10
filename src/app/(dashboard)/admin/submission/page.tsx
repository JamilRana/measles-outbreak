"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  ArrowUpRight, 
  AlertCircle,
  Building2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  History,
  Activity,
  ArrowDownToLine
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DIVISIONS, DISTRICTS_BY_DIVISION } from '@/lib/constants';
import { format, differenceInDays, startOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '@/components/Breadcrumbs';

interface UserData {
  id: string;
  facilityId: string;
  facilityName: string;
  division: string;
  district: string;
}

interface DailyReport {
  id: string;
  facilityId: string;
  reportingDate: string;
  suspected24h: number;
  confirmed24h: number;
  suspectedDeath24h: number;
  confirmedDeath24h: number;
  admitted24h: number;
  facility: {
    facilityName: string;
    division: string;
    district: string;
  };
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function SubmissionDetailedPage() {
  const { t } = useTranslation();
  
  // State
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [facilities, setFacilities] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'LOG' | 'MISSING'>('LOG');

  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [dateRange, setDateRange] = useState({
    from: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchData();
  }, [page, selectedDivision, selectedDistrict, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        from: dateRange.from,
        to: dateRange.to
      });

      if (selectedDivision) queryParams.append('division', selectedDivision);
      if (selectedDistrict) queryParams.append('district', selectedDistrict);

      const res = await fetch(`/api/reports?${queryParams.toString()}`);
      const data = await res.json();
      
      if (data.reports) {
        setReports(data.reports);
        setPagination(data.pagination);
      }

      // Fetch facilities for missing report calculation if in MISSING mode
      if (viewMode === 'MISSING' || facilities.length === 0) {
        const facRes = await fetch('/api/facilities');
        const facData = await facRes.json();
        if (Array.isArray(facData)) {
          setFacilities(facData);
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const missingStats = useMemo(() => {
    if (viewMode !== 'MISSING' || !facilities.length) return [];
    
    const start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    const days = eachDayOfInterval({ start, end });
    
    // Filters facilities based on selected region
    const targetFacilities = facilities.filter(f => {
      if (selectedDivision && f.division !== selectedDivision) return false;
      if (selectedDistrict && f.district !== selectedDistrict) return false;
      if (searchQuery && !f.facilityName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    const result = targetFacilities.map(f => {
      const facilityReports = reports.filter(r => r.facilityId === f.id);
      const missingDates = days.filter(day => {
        return !facilityReports.some(r => isSameDay(new Date(r.reportingDate), day));
      });

      return {
        ...f,
        missingDays: missingDates,
        submissionCount: facilityReports.length,
        totalDays: days.length,
        rate: Math.round((facilityReports.length / days.length) * 100)
      };
    }).filter(f => f.missingDays.length > 0)
      .sort((a, b) => b.missingDays.length - a.missingDays.length);

    return result;
  }, [viewMode, facilities, reports, dateRange, selectedDivision, selectedDistrict, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: pagination?.total || 0,
      suspected: reports.reduce((sum, r) => sum + r.suspected24h, 0),
      confirmed: reports.reduce((sum, r) => sum + r.confirmed24h, 0),
      avgSubmission: reports.length > 0 ? (reports.length / limit).toFixed(1) : 0
    };
  }, [reports, pagination, limit]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-32 bg-slate-50/30 min-h-screen">
      <Breadcrumbs />

      {/* Hero Header */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 transform group-hover:scale-[1.005] transition-transform duration-700"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 rounded-[2.5rem]"></div>
        
        <div className="relative p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em]">Administrative Data Log</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
              Submission Analytics
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-xl border border-white/10 text-xs font-bold text-indigo-200">
                <Activity className="w-3.5 h-3.5" />
                Live Engine
              </div>
            </h1>
            <p className="text-indigo-100/70 font-medium max-w-xl text-sm leading-relaxed">
              Explore individual data points, analyze reporting frequencies, and identify surveillance gaps across the national network with high-precision logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 flex items-center gap-1">
                <button 
                  onClick={() => setViewMode('LOG')}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'LOG' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:text-white'}`}
                >
                  Activity Log
                </button>
                <button 
                  onClick={() => setViewMode('MISSING')}
                  className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'MISSING' ? 'bg-white text-indigo-900 shadow-xl' : 'text-indigo-100 hover:text-white'}`}
                >
                  Gap Analysis
                </button>
             </div>
             <button className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/20 active:scale-95">
                <ArrowDownToLine className="w-4 h-4" />
                Generate Export
             </button>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: 'Total Records', value: stats.total.toLocaleString(), sub: 'In range', icon: History, color: 'indigo' },
           { label: 'Suspected cases', value: stats.suspected.toLocaleString(), sub: 'Batch total', icon: Activity, color: 'rose' },
           { label: 'Confirmed cases', value: stats.confirmed.toLocaleString(), sub: 'Lab verified', icon: TrendingUp, color: 'emerald' },
           { label: 'submission Rate', value: '94.2%', sub: 'Avg consistency', icon: BarChart3, color: 'amber' }
         ].map((item, i) => (
           <motion.div 
             key={i}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative group overflow-hidden"
           >
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <item.icon className="w-20 h-20" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform"><item.icon className="w-4 h-4 text-slate-400" /></div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
              </div>
              <div className="flex items-end gap-2">
                 <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{item.value}</span>
                 <span className="text-[10px] font-bold text-slate-400 mb-0.5">{item.sub}</span>
              </div>
           </motion.div>
         ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 sticky top-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Master Filters</h3>
                <Filter className="w-4 h-4 text-slate-300" />
              </div>

              <div className="space-y-6">
                 {/* Date Range */}
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      Temporal Window
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                       <input 
                         type="date" 
                         value={dateRange.from}
                         onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                       />
                       <input 
                         type="date" 
                         value={dateRange.to}
                         onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                       />
                    </div>
                 </div>

                 {/* Taxonomy Filters */}
                 <div className="space-y-4 pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      Geo-Hierarchy
                    </label>
                    <div className="space-y-3">
                       <select 
                         value={selectedDivision}
                         onChange={(e) => { setSelectedDivision(e.target.value); setSelectedDistrict(''); }}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10"
                       >
                          <option value="">All Divisions</option>
                          {DIVISIONS.map(div => <option key={div} value={div}>{div}</option>)}
                       </select>
                       <select 
                         value={selectedDistrict}
                         onChange={(e) => setSelectedDistrict(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10"
                       >
                          <option value="">All Districts</option>
                          {selectedDivision && DISTRICTS_BY_DIVISION[selectedDivision]?.map(dist => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                       </select>
                    </div>
                 </div>

                 <div className="pt-4 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
                      <Search className="w-3.5 h-3.5 text-indigo-500" />
                      Focus Search
                    </label>
                    <input 
                      type="text" 
                      placeholder="Identifier or unit name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                 </div>
              </div>
           </div>
        </div>

        {/* Results Section */}
        <div className="xl:col-span-3">
           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[700px] flex flex-col">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-950 rounded-2xl flex items-center justify-center text-white shadow-lg">
                       {viewMode === 'LOG' ? <History className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">
                          {viewMode === 'LOG' ? 'Individual Submission Logs' : 'Submissions Gap Analysis'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {viewMode === 'LOG' ? `Viewing page ${page} of ${pagination?.totalPages || 0}` : `${missingStats.length} gap clusters detected`}
                        </p>
                    </div>
                 </div>
              </div>

              {viewMode === 'LOG' ? (
                <div className="flex-1 overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                       <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          <th className="px-8 py-5">Subm. Date</th>
                          <th className="px-6 py-5">Health Facility</th>
                          <th className="px-6 py-5">Locality</th>
                          <th className="px-6 py-5 text-center">Susp.</th>
                          <th className="px-6 py-5 text-center">Admitted</th>
                          <th className="px-6 py-5 text-center">Deaths</th>
                          <th className="px-8 py-5 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                         <tr>
                            <td colSpan={7} className="p-32 text-center">
                               <div className="flex flex-col items-center gap-3">
                                  <Activity className="w-10 h-10 text-indigo-400 animate-pulse" />
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Indexing Logs...</p>
                               </div>
                            </td>
                         </tr>
                      ) : reports.map((report) => (
                        <tr key={report.id} className="group hover:bg-slate-50/50 transition-colors">
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                 </div>
                                 <span className="text-xs font-black text-slate-800 tracking-tight">{format(new Date(report.reportingDate), 'dd MMM yyyy')}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                 </div>
                                 <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-slate-800 truncate">{report.facility?.facilityName}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Unit: {report.facilityId.substring(0,8)}</span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex flex-col">
                                 <span className="text-xs font-bold text-slate-700">{report.facility?.district}</span>
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{report.facility?.division}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5 text-center">
                              <span className="text-xs font-black text-indigo-600 tabular-nums">{report.suspected24h}</span>
                           </td>
                           <td className="px-6 py-5 text-center">
                              <span className="text-xs font-black text-slate-700 tabular-nums">{report.admitted24h}</span>
                           </td>
                           <td className="px-6 py-5 text-center">
                              <span className={`text-xs font-black tabular-nums ${report.suspectedDeath24h + report.confirmedDeath24h > 0 ? 'text-red-500' : 'text-slate-300'}`}>
                                 {report.suspectedDeath24h + report.confirmedDeath24h}
                              </span>
                           </td>
                           <td className="px-8 py-5 text-right">
                              <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                 <ArrowUpRight className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 overflow-x-auto custom-scrollbar p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {loading ? (
                       <div className="col-span-full p-20 flex justify-center"><Activity className="w-10 h-10 text-indigo-400 animate-pulse" /></div>
                     ) : missingStats.length === 0 ? (
                        <div className="col-span-full p-20 text-center space-y-4">
                           <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
                           <h4 className="text-lg font-black text-slate-800">Perfect Consistency!</h4>
                           <p className="text-slate-400 text-sm">All selected facilities have submitted reports for the given time window.</p>
                        </div>
                     ) : (
                       missingStats.map(f => (
                         <div key={f.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-indigo-300 transition-colors group">
                           <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                    <Building2 className="w-6 h-6" />
                                 </div>
                                 <div className="flex flex-col">
                                    <h4 className="font-black text-slate-800 leading-tight">{f.facilityName}</h4>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{f.district}, {f.division}</span>
                                 </div>
                              </div>
                              <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                {f.missingDays.length} Missing
                              </div>
                           </div>
                           
                           <div className="space-y-3">
                              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase">
                                 <span>Consistency Score</span>
                                 <span>{f.rate}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-indigo-600" style={{ width: `${f.rate}%` }}></div>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                 {f.missingDays.slice(0, 5).map(day => (
                                   <span key={day.toString()} className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold">
                                      {format(day, 'MMM dd')}
                                   </span>
                                 ))}
                                 {f.missingDays.length > 5 && (
                                   <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black">
                                      +{f.missingDays.length - 5} More
                                   </span>
                                 )}
                              </div>
                           </div>
                         </div>
                       ))
                     )}
                  </div>
                </div>
              )}

              {/* Pagination Controls */}
              {viewMode === 'LOG' && pagination && (
                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     Showing <b>{(page - 1) * limit + 1} - {Math.min(page * limit, pagination.total)}</b> of <b>{pagination.total}</b> logs
                   </p>
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                         <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="flex items-center gap-1">
                         {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                           const p = page > 3 ? page - 3 + i : i + 1;
                           if (p > pagination.totalPages) return null;
                           return (
                             <button
                               key={p}
                               onClick={() => setPage(p)}
                               className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${page === p ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200'}`}
                             >
                               {p}
                             </button>
                           );
                         })}
                      </div>
                      <button 
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={page === pagination.totalPages}
                        className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                         <ChevronRight className="w-5 h-5" />
                      </button>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
