"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  Users, 
  Hospital, 
  Skull, 
  Download, 
  Filter, 
  Calendar,
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  CloudOff,
  Edit,
  X,
  Check,
  Search,
  ActivitySquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  Activity,
  AlertCircle,
  Zap,
  Map as MapIcon,
  Table as TableIcon,
  ArrowUpRight,
  PlusSquare,
  Info
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
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';
import OutbreakMap from '@/components/OutbreakMap';
import EpiInsights from '@/components/EpiInsights';
import { generateGovtPDF } from '@/lib/pdf-report-generator';
import OutbreakSelector from '@/components/OutbreakSelector';

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
  facility?: {
    facilityName: string;
    division: string;
    district: string;
  };
  outbreak?: {
    name: string;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [allReports, setAllReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'today'>('all');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [lastSync, setLastSync] = useState<string>('');
  const [selectedOutbreakId, setSelectedOutbreakId] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [userStats, setUserStats] = useState({ totalUsers: 0, activeToday: 0, submissionRate: 0 });

  useEffect(() => {
    const now = new Date();
    const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    setLastSync(bdTime.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' BST');
  }, []);

  useEffect(() => {
    fetchReports();
    fetchUserStats();
  }, [viewMode, filterDate, dateRange, selectedDivision, selectedDistrict, selectedOutbreakId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (viewMode === 'today') {
        params.set('date', filterDate);
      } else if (dateRange.from && dateRange.to) {
        params.set('from', dateRange.from);
        params.set('to', dateRange.to);
      }
      
      if (selectedDivision) params.set('division', selectedDivision);
      if (selectedDistrict) params.set('district', selectedDistrict);
      if (selectedOutbreakId) params.set('outbreakId', selectedOutbreakId);

      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      
      if (!res.ok) {
        console.error("API Error:", data.error);
        setAllReports([]);
        return;
      }
      
      if (Array.isArray(data)) {
        setAllReports(data);
        setSelectedRows(new Set(data.map((r: DailyReport) => r.id)));
      } else {
        setAllReports([]);
        setSelectedRows(new Set());
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const res = await fetch('/api/admin/user-stats');
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch user stats');
    }
  };

const filteredReports = useMemo(() => {
    let filtered = [...allReports];
    if (searchTerm) {
      filtered = filtered.filter(r => 
        (r.facility?.facilityName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.facility?.division || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.facility?.district || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered.sort((a, b) => new Date(b.reportingDate).getTime() - new Date(a.reportingDate).getTime());
  }, [allReports, searchTerm]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const clearFilters = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    try {
      const res = await fetch(`/api/reports/${editingReport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingReport),
      });
      if (res.ok) {
        fetchReports();
        setEditingReport(null);
      }
    } catch (err) {
      console.error("Update failed");
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingReport((prev: any) => ({ ...prev, [name]: Number(value) }));
  };

  const totals = useMemo(() => {
    return allReports.reduce((acc, report) => ({
      suspected: acc.suspected + report.suspected24h,
      confirmed: acc.confirmed + report.confirmed24h,
      deaths: acc.deaths + report.suspectedDeath24h + report.confirmedDeath24h,
      hospitalized: acc.hospitalized + report.admitted24h,
      discharged: acc.discharged + report.discharged24h,
    }), { suspected: 0, confirmed: 0, deaths: 0, hospitalized: 0, discharged: 0 });
  }, [allReports]);

  const indicators = useMemo(() => {
    const cfr = totals.confirmed > 0 ? (totals.deaths / totals.confirmed) * 100 : 0;
    const confirmationRate = totals.suspected > 0 ? (totals.confirmed / totals.suspected) * 100 : 0;
    const hospitalizationEfficiency = totals.suspected > 0 ? (totals.hospitalized / totals.suspected) * 100 : 0;
    return { cfr, confirmationRate, hospitalizationEfficiency };
  }, [totals]);

  const monthlyData = useMemo(() => {
    const data: Record<string, any> = {};
    allReports.forEach(report => {
      const month = new Date(report.reportingDate).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (!data[month]) {
        data[month] = { name: month, suspected: 0, confirmed: 0, deaths: 0 };
      }
      data[month].suspected += report.suspected24h;
      data[month].confirmed += report.confirmed24h;
      data[month].deaths += report.confirmedDeath24h + report.suspectedDeath24h;
    });
    return Object.values(data).reverse();
  }, [allReports]);

  const divisionData = useMemo(() => {
    const data: Record<string, { name: string; suspected: number; confirmed: number }> = {};
    DIVISIONS.forEach(div => {
      data[div] = { name: div, suspected: 0, confirmed: 0 };
    });
    allReports.forEach(report => {
      const division = report.facility?.division;
      if (division && data[division]) {
        data[division].suspected += report.suspected24h;
        data[division].confirmed += report.confirmed24h;
      }
    });
    return Object.values(data);
  }, [allReports]);

  const districtData = useMemo(() => {
    if (!selectedDivision) return [];
    const districts = DISTRICTS[selectedDivision] || [];
    const data: Record<string, { name: string; suspected: number; confirmed: number }> = {};
    districts.forEach(dist => {
      data[dist] = { name: dist, suspected: 0, confirmed: 0 };
    });
    allReports.forEach(report => {
      const division = report.facility?.division;
      const district = report.facility?.district;
      if (division === selectedDivision && district && data[district]) {
        data[district].suspected += report.suspected24h;
        data[district].confirmed += report.confirmed24h;
      }
    });
    return Object.values(data);
  }, [allReports, selectedDivision]);

  const facilityData = useMemo(() => {
    if (!selectedDivision || !selectedDistrict) return [];
    const data: Record<string, { name: string; suspected: number; confirmed: number }> = {};
    allReports.forEach(report => {
      const division = report.facility?.division;
      const district = report.facility?.district;
      const facilityName = report.facility?.facilityName;
      if (division === selectedDivision && district === selectedDistrict && facilityName) {
        if (!data[facilityName]) {
          data[facilityName] = { name: facilityName, suspected: 0, confirmed: 0 };
        }
        data[facilityName].suspected += report.suspected24h;
        data[facilityName].confirmed += report.confirmed24h;
      }
    });
    return Object.values(data).sort((a, b) => b.confirmed - a.confirmed);
  }, [allReports, selectedDivision, selectedDistrict]);

  const currentChartData = selectedDivision && selectedDistrict ? facilityData : (selectedDivision ? districtData : divisionData);

  const handleToggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleExportExcel = () => {
    const selectedReports = filteredReports.filter(r => selectedRows.has(r.id));
    const ws = XLSX.utils.json_to_sheet(selectedReports);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Reports");
    XLSX.writeFile(wb, `Measles_Daily_Report_${filterDate}.xlsx`);
  };

  const handleExportPDF = () => {
    const selectedReports = filteredReports.filter(r => selectedRows.has(r.id));
    generateGovtPDF(selectedReports, filterDate);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
            {allReports[0]?.outbreak?.name || "Outbreak"} Surveillance Dashboard
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">
            Real-time monitoring • Multi-disease coordination • Bangladesh
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 flex flex-col items-end shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data as of: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-xs font-black text-indigo-600">Last updated: {lastSync || '06:00 AM BST'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1 px-1 py-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('today')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              viewMode === 'today' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => { setViewMode('all'); setDateRange({ from: '', to: '' }); }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              viewMode === 'all' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Time
          </button>
        </div>

        {viewMode === 'all' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={dateRange.from || ''} 
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} 
                className="bg-transparent border-none focus:ring-0 text-slate-700 text-xs font-bold cursor-pointer"
              />
              <span className="text-slate-400 text-[10px] font-bold uppercase">to</span>
              <input 
                type="date" 
                value={dateRange.to || ''} 
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} 
                className="bg-transparent border-none focus:ring-0 text-slate-700 text-xs font-bold cursor-pointer"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
          <Filter className="w-4 h-4 text-indigo-500" />
          <select 
            value={selectedDivision || ''}
            onChange={(e) => { setSelectedDivision(e.target.value || null); setSelectedDistrict(null); }}
            className="bg-transparent border-none focus:ring-0 text-slate-700 text-xs font-bold cursor-pointer"
          >
            <option value="">All Divisions / সকল বিভাগ</option>
            {DIVISIONS.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>

        {selectedDivision && DISTRICTS[selectedDivision] && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <select 
              value={selectedDistrict || ''}
              onChange={(e) => setSelectedDistrict(e.target.value || null)}
              className="bg-transparent border-none focus:ring-0 text-slate-700 text-xs font-bold cursor-pointer"
            >
              <option value="">All Districts / সকল জেলা</option>
              {DISTRICTS[selectedDivision]?.map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 min-w-[200px]">
          <Activity className="w-4 h-4 text-indigo-500" />
          <div className="flex-1">
            <OutbreakSelector onSelect={(id) => setSelectedOutbreakId(id)} />
          </div>
        </div>

        <button 
          onClick={fetchReports}
          className="w-full sm:w-auto ml-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-200"
        >
          Filter
        </button>
      </div>

      <div className="space-y-8 relative z-20">
        {/* Yellow Alert Banner */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] p-5 rounded-r-3xl shadow-xl shadow-amber-900/10 flex items-start gap-4"
        >
          <div className="p-2.5 bg-[#F59E0B] rounded-2xl text-white shadow-lg shadow-amber-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[#92400E] font-black text-xs uppercase tracking-widest mb-1">Emergency MR vaccination campaign / জরুরি এমআর টিকাদান কর্মসূচি</p>
            <p className="text-[#92400E]/80 text-sm font-bold leading-tight uppercase">
              Launches April 5, 2026 — targeting 1.3M+ children (6 months–5 years) across 30 high-risk upazilas in 18 districts.
            </p>
          </div>
        </motion.div>

        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <KPICard 
            title="Suspected Cases (YTD)" 
            bnTitle="সন্দেহজনক রোগী"
            value={totals.suspected.toLocaleString()} 
            subValue="↑ 12% vs prior week"
            icon={<Users />} 
            color="#F59E0B"
            trend="up"
          />
          <KPICard 
            title="Lab-Confirmed Cases" 
            bnTitle="ল্যাব-নিশ্চিত রোগী"
            value={totals.confirmed.toLocaleString()} 
            subValue={`${indicators.confirmationRate.toFixed(1)}% confirmation rate`}
            icon={<Edit />} 
            color="#EF4444"
          />
          <KPICard 
            title="Admitted in Hospital" 
            bnTitle="হাসপাতালে ভর্তি"
            value={totals.hospitalized.toLocaleString()} 
            subValue={`${indicators.hospitalizationEfficiency.toFixed(1)}% of suspected`}
            icon={<PlusSquare />} 
            color="#3B82F6"
          />
          <KPICard 
            title="Reported Deaths" 
            bnTitle="প্রতিবেদিত মৃত্যু"
            value={totals.deaths.toLocaleString()} 
            subValue={`CFR: ${indicators.cfr.toFixed(2)}%`}
            icon={<ActivitySquare />} 
            color="#0F172A"
          />
          <KPICard 
            title="Submission Rate" 
            bnTitle="জমার হার"
            value={`${userStats.submissionRate}%`} 
            subValue={`${userStats.activeToday} of ${userStats.totalUsers} facilities submitted`}
            icon={<Users />} 
            color="#8B5CF6"
          />
        </div>

        {/* Daily trend area */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Daily suspected & confirmed cases</h3>
                <p className="text-sm text-slate-400 font-medium">Trends over the last reporting period <span className="text-slate-300 ml-2">/ দৈনিক প্রবণতা</span></p>
              </div>
            </div>
            <div className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-200 shadow-sm shadow-orange-500/10">Epidemic curve</div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="top" align="left" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="suspected" name="Suspected cases" stroke="#F59E0B" strokeWidth={4} dot={{ r: 6, fill: '#F59E0B', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="confirmed" name="Lab-confirmed (dashed)" stroke="#3B82F6" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Confirmed cases table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                {selectedDivision && selectedDistrict ? `Confirmed cases by ${selectedDistrict}` : (selectedDivision ? `Confirmed cases by ${selectedDivision} division` : 'Confirmed cases by division')} 
                <span className="text-slate-400 text-sm ml-2 font-medium">/ {selectedDivision && selectedDistrict ? `${selectedDistrict} স্বাস্থ্য কেন্দ্র` : (selectedDivision ? `${selectedDivision} বিভাগ` : 'বিভাগ ভিত্তিক রোগী')}</span>
              </h3>
              <div className="flex gap-2">
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"/> <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">High</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"/> <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low</span></div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <th className="px-8 py-4">{selectedDivision && selectedDistrict ? 'Facility' : (selectedDivision ? 'District' : 'Division')}</th>
                    <th className="px-6 py-4 text-center">Suspected</th>
                    <th className="px-6 py-4 text-center">Confirmed</th>
                    <th className="px-8 py-4 text-right">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...currentChartData].sort((a,b) => b.confirmed - a.confirmed).map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5 font-bold text-slate-700">{item.name}</td>
                      <td className="px-6 py-5 text-center text-slate-500 font-bold tabular-nums">{item.suspected.toLocaleString()}</td>
                      <td className="px-6 py-5 text-center text-slate-900 font-extrabold tabular-nums">{item.confirmed.toLocaleString()}</td>
                      <td className="px-8 py-5 text-right">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.confirmed > 200 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                          {item.confirmed > 200 ? 'High' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Suspected cases horizontal bar chart */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-8">
              {selectedDivision && selectedDistrict ? `Suspected cases by ${selectedDistrict}` : (selectedDivision ? `Suspected cases by ${selectedDivision} district` : 'Suspected cases by division')} 
              <span className="text-slate-400 text-sm ml-2 font-medium">/ {selectedDivision && selectedDistrict ? `${selectedDistrict} স্বাস্থ্য কেন্দ্র` : (selectedDivision ? `${selectedDivision} জেলা ভিত্তিক` : 'প্রাক্কলিত তথ্যাদি')}</span>
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentChartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} interval={0} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="suspected" fill="#FFC38B" radius={[0, 4, 4, 0]} barSize={20} />
                  <Bar dataKey="confirmed" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Map Legend & Distribution */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-8">Map bubble legend <span className="text-slate-400 text-sm ml-2 font-medium">/ মানচিত্রের সূচক</span></h3>
              {(() => {
                const divisionConfirmed = divisionData.filter(d => d.confirmed > 0).sort((a, b) => b.confirmed - a.confirmed);
                const highDivs = divisionConfirmed.filter(d => d.confirmed > 200).map(d => d.name);
                const mediumDivs = divisionConfirmed.filter(d => d.confirmed > 40 && d.confirmed <= 200).map(d => d.name);
                const lowDivs = divisionConfirmed.filter(d => d.confirmed <= 40 && d.confirmed > 0).map(d => d.name);
                return (
                  <div className="flex flex-col md:flex-row items-center gap-12">
                    <div className="space-y-6 flex-1">
                      <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Intensity by confirmed cases</p>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-700 shadow-lg shadow-blue-500/20" />
                          <p className="text-sm font-bold text-slate-700">High (&gt;200 confirmed) <span className="text-slate-400 font-medium ml-2">{highDivs.length > 0 ? `— ${highDivs.join(', ')}` : '— None'}</span></p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-7 h-7 rounded-full bg-blue-500 shadow-lg shadow-blue-400/20" />
                          <p className="text-sm font-bold text-slate-700">Medium (40–200) <span className="text-slate-400 font-medium ml-2">{mediumDivs.length > 0 ? `— ${mediumDivs.join(', ')}` : '— None'}</span></p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-4 h-4 rounded-full bg-blue-300 shadow-lg shadow-blue-300/20" />
                          <p className="text-sm font-bold text-slate-700">Low (&lt;40) <span className="text-slate-400 font-medium ml-2">{lowDivs.length > 0 ? `— ${lowDivs.join(', ')}` : '— None'}</span></p>
                        </div>
                      </div>
                    </div>
                    <div className="w-[180px] h-[180px] relative">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={[
                               { name: 'Confirmed', value: totals.confirmed },
                               { name: 'Unconfirmed', value: Math.max(0, totals.suspected - totals.confirmed) }
                             ]}
                             innerRadius={55}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                           >
                             <Cell fill="#3B82F6" />
                             <Cell fill="#E2E8F0" />
                           </Pie>
                         </PieChart>
                       </ResponsiveContainer>
                       <div className="absolute inset-0 flex items-center justify-center flex-col">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Conf.</p>
                         <p className="text-2xl font-black text-slate-800">{totals.confirmed}</p>
                       </div>
                       <div className="flex justify-center gap-4 mt-2">
                         <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500"/> <span className="text-[9px] font-bold text-slate-500 uppercase">Confirmed</span></div>
                         <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-200"/> <span className="text-[9px] font-bold text-slate-500 uppercase">Unconfirmed</span></div>
                       </div>
                    </div>
                  </div>
                );
              })()}
            </div>

           {/* Hospitalization chart */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <h3 className="text-xl font-black text-slate-800 tracking-tight mb-8">Hospitalization — admitted vs discharged <span className="text-slate-400 text-sm ml-2 font-medium">/ হাসপাতালে ভর্তি ও ছুটি</span></h3>
             <div className="h-[250px] w-full mb-8">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={monthlyData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 'bold'}} />
                   <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                   <Bar dataKey="confirmed" name="Admitted" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
                   <Bar dataKey="deaths" name="Discharged" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
             <div className="bg-[#ECFDF5] p-6 rounded-3xl border border-[#D1FAE5] relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                 <Info className="w-12 h-12 text-[#10B981]" />
               </div>
               <p className="text-[10px] font-black text-[#10B981] uppercase tracking-widest mb-1">Serum Samples Sent (YTD)</p>
               <p className="text-4xl font-black text-[#065F46] mb-2">{allReports.reduce((acc, r) => acc + (r.serumSent24h || 0), 0).toLocaleString()}</p>
               <div className="text-xs font-bold text-[#10B981] flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Processing rate stable <span className="text-[#065F46]/60 ml-1 font-medium italic">/ কার্যক্রম স্বাভাবিক</span></div>
             </div>
           </div>
         </div>

          {/* Keeping existing sections */}
          <OutbreakMap apiEndpoint="/api/reports/geo" />
          <EpiInsights apiEndpoint="/api/reports/timeseries" />

        {/* Reports Table Section */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-white shadow-sm border border-slate-100 rounded-xl flex items-center justify-center">
                 <TableIcon className="w-5 h-5 text-slate-600" />
               </div>
               <div>
                 <h3 className="text-xl font-black text-slate-800 tracking-tight">Facility Reporting Details</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detailed Submissions Listing / বিস্তারিত প্রতিবেদন তালিকা</p>
               </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Facility, District..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-64"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleExportPDF} className="flex items-center gap-2 bg-[#1e293b] hover:bg-black text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-slate-900/10"><FileText className="w-4 h-4" /> PDF</button>
                <button onClick={handleExportExcel} className="flex items-center gap-2 bg-[#10b981] hover:bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/10"><Download className="w-4 h-4" /> Excel</button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                  <th className="px-8 py-5 w-12 text-center">Export</th>
                  <th className="px-6 py-5">Geography / ভৌগোলিক অবস্থান</th>
                  <th className="px-6 py-5">Facility / স্বাস্থ্য কেন্দ্র</th>
                  <th className="px-6 py-5 text-center">Susp. (24h)</th>
                  <th className="px-6 py-5 text-center">Conf. (24h)</th>
                  <th className="px-6 py-5 text-center">Deaths (24h)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && paginatedReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors group cursor-default">
                    <td className="px-8 py-5 text-center">
                      <input type="checkbox" checked={selectedRows.has(report.id)} onChange={() => handleToggleRow(report.id)} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer shadow-sm"/>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-800">{report.facility?.division}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{report.facility?.district}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-slate-900">{report.facility?.facilityName}</div>
                      <p className="text-[10px] font-medium text-slate-400">ID: {report.id.substring(0, 8)}</p>
                    </td>
                    <td className="px-6 py-5 text-center"><span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg font-black text-xs border border-amber-100/50">{report.suspected24h}</span></td>
                    <td className="px-6 py-5 text-center"><span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg font-black text-xs border border-rose-100/50">{report.confirmed24h}</span></td>
                    <td className="px-6 py-5 text-center"><span className="px-3 py-1 bg-slate-900 text-white rounded-lg font-black text-xs">{report.suspectedDeath24h + report.confirmedDeath24h}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <div className="p-24 text-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Database...</p></div>}
            {!loading && filteredReports.length === 0 && <div className="p-24 text-center text-slate-400 font-medium flex flex-col items-center gap-4"><CloudOff className="w-16 h-16 text-slate-200" /><p className="font-black uppercase tracking-widest text-xs">No records found for the selection</p></div>}
          </div>
          
          {totalPages > 1 && (
            <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Showing {((currentPage - 1) * itemsPerPage) + 1}- {Math.min(currentPage * itemsPerPage, filteredReports.length)} <span className="text-slate-300">of</span> {filteredReports.length}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-white hover:shadow-md disabled:opacity-30 disabled:hover:shadow-none transition-all"><ChevronLeft className="w-4 h-4" /></button>
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-blue-600 shadow-sm">{currentPage} <span className="text-slate-300 mx-1">/</span> {totalPages}</div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-white hover:shadow-md disabled:opacity-30 disabled:hover:shadow-none transition-all"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal */}
      <AnimatePresence>
        {editingReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100">
               <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div>
                   <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('dashboard.editEntry')}</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{editingReport?.facility?.facilityName}</p>
                 </div>
                 <button onClick={() => setEditingReport(null)} className="w-12 h-12 bg-white hover:bg-slate-100 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 transition-all"><X className="w-6 h-6 text-slate-400" /></button>
               </div>
               <form onSubmit={handleUpdateReport} className="p-10 space-y-8">
                 <div className="grid grid-cols-2 gap-6">
                    <EditInput label={t('report.fields.suspected24h')} name="suspected24h" value={editingReport?.suspected24h || 0} onChange={handleEditChange} />
                    <EditInput label={t('report.fields.confirmed24h')} name="confirmed24h" value={editingReport?.confirmed24h || 0} onChange={handleEditChange} />
                    <EditInput label={t('report.fields.suspectedDeath24h')} name="suspectedDeath24h" value={editingReport?.suspectedDeath24h || 0} onChange={handleEditChange} />
                    <EditInput label={t('report.fields.confirmedDeath24h')} name="confirmedDeath24h" value={editingReport?.confirmedDeath24h || 0} onChange={handleEditChange} />
                    <EditInput label={t('report.fields.admitted24h')} name="admitted24h" value={editingReport?.admitted24h || 0} onChange={handleEditChange} />
                    <EditInput label={t('report.fields.discharged24h')} name="discharged24h" value={editingReport?.discharged24h || 0} onChange={handleEditChange} />
                 </div>
                 <button type="submit" className="w-full bg-[#1e293b] hover:bg-black text-white font-black uppercase tracking-widest py-5 rounded-3xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-900/20 active:scale-95"><Check className="w-6 h-6" /> Save Changes / তথ্য সংরক্ষণ</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KPICard({ title, bnTitle, value, subValue, icon, color, trend }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group transition-all"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-700" />
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-lg" style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color: color }}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })}
        </div>
        {trend && (
           <div className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-sm ${trend === 'up' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
             {trend === 'up' ? '↑' : '↓'} 12%
           </div>
        )}
      </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{title}</p>
          <p className="text-[10px] font-bold text-slate-300 mb-2">{bnTitle}</p>
          <p className="text-4xl font-black text-slate-800 tabular-nums tracking-tighter">{value}</p>
          <div className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: color}}/> {subValue}</div>
        </div>
    </motion.div>
  );
}

function EditInput({ label, name, value, onChange }: { label: string; name: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <input 
        type="number" 
        name={name} 
        value={value} 
        onChange={onChange} 
        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
      />
    </div>
  );
}