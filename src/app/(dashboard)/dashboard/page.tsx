"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  TrendingUp, 
  Users, 
  Hospital, 
  Skull, 
  Download, 
  Filter, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  BarChart3,
  PieChart as PieChartIcon,
  CloudOff,
  Edit,
  X,
  Check,
  Search,
  ArrowUpRight,
  ClipboardCheck,
  Zap,
  Activity,
  Map as MapIcon,
  Table as TableIcon
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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import { DIVISIONS } from '@/lib/constants';

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
  userId: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [lastSync, setLastSync] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    setLastSync(bdTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' BST');
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filterDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `/api/reports?date=${filterDate}`;
      if (dateRange.from && dateRange.to) {
        url = `/api/reports?from=${dateRange.from}&to=${dateRange.to}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setReports(data);
      setSelectedRows(new Set(data.map((r: Report) => r.id)));
      
      const now = new Date();
      const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
      setLastSync(bdTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + ' BST');
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const filteredReports = selectedDivision 
      ? reports.filter(r => r.division === selectedDivision)
      : reports;

    return filteredReports.reduce((acc, report) => ({
      suspected: acc.suspected + report.suspectedYTD,
      confirmed: acc.confirmed + report.confirmedYTD,
      deaths: acc.deaths + report.confirmedDeathYTD,
      hospitalized: acc.hospitalized + report.admittedYTD,
      discharged: acc.discharged + report.dischargedYTD,
      serumSent: acc.serumSent + report.serumSentYTD,
      suspected24h: acc.suspected24h + report.suspected24h,
      confirmed24h: acc.confirmed24h + report.confirmed24h,
      admitted24h: acc.admitted24h + report.admitted24h,
      discharged24h: acc.discharged24h + report.discharged24h,
    }), { 
      suspected: 0, confirmed: 0, deaths: 0, hospitalized: 0, 
      discharged: 0, serumSent: 0, suspected24h: 0, confirmed24h: 0,
      admitted24h: 0, discharged24h: 0
    });
  }, [reports, selectedDivision]);

  // Derived Metrics
  const cfr = totals.confirmed > 0 ? (totals.deaths / totals.confirmed) * 100 : 0;
  const confirmationRate = totals.suspected > 0 ? (totals.confirmed / totals.suspected) * 100 : 0;
  const admissionRate = totals.suspected > 0 ? (totals.hospitalized / totals.suspected) * 100 : 0;

  const divisionData = useMemo(() => {
    const data: Record<string, any> = {};
    DIVISIONS.forEach(div => {
      data[div] = { name: div, suspected: 0, confirmed: 0, risk: "Low" };
    });
    reports.forEach(report => {
      if (data[report.division]) {
        data[report.division].suspected += report.suspectedYTD;
        data[report.division].confirmed += report.confirmedYTD;
      }
    });
    
    return Object.values(data).map(d => ({
      ...d,
      risk: d.confirmed > 200 ? "High" : d.confirmed > 40 ? "Medium" : "Low"
    }));
  }, [reports]);

  const trendData = useMemo(() => {
    // Mocking trend data based on current totals for the chart visualization
    // In a real app, this would come from a separate API call for time-series data
    const days = ['Apr 2', 'Apr 3', 'Apr 4', 'Apr 5'];
    return days.map((day, i) => ({
      name: day,
      suspected: Math.floor(totals.suspected24h * (0.8 + Math.random() * 0.4)),
      confirmed: Math.floor(totals.confirmed24h * (0.8 + Math.random() * 0.4)),
    }));
  }, [totals]);

  const hospitalizationTrend = useMemo(() => {
    const days = ['Apr 2', 'Apr 3', 'Apr 4', 'Apr 5'];
    return days.map((day, i) => ({
      name: day,
      admitted: Math.floor(totals.admitted24h * (0.9 + Math.random() * 0.2)),
      discharged: Math.floor(totals.discharged24h * (0.9 + Math.random() * 0.2)),
    }));
  }, [totals]);

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

  const handleToggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRows(newSelected);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const selectedReports = reports.filter(r => selectedRows.has(r.id));
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text("Measles Outbreak Monitoring Platform", 14, 20);
    doc.setFontSize(10);
    doc.text(`Report Date: ${filterDate} | Generated: ${new Date().toLocaleString()}`, 14, 28);
    
    const tableData = selectedReports.map(r => [
      r.division, r.district, r.facilityName, r.suspectedYTD, r.confirmedYTD, r.confirmedDeathYTD
    ]);

    autoTable(doc, { 
      startY: 35, 
      head: [['Division', 'District', 'Facility', 'Susp.', 'Conf.', 'Deaths']], 
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95] }
    });
    doc.save(`Measles_Report_${filterDate}.pdf`);
  };

  return (
    <div className="pb-20">
      {/* Header section with deep medical blue */}
      <header className="bg-white border-b-2 border-slate-300 pt-8 pb-10 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight tracking-tight">Outbreak Overview</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              Real-time situational awareness
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Sync</span>
              <span className="text-xs font-bold text-slate-700">{lastSync || 'Syncing...'}</span>
            </div>
            
            <div className="flex gap-2 items-center">
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <input 
                  type="date" 
                  value={dateRange.from || filterDate} 
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} 
                  className="bg-transparent border-none focus:ring-0 text-slate-700 text-sm font-bold cursor-pointer"
                />
                <span className="text-slate-400">to</span>
                <input 
                  type="date" 
                  value={dateRange.to || filterDate} 
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} 
                  className="bg-transparent border-none focus:ring-0 text-slate-700 text-sm font-bold cursor-pointer"
                />
              </div>
              <button 
                onClick={() => { setFilterDate(dateRange.from || new Date().toISOString().split('T')[0]); fetchReports(); }}
                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 mt-10 space-y-8">

        {/* Division Filter Chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">Filter By Division:</span>
          <button 
            onClick={() => setSelectedDivision(null)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${!selectedDivision ? 'bg-[#1E3A5F] text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            All Divisions
          </button>
          {DIVISIONS.map(div => (
            <button 
              key={div}
              onClick={() => setSelectedDivision(div === selectedDivision ? null : div)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${selectedDivision === div ? 'bg-[#1E3A5F] text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
            >
              {div}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard 
            title="Suspected Cases (YTD)" 
            value={totals.suspected.toLocaleString()} 
            subValue="↑ 12% vs prior week"
            icon={<Users />} 
            color="#F59E0B"
            progress={12}
            trend="up"
          />
          <KPICard 
            title="Lab-Confirmed Cases" 
            value={totals.confirmed.toLocaleString()} 
            subValue={`${confirmationRate.toFixed(1)}% confirmation rate`}
            icon={<ClipboardCheck />} 
            color="#EF4444"
          />
          <KPICard 
            title="Admitted in Hospital" 
            value={totals.hospitalized.toLocaleString()} 
            subValue={`${admissionRate.toFixed(1)}% of suspected`}
            icon={<Hospital />} 
            color="#3B82F6"
          />
          <KPICard 
            title="Reported Deaths" 
            value={totals.deaths.toLocaleString()} 
            subValue={`CFR: ${cfr.toFixed(2)}%`}
            icon={<Skull />} 
            color="#0F172A"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Daily Epidemic Curve */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-300 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Daily suspected & confirmed cases</h3>
                  <p className="text-sm text-slate-400 font-medium">Trends over the last 7 reporting days</p>
                </div>
              </div>
              <div className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">Epidemic curve</div>
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorSusp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="top" align="left" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '13px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="suspected" name="Suspected cases" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorSusp)" />
                  <Area type="monotone" dataKey="confirmed" name="Lab-confirmed (dashed)" stroke="#2563EB" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorConf)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hospitalization Trend */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-300 shadow-md">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Hospital className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Hospitalization trend</h3>
            </div>
            
            <div className="h-[250px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hospitalizationTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="admitted" name="Admitted" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="discharged" name="Discharged" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#ECFDF5] p-5 rounded-2xl border border-[#D1FAE5]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-[#10B981] uppercase tracking-widest">Serum Samples Sent (YTD)</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#10B981]"><TrendingUp className="w-3 h-3" /> Processing rate stable</span>
              </div>
              <p className="text-3xl font-black text-[#065F46]">{totals.serumSent.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Confirmed cases by division */}
          <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-md overflow-hidden">
            <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200 rounded-xl text-slate-700">
                  <TableIcon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Confirmed cases by division</h3>
              </div>
              <div className="flex items-center gap-2">
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"/> <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">High</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"/> <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medium</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"/> <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low</span></div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-50">
                    <th className="px-8 py-4">Division</th>
                    <th className="px-6 py-4 text-center">Suspected</th>
                    <th className="px-6 py-4 text-center">Confirmed</th>
                    <th className="px-8 py-4 text-right">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {divisionData.sort((a, b) => b.confirmed - a.confirmed).map((div) => (
                    <tr key={div.name} className="hover:bg-slate-50/80 transition-all cursor-pointer group">
                      <td className="px-8 py-5 font-bold text-slate-700">{div.name}</td>
                      <td className="px-6 py-5 text-center text-slate-500 font-medium">{div.suspected.toLocaleString()}</td>
                      <td className="px-6 py-5 text-center text-slate-900 font-extrabold">{div.confirmed.toLocaleString()}</td>
                      <td className="px-8 py-5 text-right">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          div.risk === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
                          div.risk === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {div.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Map & Distribution Section */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-300 shadow-md flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-50 rounded-xl">
                <MapIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Geographic Risk Profiling</h3>
                <p className="text-sm text-slate-400 font-medium">Visualization of outbreak intensity by region</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-8 items-center justify-center">
              <div className="w-full md:w-1/2 relative flex items-center justify-center">
                <div className="w-[200px] h-[200px] rounded-full border-[20px] border-slate-100 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={divisionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="confirmed"
                        nameKey="name"
                        paddingAngle={2}
                      >
                        {divisionData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={
                            entry.risk === 'High' ? '#EF4444' : 
                            entry.risk === 'Medium' ? '#F59E0B' : 
                            '#10B981'
                          } />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center z-10">
                      <p className="text-3xl font-black text-slate-800">{totals.confirmed}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Conf.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-1/2 space-y-6">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intensity by confirmed cases</p>
                  {divisionData.filter(d => d.risk === 'High').length > 0 && (
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">{divisionData.filter(d => d.risk === 'High').length}</div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">High (&gt;200 confirmed)</p>
                        <p className="text-[10px] font-medium text-slate-400">{divisionData.filter(d => d.risk === 'High').map(d => d.name).join(', ') || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                  {divisionData.filter(d => d.risk === 'Medium').length > 0 && (
                    <div className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold mt-1">{divisionData.filter(d => d.risk === 'Medium').length}</div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Medium (40–200)</p>
                        <p className="text-[10px] font-medium text-slate-400">{divisionData.filter(d => d.risk === 'Medium').map(d => d.name).join(', ') || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                  {divisionData.filter(d => d.risk === 'Low').length > 0 && (
                    <div className="flex items-start gap-4">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px] font-bold mt-2">{divisionData.filter(d => d.risk === 'Low').length}</div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Low (&lt;40)</p>
                        <p className="text-[10px] font-medium text-slate-400">{divisionData.filter(d => d.risk === 'Low').map(d => d.name).join(', ') || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Table Section */}
          <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-md overflow-hidden">
            <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Facility Reporting Details</h3>
            </div>
            
            <div className="flex gap-2">
               <button className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
                 <Filter className="w-4 h-4" /> Filter
               </button>
               {session?.user.role === "EXPORTER" && (
                 <button onClick={handleExportPDF} className="px-4 py-2 bg-[#1E3A5F] text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/10 flex items-center gap-2">
                   <Download className="w-4 h-4" /> Export CSV
                 </button>
               )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-4 w-12 text-center">Export</th>
                  <th className="px-6 py-4">District / Facility</th>
                  <th className="px-6 py-4 text-center">Susp. (24h)</th>
                  <th className="px-6 py-4 text-center">Conf. (24h)</th>
                  <th className="px-6 py-4 text-center">Deaths (24h)</th>
                  <th className="px-6 py-4 text-center">Adm. (24h)</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && (selectedDivision ? reports.filter(r => r.division === selectedDivision) : reports).map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedRows.has(report.id)} 
                        onChange={() => handleToggleRow(report.id)} 
                        className="w-5 h-5 rounded-lg border-slate-300 text-[#1E3A5F] focus:ring-[#1E3A5F]/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-900">{report.facilityName}</div>
                      <div className="text-xs text-slate-400 font-bold flex items-center gap-1">
                        {report.division} <ChevronDown className="w-3 h-3 h-3 group-hover:translate-x-0.5 transition-transform" /> {report.district}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg font-black text-xs border border-amber-100">{report.suspected24h}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1 bg-red-50 text-red-700 rounded-lg font-black text-xs border border-red-100">{report.confirmed24h}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1 bg-slate-900 text-slate-100 rounded-lg font-black text-xs">{report.confirmedDeath24h}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg font-black text-xs border border-blue-100">{report.admitted24h}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       {(session?.user.role === "ADMIN" || session?.user.role === "SUBMITTER") ? (
                         <button onClick={() => setEditingReport(report)} className="p-2 text-slate-400 hover:text-[#1E3A5F] hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100">
                           <Edit className="w-4 h-4" />
                         </button>
                       ) : (
                         <ArrowUpRight className="w-4 h-4 text-slate-200 ml-auto" />
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <div className="p-20 text-center flex flex-col items-center gap-4"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /><p className="text-slate-400 font-bold text-sm">Syncing surveillance data...</p></div>}
            {!loading && reports.length === 0 && <div className="p-20 text-center text-slate-400 font-medium flex flex-col items-center gap-4"><CloudOff className="w-16 h-16 text-slate-200" /><p className="font-bold tracking-tight">No reports found for this period</p></div>}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingReport && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
               <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800">Edit Entry: {editingReport.facilityName}</h2>
                  <button onClick={() => setEditingReport(null)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
               </div>
               <form onSubmit={handleUpdateReport} className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <EditInput label="Suspected 24h" name="suspected24h" value={editingReport.suspected24h} onChange={handleEditChange} />
                     <EditInput label="Confirmed 24h" name="confirmed24h" value={editingReport.confirmed24h} onChange={handleEditChange} />
                     <EditInput label="S. Death 24h" name="suspectedDeath24h" value={editingReport.suspectedDeath24h} onChange={handleEditChange} />
                     <EditInput label="C. Death 24h" name="confirmedDeath24h" value={editingReport.confirmedDeath24h} onChange={handleEditChange} />
                     <EditInput label="Admitted 24h" name="admitted24h" value={editingReport.admitted24h} onChange={handleEditChange} />
                     <EditInput label="Discharged 24h" name="discharged24h" value={editingReport.discharged24h} onChange={handleEditChange} />
                  </div>
                  <button type="submit" className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"><Check className="w-5 h-5" /> Save Changes</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditInput({ label, name, value, onChange }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <input type="number" name={name} value={value} onChange={onChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none transition-all font-bold" />
    </div>
  );
}

function KPICard({ title, value, subValue, icon, color, progress, trend }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-7 rounded-[2rem] border border-slate-300 shadow-md relative overflow-hidden group transition-all hover:shadow-xl hover:shadow-slate-200/50"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-500" />
      
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="p-3.5 rounded-2xl border transition-colors shadow-md" style={{ backgroundColor: `${color}10`, borderColor: `${color}20`, color: color }}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })}
        </div>
        {trend && (
           <div className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${trend === 'up' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
             {trend === 'up' ? '↑' : '↓'} {progress}%
           </div>
        )}
      </div>
      
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">{title}</p>
        <p className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter mb-2">{value}</p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: color}} />
          <p className="text-xs font-bold text-slate-500">{subValue}</p>
        </div>
      </div>
    </motion.div>
  );
}
