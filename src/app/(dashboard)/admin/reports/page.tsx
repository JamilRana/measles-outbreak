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
  Layers,
  Activity
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
  updatedAt?: string;
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
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {selected.map((item: string) => (
          <span key={item} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 group hover:bg-slate-200 transition-colors">
            {item}
            <button onClick={() => toggleOption(item)} className="hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

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
  const [searchQuery, setSearchQuery] = useState('');

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
      setTimeout(() => setLoading(false), 300); // Small delay for smooth transition
    }
  };

  const filteredReports = useMemo(() => {
    if (!searchQuery) return reports;
    const query = searchQuery.toLowerCase();
    return reports.filter(r => 
      r.facilityName.toLowerCase().includes(query) ||
      r.district.toLowerCase().includes(query) ||
      r.division.toLowerCase().includes(query)
    );
  }, [reports, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: filteredReports.length,
      suspected: filteredReports.reduce((acc, r) => acc + r.suspected24h, 0),
      confirmed: filteredReports.reduce((acc, r) => acc + r.confirmed24h, 0),
      deaths: filteredReports.reduce((acc, r) => acc + (r.suspectedDeath24h + r.confirmedDeath24h), 0)
    };
  }, [filteredReports]);

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

  const resetFilters = () => {
    setSelectedDivisions([]);
    setSelectedDistricts([]);
    setSearchQuery('');
    setSingleDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const allAvailableDistricts = useMemo(() => {
    if (selectedDivisions.length === 0) return Object.values(DISTRICTS_BY_DIVISION).flat().sort();
    return selectedDivisions.flatMap(div => DISTRICTS_BY_DIVISION[div] || []).sort();
  }, [selectedDivisions]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-20 bg-slate-50/50 min-h-screen">
      {/* Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Layers className="w-48 h-48 rotate-12" />
        </div>
        
        <div className="z-10">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-[0.2em] mb-3">
            <span className="w-8 h-[2px] bg-indigo-600 rounded-full"></span>
            Management Console
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Advanced Search
            <span className="text-slate-300 font-light translate-y-0.5">/</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-lg text-sm font-medium leading-relaxed">
            Access, filter and comprehensive reports from all health facilities. 
            Real-time data synchronization with DGHS surveillance nodes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm shadow-sm transition-all active:scale-95">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm shadow-sm transition-all active:scale-95">
            <FileText className="w-4 h-4 text-rose-600" />
            Export PDF
          </button>
          <div className="w-px h-10 bg-slate-200 mx-1 hidden sm:block"></div>
          <button
            onClick={handlePublishAll}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Globe2 className="w-4 h-4" />
            Publish All Today
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
                    placeholder="Facility, district..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-4 pr-10 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" 
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                </div>
              </div>

              {/* Date Mode */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Date Time
                  </label>
                  <div className="flex bg-slate-100 p-0.5 rounded-xl">
                    <button 
                      onClick={() => setDateMode('single')} 
                      className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${dateMode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >Single</button>
                    <button 
                      onClick={() => setDateMode('range')} 
                      className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${dateMode === 'range' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >Range</button>
                  </div>
                </div>
                
                {dateMode === 'single' ? (
                  <div className="relative">
                    <input 
                      type="date" 
                      value={singleDate} 
                      onChange={(e) => setSingleDate(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" 
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-medium" 
                    />
                    <div className="flex justify-center -my-1">
                      <div className="px-2 py-0.5 bg-slate-200 rounded text-[9px] font-black text-slate-500 uppercase">to</div>
                    </div>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-medium" 
                    />
                  </div>
                )}
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
                placeholder={selectedDivisions.length ? "All Districts" : "Filter by Division first"}
              />
            </div>

            <div className="pt-4">
              <button 
                onClick={fetchReports}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2"
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Results Main Section */}
        <div className="xl:col-span-3 space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Records', value: stats.total, icon: FileText, color: 'indigo' },
              { label: 'Suspected Cases', value: stats.suspected, icon: Activity, color: 'blue' },
              { label: 'Confirmed Cases', value: stats.confirmed, icon: Check, color: 'emerald' },
              { label: 'Reported Deaths', value: stats.deaths, icon: Trash2, color: 'rose' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 bg-slate-50 rounded-xl text-slate-600`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider whitespace-nowrap">{stat.label}</span>
                </div>
                <div className="text-2xl font-black text-slate-800 tracking-tight">{stat.value.toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-indigo-500/5 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden relative group">
                   <BarChart3 className="w-5 h-5 relative z-10 transition-transform group-hover:scale-110" />
                   <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">Results</h3>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-black uppercase tracking-wider border border-indigo-100 italic">Surveillance Active</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10px] font-bold text-slate-400">{filteredReports.length} records found</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 uppercase text-[9px] font-black tracking-widest">
                    <th className="w-[140px] px-8 py-5">Date</th>
                    <th className="px-6 py-5">Location / Reporting Facility</th>
                    <th className="w-[120px] px-6 py-5 text-center">Suspected</th>
                    <th className="w-[120px] px-6 py-5 text-center">Confirmed</th>
                    <th className="w-[120px] px-6 py-5 text-center">Mortality</th>
                    <th className="w-[120px] px-6 py-5 text-center">Status</th>
                    <th className="w-[140px] px-8 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence mode="popLayout">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-32 text-center bg-white">
                          <Loader />
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((report) => (
                        <motion.tr 
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          key={report.id} 
                          className="hover:bg-slate-50 transition-colors group"
                        >
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-800 text-sm tracking-tight">{format(new Date(report.reportingDate), 'dd MMM')}</span>
                              <span className="text-[10px] font-bold text-slate-400">{format(new Date(report.reportingDate), 'yyyy')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                                <Building2 className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-800 text-sm truncate">{report.facilityName}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5" /> {report.district}
                                  </span>
                                  <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                  <span className="text-[10px] font-bold text-slate-400">{report.division}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="inline-flex items-center px-4 py-2 bg-slate-50 border border-slate-100 text-indigo-700 rounded-2xl font-black text-xs shadow-sm group-hover:bg-white transition-all">
                              {report.suspected24h}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                             <span className="inline-flex items-center px-4 py-2 bg-slate-50 border border-slate-100 text-emerald-700 rounded-2xl font-black text-xs shadow-sm group-hover:bg-white transition-all">
                              {report.confirmed24h}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`inline-flex items-center px-4 py-2 rounded-2xl font-black text-xs shadow-sm transition-all ${
                              (report.suspectedDeath24h + report.confirmedDeath24h) > 0 
                                ? 'bg-rose-50 border border-rose-100 text-rose-600' 
                                : 'bg-slate-50 border border-slate-100 text-slate-400 opacity-40 group-hover:bg-white group-hover:opacity-100'
                            }`}>
                              {report.suspectedDeath24h + report.confirmedDeath24h}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <button 
                              onClick={() => handlePublish(report)}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                                report.published 
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                  : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {report.published ? <Globe className="w-3.5 h-3.5" /> : <Globe2 className="w-3.5 h-3.5" />}
                              {report.published ? 'Live' : 'Draft'}
                            </button>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setEditingReport(report)} 
                                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Edit Record"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setDeletingReport(report)} 
                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="w-px h-4 bg-slate-200 mx-1"></div>
                              <button 
                                className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                title="View Details"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                  {!loading && filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-32 text-center bg-white">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                            <Search className="w-10 h-10 text-slate-200" />
                          </div>
                          <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em]">Zero results found</p>
                          <p className="text-slate-400 text-sm max-w-[240px] leading-relaxed">Try adjusting your filters or search query to find matching records.</p>
                          <button onClick={resetFilters} className="mt-2 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all">Clear Filters</button>
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

      {/* Edit Modal */}
      <AnimatePresence mode="wait">
        {editingReport && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={() => setEditingReport(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-xl w-full shadow-2xl border border-white/20 relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Edit2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Edit Record</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{editingReport.facilityName}</p>
                  </div>
                </div>
                <button onClick={() => setEditingReport(null)} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-600" /></button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Division</span>
                  <span className="text-sm font-bold text-slate-700">{editingReport.division}</span>
                </div>
                <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">District</span>
                  <span className="text-sm font-bold text-slate-700">{editingReport.district}</span>
                </div>
              </div>
              
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: 'Suspected (24h)', name: 'suspected24h' },
                    { label: 'Confirmed (24h)', name: 'confirmed24h' },
                    { label: 'Suspected Death', name: 'suspectedDeath24h' },
                    { label: 'Confirmed Death', name: 'confirmedDeath24h' },
                    { label: 'Admitted (24h)', name: 'admitted24h' },
                    { label: 'Discharged (24h)', name: 'discharged24h' }
                  ].map((field) => (
                    <div key={field.name} className="space-y-2">
                       <label className="text-[11px] font-black uppercase text-slate-500 tracking-widest ml-1">{field.label}</label>
                       <input 
                         type="number" 
                         name={field.name} 
                         value={editingReport[field.name as keyof Report] as number} 
                         onChange={handleEditChange} 
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-800 transition-all focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none" 
                       />
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setEditingReport(null)} type="button" className="flex-1 px-4 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Discard Changes</button>
                  <button type="submit" className="flex-[1.5] px-4 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-600/10 active:scale-95">Update Record</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence mode="wait">
        {deletingReport && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={() => setDeletingReport(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-600 mb-6 border border-rose-100 shadow-sm mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight text-center mb-2">Delete Record?</h3>
              <p className="text-slate-500 text-center text-sm font-medium mb-8 leading-relaxed px-4">
                You are about to delete the report from <span className="font-black text-slate-800">{deletingReport.facilityName}</span>. 
                This action is irreversible and will permanently remove all data associated with this entry.
              </p>
              
              <div className="flex flex-col gap-3">
                <button onClick={handleDelete} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 active:scale-95">Permanently Delete</button>
                <button onClick={() => setDeletingReport(null)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-indigo-50 rounded-full animate-pulse" />
        </div>
      </div>
      <div className="space-y-1 text-center">
        <p className="text-slate-900 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Querying Database</p>
        <p className="text-slate-400 font-medium text-[10px] italic">Synchronizing with surviellance nodes...</p>
      </div>
    </div>
  );
}
