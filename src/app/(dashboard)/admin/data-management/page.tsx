"use client";

import { useState, useEffect } from "react";
import { 
  Trash2, 
  AlertTriangle, 
  Database, 
  Calendar, 
  CheckCircle2, 
  Loader2,
  RefreshCcw,
  ShieldAlert,
  Check,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function DataManagementPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [date]);

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch(`/api/reports?date=${date}`);
      const data = await res.json();
      if (res.ok) setReports(data);
    } catch {
      console.error("Failed to fetch reports");
    } finally {
      setReportsLoading(false);
    }
  };

  const handleCleanDaily = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${reports.length} reports for ${date}? This cannot be undone.`)) return;

    setLoading(true);
    setSuccess("");
    try {
      const res = await fetch("/api/admin/clean-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, mode: "DAILY" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        fetchReports();
      }
    } catch {
      console.error("Cleanup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this specific report?")) return;
    
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Report deleted successfully");
        fetchReports();
      }
    } catch {
      console.error("Deletion failed");
    }
  };

  const handleResetAll = async () => {
    if (!confirm("CRITICAL WARNING: This will delete EVERY report in the entire system. Are you absolutely sure?")) return;
    
    setLoading(true);
    setSuccess("");
    try {
      const res = await fetch("/api/admin/clean-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "ALL" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setConfirmAll(false);
        fetchReports();
      }
    } catch {
      console.error("Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-rose-100 rounded-2xl text-rose-600">
           <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Data Integrity Controls</h1>
          <p className="text-slate-500 mt-1">Actions here are permanent and affect global reporting data.</p>
        </div>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }}
            className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-4 text-emerald-800"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p className="font-bold text-lg">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8">
        {/* Daily Clean Section */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 bg-slate-50 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" /> Delete Reports by Date
            </h3>
          </div>
          <div className="p-8 space-y-6">
            <p className="text-slate-500">
              Select a specific date to remove all report submissions. This is useful for clearing errors or re-triggering submissions.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:flex-1">
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-semibold text-slate-700"
                />
              </div>
              <button 
                onClick={handleCleanDaily}
                disabled={loading}
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                Clear Date Data
              </button>
            </div>
          </div>
        </div>

        {/* Report List Section */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> Active Reports for {date}
            </h3>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest">{reports.length} Records</span>
          </div>
          <div className="p-0">
            {reportsLoading ? (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 text-indigo-200 animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Scanning Surveillance Matrix...</p>
              </div>
            ) : reports.length > 0 ? (
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-4 border-b">Facility</th>
                      <th className="px-8 py-4 border-b">Status</th>
                      <th className="px-8 py-4 border-b text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800">{r.facility?.facilityName || "Unknown"}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{r.facility?.district}, {r.facility?.division}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase border border-emerald-100">
                            <Check className="w-3 h-3" />
                            {r.status || 'SUBMITTED'}
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteReport(r.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Individual Report"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-50 rounded-full">
                   <ShieldAlert className="w-12 h-12 text-slate-200" />
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No reports found for this date.</p>
              </div>
            )}
          </div>
        </div>

        {/* Global Reset Section */}
        <div className="bg-white rounded-3xl border-2 border-rose-100 shadow-sm overflow-hidden relative group">
          <div className="px-8 py-6 bg-rose-50 border-b border-rose-100">
            <h3 className="text-xl font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Global Data Reset
            </h3>
          </div>
          <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
               <div className="bg-rose-100/50 p-6 rounded-2xl border border-rose-100 flex-shrink-0">
                  <Database className="w-12 h-12 text-rose-600" />
               </div>
               <div>
                  <p className="text-slate-600 leading-relaxed font-medium">
                    Resetting the system will permanently delete <strong>ALL</strong> historical measles outbreak reports across all divisions and facilities. Use this only for year-end maintenance or system initialization.
                  </p>
               </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
               <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={confirmAll}
                    onChange={(e) => setConfirmAll(e.target.checked)}
                    className="w-6 h-6 rounded border-slate-300 text-rose-600 focus:ring-rose-500/30 transition-all"
                  />
                  <span className="text-slate-700 font-bold">I understand this action is permanent and irreversible.</span>
               </label>
            </div>

            <button 
              onClick={handleResetAll}
              disabled={loading || !confirmAll}
              className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-rose-500" /> : <RefreshCcw className="w-6 h-6 text-rose-500" />}
              PERFORM GLOBAL RESET
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
