"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  HardDriveDownload,
  HardDriveUpload,
  Download,
  Upload,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileJson,
  ArrowRightLeft,
  X,
  Database,
  Clock,
  User,
  Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface BackupPreview {
  valid: boolean;
  version: string;
  platform: string;
  exportedAt: string;
  exportedBy: { id: string; email: string; name: string };
  incomingCounts: Record<string, number>;
  currentCounts: Record<string, number>;
}

const MODEL_LABELS: Record<string, string> = {
  FacilityType: "Facility Types",
  Disease: "Diseases",
  Settings: "Settings",
  Indicator: "Indicators",
  Facility: "Facilities",
  User: "Users",
  Outbreak: "Outbreaks",
  EmailRecipient: "Email Recipients",
  VerificationToken: "Verification Tokens",
  FormField: "Form Fields",
  SubmissionWindow: "Submission Windows",
  BacklogSlot: "Backlog Slots",
  Report: "Reports",
  ReportFieldValue: "Report Field Values",
  AuditLog: "Audit Logs",
};

export default function BackupPage() {
  const { t } = useTranslation();

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState("");

  // Restore state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export Handler ──────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    setExportSuccess("");
    try {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Export failed");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || "backup.json";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
      setExportSuccess(`Backup exported successfully (${sizeMB} MB)`);
      setTimeout(() => setExportSuccess(""), 6000);
    } catch (error) {
      console.error("Export failed:", error);
      setExportSuccess("");
    } finally {
      setExporting(false);
    }
  };

  // ── File Selection Handler ──────────────────────────────────
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setPreview(null);
    setPreviewError("");
    setConfirmChecked(false);
    setConfirmPhrase("");
    setRestoreSuccess("");
    setRestoreError("");

    // Validate file type
    if (!file.name.endsWith(".json")) {
      setPreviewError("Please select a .json backup file");
      return;
    }

    // Upload for preview
    setPreviewLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/backup?preview=true", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setPreviewError(data.error || "Invalid backup file");
        return;
      }

      setPreview(data);
    } catch {
      setPreviewError("Failed to validate backup file");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // ── Drag & Drop Handlers ────────────────────────────────────
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  // ── Restore Handler ─────────────────────────────────────────
  const handleRestore = async () => {
    if (!selectedFile || !confirmChecked || confirmPhrase !== "RESTORE BACKUP") return;

    setRestoring(true);
    setRestoreError("");
    setRestoreSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/admin/backup", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setRestoreError(data.error || "Restore failed");
        return;
      }

      setRestoreSuccess(data.message || "Database restored successfully");
      setSelectedFile(null);
      setPreview(null);
      setConfirmChecked(false);
      setConfirmPhrase("");
    } catch {
      setRestoreError("An unexpected error occurred during restore");
    } finally {
      setRestoring(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setPreviewError("");
    setConfirmChecked(false);
    setConfirmPhrase("");
    setRestoreSuccess("");
    setRestoreError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const totalIncoming = preview ? Object.values(preview.incomingCounts).reduce((a, b) => a + b, 0) : 0;
  const totalCurrent = preview ? Object.values(preview.currentCounts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <Breadcrumbs />

      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {t("adminPanel.backup")}
          </h1>
          <p className="text-slate-500 mt-1">
            {t("adminPanel.backupDesc")}
          </p>
        </div>
      </div>

      {/* ═══ SECTION 1: EXPORT BACKUP ═══ */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <HardDriveDownload className="w-5 h-5 text-indigo-600" />
            </div>
            {t("adminPanel.backupExport")}
          </h3>
        </div>
        <div className="p-8 space-y-6">
          <p className="text-slate-500 leading-relaxed">
            {t("adminPanel.backupExportDesc")}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="text-sm font-bold text-indigo-800">Full System Snapshot</p>
                  <p className="text-xs text-indigo-500">
                    Includes all 15 data tables — users, facilities, reports, outbreaks, and configuration
                  </p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              disabled={exporting}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/20 transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {exporting ? "Exporting..." : "Download Backup"}
            </motion.button>
          </div>

          <AnimatePresence>
            {exportSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="font-bold text-sm">{exportSuccess}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ SECTION 2: RESTORE FROM BACKUP ═══ */}
      <div className="bg-white rounded-3xl border-2 border-rose-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 bg-rose-50 border-b border-rose-100">
          <h3 className="text-xl font-bold text-rose-800 flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg">
              <HardDriveUpload className="w-5 h-5 text-rose-600" />
            </div>
            {t("adminPanel.backupRestore")}
          </h3>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 font-medium leading-relaxed">
              {t("adminPanel.backupRestoreDesc")}
            </p>
          </div>

          {/* File Upload Zone */}
          {!selectedFile && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                ${dragActive
                  ? "border-rose-400 bg-rose-50/50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              <div className="flex flex-col items-center gap-4">
                <div className={`p-4 rounded-2xl transition-colors ${dragActive ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"}`}>
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    Drop your backup file here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    or click to browse — JSON files only
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selected File Info */}
          {selectedFile && !preview && !previewLoading && !previewError && (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <FileJson className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm font-bold text-slate-700">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button onClick={clearFile} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}

          {/* Preview Loading */}
          <AnimatePresence>
            {previewLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-10"
              >
                <Loader2 className="w-10 h-10 text-rose-300 animate-spin" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                  Validating backup file...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview Error */}
          <AnimatePresence>
            {previewError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-rose-50 border border-rose-200 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <p className="text-sm font-bold text-rose-800">{previewError}</p>
                  </div>
                  <button onClick={clearFile} className="text-rose-400 hover:text-rose-600 text-sm font-bold">
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview: Backup Metadata & Comparison */}
          <AnimatePresence>
            {preview && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* File Info Card */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileJson className="w-5 h-5 text-indigo-500" />
                      <span className="text-sm font-bold text-slate-700">{selectedFile?.name}</span>
                    </div>
                    <button onClick={clearFile} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">
                        {new Date(preview.exportedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">
                        {preview.exportedBy?.name || preview.exportedBy?.email || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Hash className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">v{preview.version}</span>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <p className="text-3xl font-black text-slate-800">{totalCurrent.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Current Records
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                    <p className="text-3xl font-black text-indigo-700">{totalIncoming.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">
                      Incoming Records
                    </p>
                  </div>
                </div>

                {/* Comparison Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-bold text-slate-700">Data Comparison</h4>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white shadow-sm z-10">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-6 py-3 border-b">Table</th>
                          <th className="px-6 py-3 border-b text-right">Current</th>
                          <th className="px-6 py-3 border-b text-right">Incoming</th>
                          <th className="px-6 py-3 border-b text-right">Δ Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(preview.incomingCounts).map(([key, incoming]) => {
                          const current = preview.currentCounts[key] || 0;
                          const delta = incoming - current;
                          return (
                            <tr key={key} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-3">
                                <span className="text-sm font-bold text-slate-700">
                                  {MODEL_LABELS[key] || key}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <span className="text-sm font-semibold text-slate-500">
                                  {current.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <span className="text-sm font-semibold text-indigo-600">
                                  {incoming.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <span className={`text-sm font-black ${
                                  delta > 0 ? "text-emerald-600" :
                                  delta < 0 ? "text-rose-600" :
                                  "text-slate-400"
                                }`}>
                                  {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Multi-step Confirmation */}
                <div className="space-y-4">
                  {/* Step 1: Checkbox */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confirmChecked}
                        onChange={(e) => setConfirmChecked(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500/30 transition-all"
                      />
                      <span className="text-slate-700 font-bold text-sm">
                        {t("adminPanel.backupRestoreConfirm")}
                      </span>
                    </label>
                  </div>

                  {/* Step 2: Type confirmation phrase */}
                  <AnimatePresence>
                    {confirmChecked && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-3">
                          <p className="text-sm font-bold text-rose-800">
                            Type <code className="px-2 py-1 bg-rose-100 rounded-lg text-rose-700 font-mono text-xs">RESTORE BACKUP</code> to confirm
                          </p>
                          <input
                            type="text"
                            value={confirmPhrase}
                            onChange={(e) => setConfirmPhrase(e.target.value)}
                            placeholder="Type confirmation phrase..."
                            className="w-full bg-white border border-rose-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-mono text-sm text-slate-700 placeholder:text-slate-300"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Step 3: Restore Button */}
                  <AnimatePresence>
                    {confirmChecked && confirmPhrase === "RESTORE BACKUP" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleRestore}
                          disabled={restoring}
                          className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all disabled:opacity-50"
                        >
                          {restoring ? (
                            <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
                          ) : (
                            <HardDriveUpload className="w-6 h-6 text-rose-400" />
                          )}
                          {restoring ? "RESTORING DATABASE..." : "EXECUTE RESTORE"}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Restore Success */}
                <AnimatePresence>
                  {restoreSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-4 text-emerald-800"
                    >
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <div>
                        <p className="font-bold text-lg">{restoreSuccess}</p>
                        <p className="text-emerald-600 text-sm mt-1">
                          All data has been replaced with the backup snapshot. Please refresh the page to see updated data.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Restore Error */}
                <AnimatePresence>
                  {restoreError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800"
                    >
                      <AlertTriangle className="w-5 h-5 text-rose-500" />
                      <p className="font-bold text-sm">{restoreError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
