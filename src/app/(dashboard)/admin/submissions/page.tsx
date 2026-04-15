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
  Building2,
  FileSpreadsheet,
  FileText,
  RefreshCcw,
  Activity,
  Layers,
  AlertCircle,
  Eye,
  Plus,
  TrendingUp,
  History,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DIVISIONS, DISTRICTS_BY_DIVISION } from '@/lib/constants';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import AdminOutbreakSelector from '@/components/AdminOutbreakSelector';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface UserData {
  id: string;
  facilityId: string;
  facilityName: string;
  division: string;
  district: string;
  email: string;
  phone: string;
  role: string;
}

interface Report {
  id: string;
  facilityId: string;
  reportingDate: string;
  published: boolean;
  dataSnapshot?: any;
  facility?: {
    facilityName: string;
    division: string;
    district: string;
  };
  outbreak?: {
    id: string;
    name: string;
  };
  [key: string]: any;
}

interface FormField {
  id: string;
  label: string;
  labelBn?: string;
  fieldKey: string;
  fieldType: string;
  isCoreField: boolean;
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
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between gap-2 px-4 py-3 bg-slate-50 border rounded-2xl text-xs transition-all ${
            isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`block truncate ${selected.length ? 'text-slate-800 font-bold' : 'text-slate-400 font-medium'}`}>
            {selected.length === 0 ? placeholder : `${selected.length} Selected`}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute z-[60] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 max-h-[300px] overflow-y-auto custom-scrollbar"
            >
              <div className="space-y-1">
                {options.map((option: string) => (
                  <button
                    key={option}
                    onClick={() => toggleOption(option)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
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

export default function UnifiedReportingHub() {
  const { t, i18n } = useTranslation();
  
  // App State
  const [viewMode, setViewMode] = useState<'STATUS' | 'LOGS' | 'GAPS'>('STATUS');
  const [selectedOutbreakId, setSelectedOutbreakId] = useState("");
  const [facilities, setFacilities] = useState<UserData[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dynamicFields, setDynamicFields] = useState<FormField[]>([]);
  const [selectedReportForView, setSelectedReportForView] = useState<Report | null>(null);
  const [entryModal, setEntryModal] = useState<{ isOpen: boolean; mode: 'CREATE' | 'EDIT'; item: any; outbreakId: string }>({
    isOpen: false,
    mode: 'CREATE',
    item: null,
    outbreakId: ''
  });
  const [exporting, setExporting] = useState(false);

  // Filters
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateRange, setDateRange] = useState({
    from: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'missing'>('all');
  
  // Separate Pagination for Status/Gaps vs Logs
  const [statusPage, setStatusPage] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    // Reset page on filter change
    setPage(1);
    setStatusPage(1);
  }, [selectedDate, dateRange, selectedOutbreakId, viewMode, selectedDivisions, selectedDistricts, searchQuery, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [selectedDate, dateRange, selectedOutbreakId, viewMode, page, selectedDivisions, selectedDistricts]);

  useEffect(() => {
    if (selectedOutbreakId) {
      fetch(`/api/public/fields?outbreakId=${selectedOutbreakId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Pick core numeric fields for display
            const targetFields = data.filter(f => f.fieldType === 'NUMBER' || f.isCoreField).slice(0, 3);
            setDynamicFields(targetFields);
          }
        })
        .catch(err => console.error("Failed to fetch dynamic fields", err));
    } else {
      setDynamicFields([]);
    }
  }, [selectedOutbreakId]);

  const fetchBaseData = async () => {
    try {
      const res = await fetch('/api/facilities'); 
      const data = await res.json();
      if (Array.isArray(data)) {
        setFacilities(data.map((f: any) => ({
          id: f.id,
          facilityId: f.id,
          facilityName: f.facilityName,
          division: f.division,
          district: f.district,
          email: f.email || 'N/A',
          phone: f.phone || 'N/A',
          role: 'FACILITY'
        })));
      }
    } catch (err) {
      console.error("Failed to fetch facilities", err);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const isStatusMode = viewMode === 'STATUS';
      const queryParams = new URLSearchParams({
        page: isStatusMode ? '1' : page.toString(),
        limit: isStatusMode ? '2000' : limit.toString(), // High limit for status map
      });

      if (viewMode === 'STATUS') {
        queryParams.append('date', selectedDate);
      } else if (viewMode === 'LOGS' || viewMode === 'GAPS') {
        queryParams.append('from', dateRange.from);
        queryParams.append('to', dateRange.to);
      }

      if (selectedOutbreakId) queryParams.append('outbreakId', selectedOutbreakId);
      if (selectedDivisions.length > 0) queryParams.append('divisions', selectedDivisions.join(','));
      if (selectedDistricts.length > 0) queryParams.append('districts', selectedDistricts.join(','));

      const res = await fetch(`/api/reports?${queryParams.toString()}`);
      const data = await res.json();
      
      if (data.reports) {
        setReports(data.reports);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to permanently delete this report? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchReports();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete report");
      }
    } catch (e) {
      alert("Network error");
    }
  };

  // Logic for Status View (Who submitted today?)
  const reportMap = useMemo(() => {
    const map = new Map<string, Report>();
    reports.forEach(r => {
      // In STATUS mode, the reports fetched are for the specific selectedDate
      if (viewMode === 'STATUS') map.set(r.facilityId, r);
    });
    return map;
  }, [reports, viewMode]);

  const filteredFacilities = useMemo(() => {
     let list = [...facilities];
     
     if (selectedDivisions.length > 0) list = list.filter(f => selectedDivisions.includes(f.division));
     if (selectedDistricts.length > 0) list = list.filter(f => selectedDistricts.includes(f.district));
     if (searchQuery) {
       const q = searchQuery.toLowerCase();
       list = list.filter(f => f.facilityName.toLowerCase().includes(q) || f.district.toLowerCase().includes(q));
     }

     if (viewMode === 'STATUS') {
        if (statusFilter === 'submitted') list = list.filter(f => reportMap.has(f.id));
        if (statusFilter === 'missing') list = list.filter(f => !reportMap.has(f.id));
     }
     
     return list;
  }, [facilities, viewMode, selectedDivisions, selectedDistricts, searchQuery, statusFilter, reportMap]);

  const stats = useMemo(() => {
    const total = facilities.length;
    const submittedOnDate = facilities.filter(f => reportMap.has(f.id)).length;
    
    let totalSuspected = 0, totalConfirmed = 0;
    reports.forEach(r => {
      totalSuspected += r.suspected24h || 0;
      totalConfirmed += r.confirmed24h || 0;
    });

    const verifiedCount = reports.filter(r => r.published).length;

    return {
      totalFacilities: total,
      submittedToday: submittedOnDate,
      missingToday: total - submittedOnDate,
      rateToday: total > 0 ? Math.round((submittedOnDate / total) * 100) : 0,
      periodSuspected: totalSuspected,
      periodConfirmed: totalConfirmed,
      verifiedCount
    };
  }, [facilities, reportMap, reports]);

  const paginatedStatusData = useMemo(() => {
    const startIndex = (statusPage - 1) * limit;
    return filteredFacilities.slice(startIndex, startIndex + limit);
  }, [filteredFacilities, statusPage, limit]);

  const gapAnalysis = useMemo(() => {
    if (viewMode !== 'GAPS' || !filteredFacilities.length) return [];
    
    const start = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    const intervals = eachDayOfInterval({ start, end });
    const totalDays = intervals.length;
    
    return filteredFacilities.map(f => {
      const facilityReports = reports.filter(r => r.facilityId === f.id);
      const reportedDates = facilityReports.map(r => format(new Date(r.reportingDate), 'yyyy-MM-dd'));
      const missingDates = intervals
        .filter(day => !reportedDates.includes(format(day, 'yyyy-MM-dd')))
        .map(day => day);
        
      const rate = Math.round((facilityReports.length / totalDays) * 100);
      return {
        ...f,
        reportsCount: facilityReports.length,
        missingCount: missingDates.length,
        missingDates,
        rate
      };
    }).filter(f => f.missingCount > 0)
      .sort((a, b) => b.missingCount - a.missingCount);
  }, [viewMode, filteredFacilities, reports, dateRange]);

  const resetFilters = () => {
    setSelectedDivisions([]);
    setSelectedDistricts([]);
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedOutbreakId("");
  };
  
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      let dataToExport = [];
      
      if (viewMode === 'LOGS' || viewMode === 'GAPS') {
        // Fetch ALL data for logs/gaps
        const queryParams = new URLSearchParams({
          page: '1',
          limit: '5000', // Safe high limit for export
          from: dateRange.from,
          to: dateRange.to
        });
        if (selectedOutbreakId) queryParams.append('outbreakId', selectedOutbreakId);
        if (selectedDivisions.length > 0) queryParams.append('divisions', selectedDivisions.join(','));
        if (selectedDistricts.length > 0) queryParams.append('districts', selectedDistricts.join(','));

        const res = await fetch(`/api/reports?${queryParams.toString()}`);
        const data = await res.json();
        dataToExport = data.reports || [];
      } else {
        // Status mode uses all filtered facilities
        dataToExport = filteredFacilities;
      }

      const worksheetData = dataToExport.map((item: any) => {
        const isReportMode = viewMode === 'LOGS' || viewMode === 'GAPS';
        const facility = isReportMode ? item.facility : item;
        const report = isReportMode ? item : reportMap.get(item.id);
        const displayDate = isReportMode ? item.reportingDate : selectedDate;
        
        const row: any = {
          'Facility Name': facility?.facilityName || 'N/A',
          'Division': facility?.division || 'N/A',
          'District': facility?.district || 'N/A',
          'Reporting Date': displayDate ? format(new Date(displayDate), 'yyyy-MM-dd') : 'N/A',
          'Status': report ? 'Received' : 'Missing',
          'Verified': report?.published ? 'Yes' : 'No',
          'Suspected': report?.suspected24h || 0,
          'Confirmed': report?.confirmed24h || 0,
          'Suspected Deaths': report?.suspectedDeath24h || 0,
          'Confirmed Deaths': report?.confirmedDeath24h || 0,
          'Admissions': report?.admitted24h || 0,
          'Discharges': report?.discharged24h || 0,
        };

        dynamicFields.forEach(field => {
          const source = isReportMode ? item : report;
          row[field.label] = (source as any)?.[field.fieldKey] ?? source?.dataSnapshot?.[field.fieldKey] ?? 0;
        });

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reports");
      XLSX.writeFile(wb, `DGHS_Reports_${viewMode}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    } catch (err) {
      alert("Failed to export: " + (err as any).message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      let dataToExport = [];
      if (viewMode === 'LOGS' || viewMode === 'GAPS') {
        const queryParams = new URLSearchParams({ page: '1', limit: '200' }); // PDF can't handle too many rows well
        if (selectedOutbreakId) queryParams.append('outbreakId', selectedOutbreakId);
        const res = await fetch(`/api/reports?${queryParams.toString()}`);
        const data = await res.json();
        dataToExport = data.reports || [];
      } else {
        dataToExport = filteredFacilities.slice(0, 500); // Limit for PDF stability
      }

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`DGHS Reporting Hub - ${viewMode} Report`, 14, 22);
      doc.setFontSize(11);
      doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 30);
      
      const headers = ['Facility', 'Location', 'Date', 'Status', 'Suspected', 'Confirmed'];
      const body = dataToExport.map((item: any) => {
        const isReportMode = viewMode === 'LOGS' || viewMode === 'GAPS';
        const facility = isReportMode ? item.facility : item;
        const report = isReportMode ? item : reportMap.get(item.id);
        const displayDate = isReportMode ? item.reportingDate : selectedDate;
        
        return [
          facility?.facilityName || 'N/A',
          `${facility?.district || ''}, ${facility?.division || ''}`,
          displayDate ? format(new Date(displayDate), 'dd MMM yyyy') : 'N/A',
          report ? 'Received' : 'Missing',
          report?.suspected24h || 0,
          report?.confirmed24h || 0
        ];
      });

      autoTable(doc, {
        startY: 35,
        head: [headers],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: '#F8FAFC' as any, textColor: [100, 116, 139], fontStyle: 'bold' },
        styles: { fontSize: 8 }
      });

      doc.save(`DGHS_Reports_${viewMode}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (err) {
      alert("Failed to export: " + (err as any).message);
    } finally {
      setExporting(false);
    }
  };

  const currentDistricts = useMemo(() => {
    if (selectedDivisions.length === 0) return Object.values(DISTRICTS_BY_DIVISION).flat().sort();
    return selectedDivisions.flatMap(div => DISTRICTS_BY_DIVISION[div] || []).sort();
  }, [selectedDivisions]);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-32 bg-slate-50/50 min-h-screen">
      <Breadcrumbs />
      
      {/* Dynamic Hero Header */}
      <div className="relative group overflow-hidden bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] scale-150 rotate-12 transition-transform group-hover:scale-110">
          <Layers className="w-64 h-64" />
        </div>
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="flex bg-indigo-50 p-1.5 rounded-2xl border border-indigo-100">
                  <button 
                    onClick={() => setViewMode('STATUS')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'STATUS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:text-indigo-600'}`}
                  >
                    Reporting Hub
                  </button>
                  <button 
                    onClick={() => setViewMode('LOGS')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'LOGS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:text-indigo-600'}`}
                  >
                    Submission Logs
                  </button>
                  <button 
                    onClick={() => setViewMode('GAPS')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'GAPS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:text-indigo-600'}`}
                  >
                    Gap Analysis
                  </button>
               </div>
               <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 animate-pulse">
                 Live Feed
               </div>
            </div>
            
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
              {viewMode === 'STATUS' ? 'Reporting Hub' : viewMode === 'LOGS' ? 'Archive' : 'Gap Analysis'}
              <span className="text-slate-300 font-light ml-3 italic"></span>
            </h1>
            <p className="text-slate-500 font-medium max-w-xl text-sm leading-relaxed">
              {viewMode === 'STATUS' ? 'Monitor immediate reporting compliance for today. Identify which units are reporting active cases and who is currently silent.' : 'Explore every data point submitted across the national network. Search, audit, and verify epidemiologic records.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="w-72">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Active Outbreak Context</label>
              <AdminOutbreakSelector onSelect={setSelectedOutbreakId} defaultValue={selectedOutbreakId} />
            </div>
            
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1 self-end">
                  {viewMode === 'STATUS' ? 'Reference Date' : 'Analysis Window'}
               </label>
               <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
                 {viewMode === 'STATUS' ? (
                   <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)} 
                    className="bg-transparent border-none text-xs font-black text-slate-700 focus:ring-0 px-4 py-2 cursor-pointer"
                   />
                 ) : (
                   <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        value={dateRange.from} 
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))} 
                        className="bg-transparent border-none text-[10px] font-black text-slate-600 focus:ring-0 px-3 py-2 cursor-pointer"
                      />
                      <span className="text-slate-300">/</span>
                      <input 
                        type="date" 
                        value={dateRange.to} 
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))} 
                        className="bg-transparent border-none text-[10px] font-black text-slate-600 focus:ring-0 px-3 py-2 cursor-pointer"
                      />
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: viewMode === 'STATUS' ? 'Targeted Units' : 'Total Submissions', value: viewMode === 'STATUS' ? filteredFacilities.length : (pagination?.total || 0), icon: Building2, color: 'indigo' },
           { label: viewMode === 'STATUS' ? 'Compliance' : 'Suspected', value: viewMode === 'STATUS' ? `${stats.rateToday}%` : stats.periodSuspected, icon: viewMode === 'STATUS' ? Check : Activity, color: 'emerald' },
           { label: viewMode === 'STATUS' ? 'Unreported' : 'Confirmed', value: viewMode === 'STATUS' ? (filteredFacilities.length - (viewMode === 'STATUS' ? stats.submittedToday : 0)) : stats.periodConfirmed, icon: viewMode === 'STATUS' ? AlertCircle : TrendingUp, color: 'rose' },
           { label: 'Publication Scope', value: `${stats.verifiedCount} Verified`, icon: Globe, color: 'indigo' }
         ].map((stat, i) => (
           <div key={i} className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-slate-900 group-hover:scale-110 transition-transform">
                <stat.icon className="w-16 h-16" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-slate-50 rounded-xl"><stat.icon className="w-4 h-4 text-slate-500" /></div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">{stat.value}</div>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        {/* Unified Sidebar Filters */}
        <div className="xl:col-span-1 space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 sticky top-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-indigo-50 rounded-xl"><Filter className="w-5 h-5 text-indigo-600" /></div>
                   <h3 className="font-black text-slate-800 tracking-tight uppercase text-sm">Strategic Filters</h3>
                </div>
                <button onClick={resetFilters} className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest">Reset</button>
              </div>

              <div className="h-px bg-slate-100 mx-2" />

              <div className="space-y-6">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unit Search</label>
                   <div className="relative">
                     <input 
                      type="text" 
                      placeholder="Identifier or name..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-4 pr-10 text-xs font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" 
                     />
                     <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   </div>
                </div>

                {viewMode === 'STATUS' && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Compliance Status</label>
                    <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                       {['all', 'submitted', 'missing'].map(s => (
                         <button 
                           key={s}
                           onClick={() => setStatusFilter(s as any)}
                           className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all ${statusFilter === s ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 opacity-60'}`}
                         >
                           {s.substring(0,4)}
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                <CustomMultiSelect 
                  label="Administrative Divisions" 
                  options={DIVISIONS} 
                  selected={selectedDivisions} 
                  onChange={setSelectedDivisions} 
                  icon={MapPin}
                  placeholder="National View"
                />

                <CustomMultiSelect 
                  label="Districts" 
                  options={currentDistricts} 
                  selected={selectedDistricts} 
                  onChange={setSelectedDistricts} 
                  icon={MapPin}
                  placeholder={selectedDivisions.length ? "All Selectable Districts" : "Filter by Division"}
                />
              </div>

              <div className="pt-6 border-t border-slate-100">
                <button 
                  onClick={fetchReports}
                  className="w-full py-4 bg-slate-900 border border-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-3"
                >
                  <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Sync Console
                </button>
              </div>
           </div>
        </div>

        {/* Results Console */}
        <div className="xl:col-span-3">
           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[700px] flex flex-col overflow-hidden">
              <div className="px-10 py-8 border-b border-slate-100 bg-white sticky top-0 z-20 flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl ring-4 ring-slate-100">
                       {viewMode === 'STATUS' ? <Building2 className="w-6 h-6" /> : viewMode === 'LOGS' ? <History className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
                          {viewMode === 'STATUS' ? 'Network Integrity Status' : viewMode === 'LOGS' ? 'Submission Archive' : 'Reporting Gap Matrix'}
                       </h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          {viewMode === 'STATUS' ? filteredFacilities.length : (pagination?.total || 0)} units quantified
                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                          {selectedOutbreakId ? 'Outbreak Filter Active' : 'Universal Surveillance Context'}
                       </p>
                    </div>
                 </div>
                 
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleExportExcel}
                      disabled={exporting}
                      className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-2xl transition-all disabled:opacity-50"
                      title="Export to Excel"
                    >
                       {exporting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={handleExportPDF}
                      disabled={exporting}
                      className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-2xl transition-all disabled:opacity-50"
                      title="Export to PDF"
                    >
                       {exporting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-x-auto custom-scrollbar">
                 {viewMode === 'GAPS' ? (
                   <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-5">
                      {loading ? (
                         <div className="col-span-full py-40 flex justify-center"><RefreshCcw className="w-10 h-10 text-indigo-400 animate-spin" /></div>
                      ) : gapAnalysis.length === 0 ? (
                        <div className="col-span-full py-40 text-center space-y-5">
                           <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto" />
                           <h4 className="text-xl font-black text-slate-800">No Reporting Faults Detected</h4>
                           <p className="text-slate-400 max-w-sm mx-auto font-medium">All monitored facilities have maintained perfect reporting synchronization in this period.</p>
                        </div>
                      ) : gapAnalysis.map((f: any) => (
                        <div key={f.id} className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:border-indigo-300 transition-all group flex flex-col">
                           <div className="flex items-start justify-between mb-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center ring-4 ring-indigo-50/50">
                                    <Building2 className="w-7 h-7" />
                                 </div>
                                 <div className="flex flex-col">
                                    <h4 className="font-black text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{f.facilityName}</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1">{f.district}, {f.division}</p>
                                 </div>
                              </div>
                              <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${f.missingCount > 3 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                 {f.missingCount} Missing
                              </div>
                           </div>
                           
                           <div className="space-y-4 pt-6 border-t border-slate-50 flex-1">
                               <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase">
                                  <span>Sync Score</span>
                                  <span className="text-indigo-600">{f.rate}%</span>
                               </div>
                               <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${f.rate}%` }}
                                    className="h-full bg-indigo-600 shadow-sm"
                                  />
                               </div>
                               
                               <div className="flex flex-wrap gap-1.5 pt-2">
                                  {f.missingDates.slice(0, 10).map((day: any) => (
                                    <span key={day.toString()} className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-tight border border-slate-100">
                                       {format(day, 'MMM dd')}
                                    </span>
                                  ))}
                                  {f.missingDates.length > 10 && (
                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black">
                                       +{f.missingDates.length - 10} More
                                    </span>
                                  )}
                               </div>
                           </div>
                           
                           <div className="pt-6 mt-auto flex justify-between items-center">
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{f.reportsCount} reported / {f.reportsCount + f.missingCount} total</p>
                              <button className="text-[10px] font-black text-indigo-500 hover:text-indigo-800 uppercase tracking-widest px-3 py-1.5 hover:bg-indigo-50 rounded-xl transition-all">Send Notice</button>
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
<table className="w-full text-left border-collapse min-w-[1100px]">
  <thead>
    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
      <th className="px-10 py-6 border-b border-slate-100 text-center w-[280px]">Facility / Target unit</th>
      <th className="w-[60px] px-6 py-6 border-b border-slate-100 text-center">Division/District</th>
      <th className="w-[60px] px-6 py-6 border-b border-slate-100 text-center">Reference Date</th>
      <th className="w-[60px] px-6 py-6 border-b border-slate-100 text-center">Status</th>
      
      {/* Dynamic Headers */}
      {dynamicFields.length > 0 ? (
        dynamicFields.map(field => (
          <th key={field.id} className="w-[120px] px-6 py-6 border-b border-slate-100 text-center" title={field.label}>
            {i18n.language === 'bn' ? field.labelBn || field.label : field.label}
          </th>
        ))
      ) : (
        <>
          <th className="w-[100px] px-6 py-6 border-b border-slate-100 text-center">Susp.</th>
          <th className="w-[100px] px-6 py-6 border-b border-slate-100 text-center">Conf.</th>
          {viewMode === 'LOGS' && <th className="w-[100px] px-6 py-6 border-b border-slate-100 text-center">Deaths</th>}
        </>
      )}
      
      <th className="w-[160px] px-10 py-6 border-b border-slate-100 text-right">Actions</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-slate-100">
    {loading ? (
      <tr><td colSpan={7 + (viewMode === 'LOGS' ? dynamicFields.length : 0)} className="p-32 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Synchronizing Console Data...</td></tr>
    ) : (viewMode === 'LOGS' ? reports : paginatedStatusData).map((item: any) => {
      // item could be a facility (STATUS) or a report (LOGS)
      const isReportMode = viewMode === 'LOGS';
      const facility = isReportMode ? item.facility : item;
      const report = isReportMode ? item : reportMap.get(item.id);
      const displayDate = isReportMode ? item.reportingDate : selectedDate;
      
      return (
        <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
          <td className="px-10 py-6">
            <div className="flex items-start gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-slate-800 tracking-tight break-words leading-tight">{facility?.facilityName || 'Global System'}</span>
                <span className="text-[10px] font-bold text-slate-400 break-words opacity-70 px-0.5 leading-relaxed">{facility?.email || 'No communication registered'}</span>
              </div>
            </div>
          </td>
          <td className="px-6 py-6">
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-700 break-words">{facility?.district || 'N/A'}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] opacity-100">{facility?.division || 'N/A'}</span>
            </div>
          </td>
          <td className="px-6 py-6 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-black text-slate-800 tracking-tight whitespace-nowrap">
                {format(new Date(displayDate), 'dd MMM yyyy')}
              </span>
              {isReportMode && item.outbreak && <span className="text-[8px] font-black uppercase text-indigo-500 mt-0.5 bg-indigo-50 px-1.5 rounded break-words max-w-[100px]">{item.outbreak.name}</span>}
            </div>
          </td>
          <td className="px-6 py-6 text-center">
            {report ? (
              <div className="flex flex-col items-center gap-1">
                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1 whitespace-nowrap">
                  <Check className="w-3 h-3" />
                  Received
                </div>
                {report.published && (
                  <span className="flex items-center gap-1 text-[8px] font-black text-indigo-400 uppercase tracking-tighter whitespace-nowrap"><Globe className="w-2.5 h-2.5" /> Published</span>
                )}
              </div>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-500 rounded-full text-[9px] font-black uppercase tracking-widest opacity-100 whitespace-nowrap">Missing</span>
            )}
          </td>

          {/* Dynamic or Legacy Data Columns */}
          {dynamicFields.length > 0 ? (
            dynamicFields.map(field => {
              const source = isReportMode ? item : report;
              const val = (source as any)?.[field.fieldKey] ?? source?.dataSnapshot?.[field.fieldKey] ?? '-';
              return (
                <td key={field.id} className="px-6 py-6 text-center">
                  <span className="text-xs font-black text-slate-700 tabular-nums break-words">{val}</span>
                </td>
              );
            })
          ) : (
            <>
              <td className="px-6 py-6 text-center">
                <span className={`text-xs font-black tabular-nums transition-colors break-words ${report ? 'text-indigo-600' : 'text-slate-200'}`}>{report?.suspected24h ?? '-'}</span>
              </td>
              <td className="px-6 py-6 text-center">
                <span className={`text-xs font-black tabular-nums transition-colors break-words ${report ? 'text-emerald-600' : 'text-slate-200'}`}>{report?.confirmed24h ?? '-'}</span>
              </td>
              {isReportMode && (
                <td className="px-6 py-6 text-center">
                  <span className={`text-xs font-black tabular-nums transition-colors break-words ${report ? 'text-rose-600' : 'text-slate-200'}`}>
                    {(report?.suspectedDeath24h ?? 0) + (report?.confirmedDeath24h ?? 0) || '-'}
                  </span>
                </td>
              )}
            </>
          )}

          <td className="px-10 py-6 text-right">
            <div className="flex items-center justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
              {report ? (
                <>
                  <button 
                    onClick={() => setSelectedReportForView(report)}
                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all" 
                    title="View Detail"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setEntryModal({ isOpen: true, mode: 'EDIT', item: report, outbreakId: report.outbreakId || selectedOutbreakId })}
                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all" 
                    title="Edit Context"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteReport(report.id)}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-sm rounded-xl transition-all" 
                    title="Purge Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setEntryModal({ isOpen: true, mode: 'CREATE', item: facility, outbreakId: selectedOutbreakId })}
                  className="px-4 py-2 text-[9px] font-black uppercase text-indigo-600 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-xl transition-all tracking-widest bg-slate-50 whitespace-nowrap"
                >
                  Show
                </button>
              )}
            </div>
          </td>
        </tr>
      )
    })}
  </tbody>
</table>
                 )}
              </div>

              {/* Unified Pagination Console */}
              <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                 <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigation Console</p>
                    <p className="text-sm font-black text-slate-700 tracking-tight">
                       {viewMode === 'LOGS' ? (
                         <>Showing <b>{(page - 1) * limit + 1} - {Math.min(page * limit, pagination?.total || 0)}</b> of <b>{pagination?.total || 0}</b> logs</>
                       ) : (
                         <>Showing <b>{(statusPage - 1) * limit + 1} - {Math.min(statusPage * limit, filteredFacilities.length)}</b> of <b>{filteredFacilities.length}</b> units</>
                       )}
                    </p>
                 </div>
                 
                 <div className="flex items-center gap-2">
                    <button 
                       onClick={() => viewMode === 'LOGS' ? setPage(p => Math.max(1, p - 1)) : setStatusPage(p => Math.max(1, p - 1))}
                       disabled={(viewMode === 'LOGS' ? page : statusPage) === 1}
                       className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 disabled:opacity-40 transition-all shadow-sm"
                    >
                       <ChevronLeft className="w-6 h-6" />
                    </button>
                    
                    <div className="flex items-center gap-1.5 px-3">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         Page {viewMode === 'LOGS' ? page : statusPage} / {viewMode === 'LOGS' ? (pagination?.totalPages || 1) : Math.ceil(filteredFacilities.length / limit) || 1}
                       </span>
                    </div>

                    <button 
                       onClick={() => viewMode === 'LOGS' ? setPage(p => Math.min(pagination?.totalPages || 1, p + 1)) : setStatusPage(p => Math.min(Math.ceil(filteredFacilities.length / limit), p + 1))}
                       disabled={viewMode === 'LOGS' ? page >= (pagination?.totalPages || 1) : statusPage >= Math.ceil(filteredFacilities.length / limit)}
                       className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 disabled:opacity-40 transition-all shadow-sm"
                    >
                       <ChevronRight className="w-6 h-6" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Entry / Edit Modal */}
      <AnimatePresence>
        {entryModal.isOpen && (
          <ReportEntryModal 
            mode={entryModal.mode}
            item={entryModal.item}
            outbreakId={entryModal.outbreakId}
            selectedDate={selectedDate}
            onClose={() => setEntryModal({ ...entryModal, isOpen: false })}
            onSuccess={() => {
              setEntryModal({ ...entryModal, isOpen: false });
              fetchReports();
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail View Modal */}
      <AnimatePresence>
        {selectedReportForView && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedReportForView(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Report Documentation</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Snapshot of submitted epidemiologic data</p>
                </div>
                <button onClick={() => setSelectedReportForView(null)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Facility</span>
                      <p className="text-lg font-black text-slate-800 tracking-tighter uppercase">{selectedReportForView.facility?.facilityName}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Reporting Date</span>
                      <p className="text-lg font-black text-slate-800 tracking-tighter uppercase">{format(new Date(selectedReportForView.reportingDate), 'dd MMMM yyyy')}</p>
                   </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Suspected', val: selectedReportForView.suspected24h, color: 'indigo' },
                    { label: 'Confirmed', val: selectedReportForView.confirmed24h, color: 'emerald' },
                    { label: 'Admits', val: selectedReportForView.admitted24h, color: 'sky' },
                    { label: 'Discharges', val: selectedReportForView.discharged24h, color: 'slate' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{stat.label}</span>
                       <span className={`text-2xl font-black text-${stat.color}-600 tabular-nums tracking-tighter`}>{stat.val ?? 0}</span>
                    </div>
                  ))}
                </div>

                {selectedReportForView.dataSnapshot && (
                   <div className="space-y-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-2">Extended Attributes</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                         {Object.entries(selectedReportForView.dataSnapshot).map(([key, val]: any) => (
                           <div key={key} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl">
                              <span className="font-bold text-slate-500 uppercase tracking-tighter">{key}</span>
                              <span className="font-black text-slate-800">{val}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                )}
              </div>
              <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: {selectedReportForView.id}</span>
                <div className="flex gap-2">
                  <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button 
                    onClick={() => setSelectedReportForView(null)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}

function ReportEntryModal({ mode, item, outbreakId, selectedDate, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState<any>({
    reportingDate: mode === 'EDIT' ? (item.reportingDate || '').split('T')[0] : selectedDate,
    suspected24h: mode === 'EDIT' ? item.suspected24h : '',
    confirmed24h: mode === 'EDIT' ? item.confirmed24h : '',
    suspectedDeath24h: mode === 'EDIT' ? item.suspectedDeath24h : '',
    confirmedDeath24h: mode === 'EDIT' ? item.confirmedDeath24h : '',
    admitted24h: mode === 'EDIT' ? item.admitted24h : '',
    discharged24h: mode === 'EDIT' ? item.discharged24h : '',
    serumSent24h: mode === 'EDIT' ? item.serumSent24h : ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const facility = mode === 'EDIT' ? item.facility : item;
    const url = mode === 'EDIT' ? `/api/reports/${item.id}` : '/api/reports';
    const method = mode === 'EDIT' ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          facilityId: facility.id,
          userId: facility.id,
          outbreakId: outbreakId,
          division: facility.division,
          district: facility.district,
          facilityName: facility.facilityName
        })
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      setError('Network communication error');
    } finally {
      setSaving(false);
    }
  };

  const facility = mode === 'EDIT' ? item.facility : item;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[3rem] w-full max-w-2xl shadow-3xl border border-white/20 overflow-hidden"
      >
        <div className="px-10 py-10 border-b border-slate-100 flex items-center justify-between bg-white relative">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
          <div>
             <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                {mode === 'EDIT' ? 'Modify Snapshot' : 'Field Entry'}
             </h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                <Building2 className="w-3 h-3 text-indigo-500" />
                {facility.facilityName}
             </p>
          </div>
          <button onClick={onClose} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all shadow-sm"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-[11px] font-bold flex items-center gap-3">
               <AlertCircle className="w-4 h-4" />
               {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reporting Date</label>
              <input 
                type="date" 
                value={formData.reportingDate}
                onChange={(e) => setFormData({ ...formData, reportingDate: e.target.value })}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                disabled={mode === 'EDIT'}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Context</label>
              <div className="w-full bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3 h-3" />
                ID: {outbreakId || 'Universal'}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          <div className="grid grid-cols-2 gap-x-8 gap-y-10">
            {[
              { label: 'Suspected cases (24h)', key: 'suspected24h' },
              { label: 'Confirmed cases (24h)', key: 'confirmed24h' },
              { label: 'Deaths (Suspected/24h)', key: 'suspectedDeath24h' },
              { label: 'Deaths (Confirmed/24h)', key: 'confirmedDeath24h' },
              { label: 'Current Admissions', key: 'admitted24h' },
              { label: 'Discharges (24h)', key: 'discharged24h' },
            ].map((field) => (
              <div key={field.key} className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 leading-tight block">{field.label}</label>
                <input 
                  type="number" 
                  min="0"
                  placeholder="0"
                  value={formData[field.key]}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-black text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all tabular-nums"
                />
              </div>
            ))}
          </div>
        </form>

        <div className="px-10 py-10 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button 
            type="button"
            onClick={onClose}
            className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={saving || !outbreakId}
            className="px-10 py-4 bg-slate-900 border border-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <RefreshCcw className="w-4 h-4 animate-spin" />
            ) : (
              mode === 'EDIT' ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />
            )}
            {saving ? 'Syncing...' : mode === 'EDIT' ? 'Update Entry' : 'Manual Submit'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}