"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar,
  User as UserIcon,
  Activity,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  RefreshCcw,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Breadcrumbs from '@/components/Breadcrumbs';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  createdAt: string;
  user: {
    name: string;
    role: string;
    email: string;
  };
}

const ACTION_OPTIONS = ["ALL", "CREATE", "UPDATE", "DELETE", "BULK_UPLOAD", "LOGIN", "LOGOUT"];
const ENTITY_OPTIONS = ["ALL", "User", "Facility", "Report", "Outbreak", "Settings", "SubmissionWindow", "BacklogSlot"];

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filter States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(15);
  
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  
  const [selectedLogDetails, setSelectedLogDetails] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, actionFilter, entityFilter, dateRange]);

  // Debounce search input
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (currentPage === 1) {
        fetchLogs();
      } else {
        setCurrentPage(1);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      if (actionFilter !== "ALL") params.append("action", actionFilter);
      if (entityFilter !== "ALL") params.append("entityType", entityFilter);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (dateRange.from) params.append("from", dateRange.from);
      if (dateRange.to) params.append("to", dateRange.to);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setActionFilter("ALL");
    setEntityFilter("ALL");
    setSearchQuery("");
    setDateRange({ from: "", to: "" });
    setCurrentPage(1);
  };

  const renderDetailsSummary = (log: AuditLog) => {
    if (!log.details) return <span className="text-slate-400 font-medium">-</span>;
    
    try {
      const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      
      if (log.action === 'BULK_UPLOAD' || log.action.includes('BULK')) {
        return (
          <div className="text-xs space-y-1">
            <p className="font-bold text-slate-700">File: <span className="font-mono text-indigo-600">{details.fileName || 'N/A'}</span></p>
            <p className="text-[10px] text-slate-500">Processed: <b className="text-slate-700">{details.totalRows || 0}</b> rows | Success: <b className="text-emerald-600">{details.successCount || 0}</b> | Failed: <b className="text-rose-600">{details.failedCount || 0}</b></p>
          </div>
        );
      }
      
      if (details.fileName) {
        return <span className="text-xs font-bold text-slate-700">File: {details.fileName}</span>;
      }
      
      if (details.changes) {
        const changesList = Object.entries(details.changes).map(([field, val]: any) => {
          const fromVal = val.from === null || val.from === undefined ? 'null' : String(val.from);
          const toVal = val.to === null || val.to === undefined ? 'null' : String(val.to);
          return `${field}: ${fromVal} → ${toVal}`;
        });
        return (
          <span className="text-xs font-medium text-slate-600 truncate max-w-xs block" title={changesList.join(', ')}>
            {changesList.join(', ')}
          </span>
        );
      }
      
      const summaryKeys = ['name', 'title', 'email', 'facilityName', 'outbreakId', 'reason', 'action'];
      const summaryInfo: string[] = [];
      for (const key of summaryKeys) {
        if (details[key] !== undefined) {
          summaryInfo.push(`${key}: ${details[key]}`);
        }
      }
      
      if (summaryInfo.length > 0) {
        return <span className="text-xs font-semibold text-slate-600">{summaryInfo.join(' | ')}</span>;
      }
      
      return (
        <span className="text-[10px] font-mono text-slate-400 truncate max-w-xs block" title={JSON.stringify(details)}>
          {JSON.stringify(details)}
        </span>
      );
    } catch (e) {
      return <span className="text-[10px] font-mono text-slate-400 truncate max-w-xs block">{JSON.stringify(log.details)}</span>;
    }
  };

  if (session?.user?.role !== 'ADMIN') return <div className="p-16 text-center text-rose-600 font-bold">Access Denied</div>;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      <Breadcrumbs />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase">Audit Infrastructure</h1>
          <p className="text-slate-500 font-medium tracking-tight">Immutable log of all administrative and reporting actions</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLogs}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
            title="Refresh Audit Logs"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        {/* Filters Panel */}
        <div className="xl:col-span-1 space-y-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm sticky top-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 rounded-xl"><Filter className="w-5 h-5 text-indigo-600" /></div>
              <h3 className="font-black text-slate-800 tracking-tight uppercase text-sm">Filters</h3>
            </div>
            <button onClick={resetFilters} className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest">Reset</button>
          </div>

          <div className="h-px bg-slate-100 mx-2" />

          <div className="space-y-6">
            {/* Search Bar */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Search Audits</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Action, User, Entity ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-4 pr-10 text-xs font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
            </div>

            {/* Action Filter */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Action Type</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none cursor-pointer"
              >
                {ACTION_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt === "ALL" ? "All Actions" : opt}</option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Entity Type</label>
              <select
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none cursor-pointer"
              >
                {ENTITY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt === "ALL" ? "All Entities" : opt}</option>
                ))}
              </select>
            </div>

            {/* Date Filters */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Date Scope
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">From</span>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => { setDateRange(prev => ({ ...prev, from: e.target.value })); setCurrentPage(1); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-[10px] font-black text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">To</span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => { setDateRange(prev => ({ ...prev, to: e.target.value })); setCurrentPage(1); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-[10px] font-black text-slate-700 focus:ring-4 focus:ring-indigo-500/10 outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-3 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col justify-between">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[20%]">Timestamp</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[20%]">User</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Action</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Entity</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-[25%]">Summary of Changes</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right w-[5%]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-32 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                      Syncing Audit Data...
                    </td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-300 animate-spin-slow" />
                        <span className="text-xs font-bold tabular-nums">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                          {log.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{log.user?.name || "System Managed"}</p>
                          <p className="text-[10px] font-bold text-indigo-500 uppercase">{log.user?.role || "SYSTEM"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[9px] font-black tracking-widest uppercase ${
                        log.action.includes('DELETE') ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        log.action.includes('BULK') ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-slate-500 capitalize">{log.entityType}</p>
                      <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{log.entityId || "N/A"}</p>
                    </td>
                    <td className="px-8 py-5">
                      {renderDetailsSummary(log)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => setSelectedLogDetails(log)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"
                        title="View Full Payload"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && !loading && (
            <div className="py-24 text-center">
              <ShieldCheck className="w-16 h-16 text-slate-100 mx-auto mb-4 animate-bounce" />
              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">No matching audit logs found.</p>
            </div>
          )}

          {/* Pagination Console */}
          <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center sm:items-start">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigation Console</p>
              <p className="text-sm font-black text-slate-700 tracking-tight mt-0.5">
                Showing <b>{logs.length === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalCount)}</b> of <b>{totalCount}</b> audit logs
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 disabled:opacity-40 transition-all shadow-sm active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1.5 px-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Page {currentPage} / {totalPages || 1}
                </span>
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 disabled:opacity-40 transition-all shadow-sm active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Details View Modal */}
      <AnimatePresence>
        {selectedLogDetails && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto pt-16 md:pt-24" onClick={() => setSelectedLogDetails(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Audit Payload Document</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Snapshot of full log record details</p>
                </div>
                <button onClick={() => setSelectedLogDetails(null)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              
              <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Action</span>
                    <span className="text-sm font-black text-indigo-600 uppercase tracking-wider">{selectedLogDetails.action}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Timestamp</span>
                    <span className="text-sm font-bold text-slate-800">{new Date(selectedLogDetails.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Entity Type & ID</span>
                    <span className="text-sm font-bold text-slate-800">{selectedLogDetails.entityType} ({selectedLogDetails.entityId || "N/A"})</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Performed By</span>
                    <span className="text-sm font-bold text-slate-800">{selectedLogDetails.user?.name || "System"} ({selectedLogDetails.user?.role || "SYSTEM"})</span>
                  </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Raw Log Details JSON</span>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 overflow-x-auto max-h-[300px] custom-scrollbar">
                    <pre className="text-[11px] font-mono text-slate-600 leading-relaxed">
                      {JSON.stringify(selectedLogDetails.details, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[9px] font-black font-mono text-slate-400 uppercase tracking-widest">LOG ID: {selectedLogDetails.id}</span>
                <button 
                  onClick={() => setSelectedLogDetails(null)}
                  className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Dismiss
                </button>
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
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
