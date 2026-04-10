"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, 
  Calendar, 
  MapPin, 
  Download, 
  X, 
  ChevronDown, 
  Filter,
  Search,
  Check,
  Edit2,
  Trash2,
  Globe,
  Globe2,
  Building2,
  FileSpreadsheet,
  FileText,
  RefreshCcw,
  MoreVertical,
  Activity,
  Layers,
  AlertCircle,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DIVISIONS, DISTRICTS_BY_DIVISION } from '@/lib/constants';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';

interface UserData {
  id: string;
  facilityId: string;
  facilityName: string;
  division: string;
  district: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
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
  published: boolean;
  fieldValues?: any[];
}

const CustomMultiSelect = ({ 
  label, 
  options, 
  selected, 
  onChange, 
  icon: Icon,
  placeholder = "Select options..." 
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item: string) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-2 px-4 py-3 bg-white border rounded-2xl text-sm transition-all ${
            isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`block truncate ${selected.length ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
            {selected.length === 0 ? placeholder : `${selected.length} selected`}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 max-h-[300px] overflow-y-auto custom-scrollbar"
            >
              <div className="space-y-1">
                {options.map((option: string) => (
                  <button
                    key={option}
                    onClick={() => toggleOption(option)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      selected.includes(option) 
                        ? 'bg-indigo-50 text-indigo-700 font-bold' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option}
                    {selected.includes(option) && <Check className="w-4 h-4 text-indigo-600" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function ReportingHub() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserData[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'missing'>('all');

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, reportsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch(`/api/reports?date=${selectedDate}`)
      ]);
      
      const usersData = await usersRes.json();
      const reportsData = await reportsRes.json();
      
      if (Array.isArray(usersData)) {
        setUsers(usersData
          .filter((u: any) => u.role === 'USER' || u.facility?.id)
          .map((u: any) => ({
            id: u.id,
            facilityId: u.facilityId || u.facility?.id,
            facilityName: u.facility?.facilityName || u.name || 'Unknown Facility',
            division: u.facility?.division || 'N/A',
            district: u.facility?.district || 'N/A',
            email: u.email || 'N/A',
            phone: u.phone || 'N/A',
            role: u.role,
            isActive: u.isActive
          })));
      }
      
      if (Array.isArray(reportsData)) {
        setReports(reportsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const reportMap = useMemo(() => {
    const map = new Map<string, DailyReport>();
    reports.forEach(r => map.set(r.facilityId, r));
    return map;
  }, [reports]);

  const stats = useMemo(() => {
    const total = users.length;
    const submitted = users.filter(u => u.facilityId && reportMap.has(u.facilityId)).length;
    const missing = total - submitted;
    const rate = total > 0 ? Math.round((submitted / total) * 100) : 0;
    
    // Aggregated metrics from reports
    let suspected = 0, confirmed = 0, deaths = 0;
    reports.forEach(r => {
      suspected += r.suspected24h || 0;
      confirmed += r.confirmed24h || 0;
      deaths += (r.suspectedDeath24h || 0) + (r.confirmedDeath24h || 0);
    });

    return { total, submitted, missing, rate, suspected, confirmed, deaths };
  }, [users, reportMap, reports]);

  const filteredFacilities = useMemo(() => {
    let filtered = [...users];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.facilityName.toLowerCase().includes(q) ||
        u.district.toLowerCase().includes(q)
      );
    }

    if (selectedDivisions.length > 0) {
      filtered = filtered.filter(u => selectedDivisions.includes(u.division));
    }

    if (selectedDistricts.length > 0) {
      filtered = filtered.filter(u => selectedDistricts.includes(u.district));
    }

    if (statusFilter === 'submitted') {
      filtered = filtered.filter(u => u.facilityId && reportMap.has(u.facilityId));
    } else if (statusFilter === 'missing') {
      filtered = filtered.filter(u => !u.facilityId || !reportMap.has(u.facilityId));
    }

    return filtered;
  }, [users, searchQuery, selectedDivisions, selectedDistricts, statusFilter, reportMap]);

  const allAvailableDistricts = useMemo(() => {
    if (selectedDivisions.length === 0) return Object.values(DISTRICTS_BY_DIVISION).flat().sort();
    return selectedDivisions.flatMap(div => DISTRICTS_BY_DIVISION[div] || []).sort();
  }, [selectedDivisions]);

  const resetFilters = () => {
    setSelectedDivisions([]);
    setSelectedDistricts([]);
    setSearchQuery('');
    setStatusFilter('all');
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-20 bg-slate-50/50 min-h-screen">
      <Breadcrumbs />
      {/* Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Layers className="w-48 h-48 rotate-12" />
        </div>
        
        <div className="z-10">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.2em] mb-3">
            <span className="w-8 h-[2px] bg-indigo-600 rounded-full"></span>
            Admin Console
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Reporting Hub
            <span className="text-slate-300 font-light translate-y-0.5">/</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-lg text-sm font-medium leading-relaxed">
            Unified dashboard for monitoring submissions and managing data records across all facilities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
             <input 
               type="date" 
               value={selectedDate} 
               onChange={(e) => setSelectedDate(e.target.value)} 
               className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 px-3 cursor-pointer"
             />
          </div>
          <button className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm shadow-sm transition-all active:scale-95">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Full Log
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        {/* Sidebar Filters */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6 sticky top-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 rounded-xl"><Filter className="w-5 h-5 text-indigo-600" /></div>
                <h3 className="font-black text-slate-800 tracking-tight">Filters</h3>
              </div>
              <button 
                onClick={resetFilters}
                className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 tracking-widest px-2 py-1 hover:bg-indigo-50 rounded-lg transition-all"
              >
                Reset
              </button>
            </div>

            <div className="h-px bg-slate-100 mx-2"></div>

            <div className="space-y-6">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-3.5 h-3.5" /> Quick Search
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search facility name..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-4 pr-10 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" 
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Reporting Status
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all ${statusFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    All ({stats.total})
                  </button>
                  <button 
                    onClick={() => setStatusFilter('submitted')}
                    className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all ${statusFilter === 'submitted' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    Sub ({stats.submitted})
                  </button>
                  <button 
                    onClick={() => setStatusFilter('missing')}
                    className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all ${statusFilter === 'missing' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    Miss ({stats.missing})
                  </button>
                </div>
              </div>

              {/* Location Selects */}
              <CustomMultiSelect 
                label="Divisions" 
                options={DIVISIONS} 
                selected={selectedDivisions} 
                onChange={setSelectedDivisions} 
                icon={MapPin}
                placeholder="All Divisions"
              />

              <CustomMultiSelect 
                label="Districts" 
                options={allAvailableDistricts} 
                selected={selectedDistricts} 
                onChange={setSelectedDistricts} 
                icon={MapPin}
                placeholder={selectedDivisions.length ? "All Districts" : "All Districts"}
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
               <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                    <span>Submission Rate</span>
                    <span className="text-indigo-600">{stats.rate}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.rate}%` }}
                      className="h-full bg-indigo-600"
                    />
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Results Main Section */}
        <div className="xl:col-span-3 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             {[
               { label: 'Facilities', value: stats.total, icon: Building2, color: 'slate' },
               { label: 'Submitted', value: stats.submitted, icon: Check, color: 'emerald' },
               { label: 'Missing', value: stats.missing, icon: AlertCircle, color: 'rose' },
               { label: 'Suspected (Total)', value: stats.suspected, icon: Activity, color: 'indigo' }
             ].map((stat, i) => (
               <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-3 mb-3">
                   <div className={`p-2 bg-slate-50 rounded-xl text-slate-600`}>
                     <stat.icon className="w-4 h-4" />
                   </div>
                   <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-sans">{stat.label}</span>
                 </div>
                 <div className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</div>
               </div>
             ))}
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden relative group">
                   <BarChart3 className="w-5 h-5 relative z-10 transition-transform group-hover:scale-110" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">Reporting Status Log</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{filteredFacilities.length} units listed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 uppercase text-[9px] font-black tracking-widest">
                    <th className="px-8 py-5">Facility / Information</th>
                    <th className="w-[180px] px-6 py-5">Locality</th>
                    <th className="w-[120px] px-6 py-5 text-center">Status</th>
                    <th className="w-[80px] px-6 py-5 text-center">Susp.</th>
                    <th className="w-[80px] px-6 py-5 text-center">Conf.</th>
                    <th className="w-[120px] px-6 py-5 text-center">Visibility</th>
                    <th className="w-[140px] px-8 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-32 text-center bg-white">
                         <div className="flex flex-col items-center gap-4">
                           <RefreshCcw className="w-8 h-8 text-indigo-400 animate-spin" />
                           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Records...</p>
                         </div>
                      </td>
                    </tr>
                  ) : filteredFacilities.map((facility) => {
                    const report = reportMap.get(facility.facilityId);
                    return (
                      <tr key={facility.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                              <Building2 className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <div className="flex flex-col min-w-0">
                               <span className="font-bold text-slate-800 text-sm truncate">{facility.facilityName}</span>
                               <span className="text-[10px] font-bold text-slate-400">{facility.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{facility.district}</span>
                              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{facility.division}</span>
                           </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {report ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                               <Check className="w-3 h-3" /> Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-wider italic">
                               Missing
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                           <span className={`text-xs font-bold ${report ? 'text-indigo-600' : 'text-slate-200'}`}>
                             {report?.suspected24h ?? '-'}
                           </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                           <span className={`text-xs font-bold ${report ? 'text-emerald-600' : 'text-slate-200'}`}>
                             {report?.confirmed24h ?? '-'}
                           </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                           {report && (
                             <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase ${report.published ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                               {report.published ? 'Live' : 'Draft'}
                             </span>
                           )}
                        </td>
                        <td className="px-8 py-5 text-center">
                           <div className="flex items-center justify-center gap-1 opacity-10 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                             {report ? (
                               <>
                                 <Link 
                                   href={`/admin/reports?id=${report.id}`}
                                   className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                   title="View In Reports"
                                 >
                                   <Eye className="w-4 h-4" />
                                 </Link>
                                 <button 
                                   className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                   title="Delete Record"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </>
                             ) : (
                               <button 
                                 className="px-3 py-1.5 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 rounded-lg"
                               >
                                 Remind
                               </button>
                             )}
                           </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && filteredFacilities.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-32 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Search className="w-8 h-8 text-slate-200" />
                          <p className="text-slate-400 font-bold text-sm">No facilities match your filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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