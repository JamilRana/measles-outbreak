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
  Check
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
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingReport, setEditingReport] = useState<Report | null>(null);

  useEffect(() => {
    fetchReports();
  }, [filterDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?date=${filterDate}`);
      const data = await res.json();
      setReports(data);
      setSelectedRows(new Set(data.map((r: Report) => r.id)));
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
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

  const handleToggleRow = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const selectedReports = reports.filter(r => selectedRows.has(r.id));
    doc.setFontSize(18);
    doc.text("Measles Outbreak Daily Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Reporting Date: ${filterDate}`, 14, 30);
    const tableData = selectedReports.map(r => [r.division, r.district, r.facilityName, r.suspected24h, r.confirmed24h, r.suspectedDeath24h + r.confirmedDeath24h, r.admitted24h]);
    
    autoTable(doc, { 
      startY: 40, 
      head: [['Division', 'District', 'Facility', 'Susp.', 'Conf.', 'Death', 'Adm.']], 
      body: tableData, 
      theme: 'grid', 
      headStyles: { fillColor: [79, 70, 229] } 
    });
    
    doc.save(`Measles_Report_${filterDate}.pdf`);
  };

  const handleExportExcel = () => {
    const selectedReports = reports.filter(r => selectedRows.has(r.id));
    const ws = XLSX.utils.json_to_sheet(selectedReports);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, `Measles_Report_${filterDate}.xlsx`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Outbreak Dashboard</h1>
          <p className="text-slate-500 mt-1">Real-time monitoring and situational awareness</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
            <Calendar className="w-5 h-5 text-indigo-500 mr-2" />
            <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent border-none focus:ring-0 text-slate-700 font-medium"/>
          </div>
          <button onClick={fetchReports} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100"><Filter className="w-5 h-5" /></button>
          <div className="flex gap-2">
            <button onClick={handleExportPDF} className="flex items-center gap-2 bg-[#f43f5e] hover:bg-[#e11d48] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-rose-500/20"><Download className="w-4 h-4" /> PDF</button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20"><Download className="w-4 h-4" /> Excel</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Suspected" value={totals.suspected} icon={<Users className="w-6 h-6" />} color="indigo" />
        <StatsCard title="Confirmed" value={totals.confirmed} icon={<CheckCircle2 className="w-6 h-6" />} color="emerald" />
        <StatsCard title="Mortality" value={totals.deaths} icon={<Skull className="w-6 h-6" />} color="rose" />
        <StatsCard title="Hospitalized" value={totals.hospitalized} icon={<Hospital className="w-6 h-6" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative">
          <div className="flex items-center gap-3 mb-8"><div className="p-2 bg-indigo-50 rounded-lg"><TrendingUp className="w-5 h-5 text-indigo-600" /></div><h3 className="text-xl font-bold text-slate-800">Geographic Distribution</h3></div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={divisionData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" stroke="#64748b" fontSize={12}/><YAxis stroke="#64748b" fontSize={12}/><Tooltip cursor={{ fill: '#f8fafc' }}/><Bar dataKey="suspected" fill="#6366f1" radius={[6, 6, 0, 0]} /><Bar dataKey="confirmed" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-8"><div className="p-2 bg-rose-50 rounded-lg"><PieChartIcon className="w-5 h-5 text-rose-600" /></div><h3 className="text-xl font-bold text-slate-800">Case Proportions</h3></div>
          <div className="h-[350px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart><Pie data={[{ name: 'Suspected', value: totals.suspected }, { name: 'Confirmed', value: totals.confirmed }, { name: 'Deaths', value: totals.deaths }]} innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value"><Cell fill="#6366f1" /><Cell fill="#10b981" /><Cell fill="#f43f5e" /></Pie><Tooltip /><Legend /></PieChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-slate-200 rounded-lg"><BarChart3 className="w-5 h-5 text-slate-600" /></div>
             <h3 className="text-xl font-bold text-slate-800">Detailed Report Submissions</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-black tracking-[0.1em]">
                <th className="px-8 py-4 w-12 text-center">Export</th>
                <th className="px-6 py-4">Division / District</th>
                <th className="px-6 py-4">Facility</th>
                <th className="px-6 py-4 text-center">Suspected</th>
                <th className="px-6 py-4 text-center">Confirmed</th>
                <th className="px-6 py-4 text-center">Deaths</th>
                {session?.user.role === "ADMIN" && <th className="px-6 py-4 text-center">Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-4 text-center"><input type="checkbox" checked={selectedRows.has(report.id)} onChange={() => handleToggleRow(report.id)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"/></td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{report.division}</div>
                    <div className="text-xs text-slate-500">{report.district}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{report.facilityName}</td>
                  <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-bold text-sm">{report.suspected24h}</span></td>
                  <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md font-bold text-sm">{report.confirmed24h}</span></td>
                  <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-md font-bold text-sm">{report.suspectedDeath24h + report.confirmedDeath24h}</span></td>
                  {session?.user.role === "ADMIN" && (
                    <td className="px-6 py-4 text-center">
                       <button onClick={() => setEditingReport(report)} className="p-2 text-indigo-600 hover:bg-white rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" /></div>}
          {!loading && reports.length === 0 && <div className="p-20 text-center text-slate-400 font-medium flex flex-col items-center gap-4"><CloudOff className="w-12 h-12 text-slate-200" /><p>No reports for this date</p></div>}
        </div>
      </div>

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
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"><Check className="w-5 h-5" /> Save Changes</button>
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
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <input type="number" name={name} value={value} onChange={onChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
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

function Loader2(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}
