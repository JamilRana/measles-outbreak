"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  Globe2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DIVISIONS, DISTRICTS_BY_DIVISION } from '@/lib/constants';
import { format } from 'date-fns';

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
  confirmedDeath24h: number;
  admitted24h: number;
  admittedYTD: number;
  discharged24h: number;
  dischargedYTD: number;
  serumSentYTD: number;
  published: boolean;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);
  
  // Filters
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);

  useEffect(() => {
    fetchReports();
  }, [singleDate, startDate, endDate, dateMode, selectedDivisions, selectedDistricts]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = '/api/reports?';
      if (dateMode === 'single') url += `date=${singleDate}`;
      else url += `startDate=${startDate}&endDate=${endDate}`;
      
      if (selectedDivisions.length > 0) url += `&divisions=${selectedDivisions.join(',')}`;
      if (selectedDistricts.length > 0) url += `&districts=${selectedDistricts.join(',')}`;

      const res = await fetch(url);
      const data = await res.json();
      setReports(data);
    } catch {
      console.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReport) return;
    try {
      const res = await fetch(`/api/reports/${deletingReport.id}`, { method: 'DELETE' });
      if (res.ok) {
        setReports(reports.filter(r => r.id !== deletingReport.id));
        setDeletingReport(null);
      }
    } catch {
      console.error("Delete failed");
    }
  };

  const handlePublish = async (report: Report) => {
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !report.published })
      });
      if (res.ok) {
        setReports(reports.map(r => r.id === report.id ? { ...r, published: !r.published } : r));
      }
    } catch {
      console.error("Publish toggle failed");
    }
  };

  const handlePublishAll = async () => {
    try {
      const res = await fetch('/api/admin/publish-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: singleDate })
      });
      if (res.ok) {
        fetchReports();
      }
    } catch {
      console.error("Publish all failed");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    try {
      const res = await fetch(`/api/reports/${editingReport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReport)
      });
      if (res.ok) {
        setReports(reports.map(r => r.id === editingReport.id ? editingReport : r));
        setEditingReport(null);
      }
    } catch {
      console.error("Update failed");
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditingReport((prev: any) => ({ ...prev, [name]: Number(value) }));
  };

  const removeDivision = (div: string) => {
    setSelectedDivisions(prev => prev.filter(d => d !== div));
  };

  const removeDistrict = (dist: string) => {
    setSelectedDistricts(prev => prev.filter(d => d !== dist));
  };

  const allAvailableDistricts = useMemo(() => {
    if (selectedDivisions.length === 0) return Object.values(DISTRICTS_BY_DIVISION).flat();
    return selectedDivisions.flatMap(div => DISTRICTS_BY_DIVISION[div] || []);
  }, [selectedDivisions]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Advanced Data Search</h1>
          <p className="text-slate-500 mt-1">Filter, analyze and export outbreak records</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="p-2 bg-indigo-50 rounded-lg"><Filter className="w-5 h-5 text-indigo-600" /></div>
          <h3 className="font-bold text-slate-800">Search Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Date Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">Date Filtering</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setDateMode('single')} 
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${dateMode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >Single</button>
                <button 
                  onClick={() => setDateMode('range')} 
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${dateMode === 'range' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >Range</button>
              </div>
            </div>
            {dateMode === 'single' ? (
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                <span className="text-slate-400 font-bold">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
              </div>
            )}
          </div>

          {/* Location Multi-selects */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4" /> Divisions</label>
            <div className="relative group">
              <select 
                multiple
                value={selectedDivisions}
                onChange={(e) => setSelectedDivisions(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[100px]"
              >
                {DIVISIONS.map(div => <option key={div} value={div}>{div}</option>)}
              </select>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedDivisions.map(div => (
                  <span key={div} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100">
                    {div} <button onClick={() => removeDivision(div)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4" /> Districts</label>
            <div className="relative group">
              <select 
                multiple
                value={selectedDistricts}
                onChange={(e) => setSelectedDistricts(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[100px]"
              >
                {allAvailableDistricts.sort().map(dist => <option key={dist} value={dist}>{dist}</option>)}
              </select>
              <div className="mt-2 flex flex-wrap gap-2 max-h-[100px] overflow-y-auto">
                {selectedDistricts.map(dist => (
                  <span key={dist} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100">
                    {dist} <button onClick={() => removeDistrict(dist)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-200 rounded-lg"><BarChart3 className="w-5 h-5 text-slate-600" /></div>
            <h3 className="text-xl font-bold text-slate-800">Search Results ({reports.length})</h3>
          </div>
          <button
            onClick={handlePublishAll}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-500"
          >
            <Globe2 className="w-4 h-4" />
            Publish All for Date
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-black tracking-[0.1em]">
                <th className="px-8 py-5">Date</th>
                <th className="px-6 py-5">Location / Facility</th>
                <th className="px-6 py-5 text-center">Suspected</th>
                <th className="px-6 py-5 text-center">Confirmed</th>
                <th className="px-6 py-5 text-center">Mortality</th>
                <th className="px-6 py-5 text-center">Published</th>
                <th className="px-6 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="p-20 text-center"><Loader /></td></tr>
              ) : reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-700">{format(new Date(report.reportingDate), 'dd MMM yyyy')}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-bold text-slate-900">{report.facilityName}</div>
                    <div className="text-xs text-slate-500">{report.division} • {report.district}</div>
                  </td>
                  <td className="px-6 py-5 text-center"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm">{report.suspected24h}</span></td>
                  <td className="px-6 py-5 text-center"><span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-sm">{report.confirmed24h}</span></td>
                  <td className="px-6 py-5 text-center"><span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold text-sm">{report.suspectedDeath24h + report.confirmedDeath24h}</span></td>
                  <td className="px-6 py-5 text-center">
                    <button 
                      onClick={() => handlePublish(report)}
                      className={`p-2 rounded-lg transition-all ${report.published ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
                    >
                      {report.published ? <Globe className="w-4 h-4" /> : <Globe2 className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setEditingReport(report)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeletingReport(report)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && reports.length === 0 && (
                <tr><td colSpan={7} className="p-20 text-center text-slate-400 font-medium">No reports found for these criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingReport && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setEditingReport(null)}
            >
              <motion.div 
                initial={{ scale: 0.9 }} 
                animate={{ scale: 1 }} 
                exit={{ scale: 0.9 }}
                className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Edit Report</h3>
                  <button onClick={() => setEditingReport(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{editingReport.facilityName}</p>
                <p className="text-sm text-slate-500 mb-6">{editingReport.division} • {editingReport.district}</p>
                
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Suspected (24h)</label>
                      <input type="number" name="suspected24h" value={editingReport.suspected24h} onChange={handleEditChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Confirmed (24h)</label>
                      <input type="number" name="confirmed24h" value={editingReport.confirmed24h} onChange={handleEditChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Suspected Death (24h)</label>
                      <input type="number" name="suspectedDeath24h" value={editingReport.suspectedDeath24h} onChange={handleEditChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Confirmed Death (24h)</label>
                      <input type="number" name="confirmedDeath24h" value={editingReport.confirmedDeath24h} onChange={handleEditChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Admitted (24h)</label>
                      <input type="number" name="admitted24h" value={editingReport.admitted24h} onChange={handleEditChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Discharged (24h)</label>
                      <input type="number" name="discharged24h" value={editingReport.discharged24h} onChange={handleEditChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-500">Save Changes</button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Modal */}
        <AnimatePresence>
          {deletingReport && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setDeletingReport(null)}
            >
              <motion.div 
                initial={{ scale: 0.9 }} 
                animate={{ scale: 1 }} 
                exit={{ scale: 0.9 }}
                className="bg-white rounded-3xl p-8 max-w-md w-full"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-rose-100 rounded-xl"><Trash2 className="w-6 h-6 text-rose-600" /></div>
                  <h3 className="text-xl font-bold text-slate-800">Delete Report?</h3>
                </div>
                <p className="text-slate-500 mb-6">Are you sure you want to delete this report? This action cannot be undone.</p>
                <p className="text-sm font-bold text-slate-700 mb-6">{deletingReport.facilityName} - {format(new Date(deletingReport.reportingDate), 'dd MMM yyyy')}</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeletingReport(null)} className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button onClick={handleDelete} className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-500">Delete</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-slate-400 font-medium text-sm">Searching records...</p>
    </div>
  );
}
