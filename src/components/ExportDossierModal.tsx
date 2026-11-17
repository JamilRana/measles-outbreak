"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText, Calendar, Filter, X, Loader2 } from "lucide-react";
import { DIVISIONS, DISTRICTS } from "@/lib/constants";

interface ExportDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  outbreakId?: string | null;
  defaultDivision?: string | null;
  defaultDistrict?: string | null;
}

export default function ExportDossierModal({
  isOpen,
  onClose,
  outbreakId = "measles-2026",
  defaultDivision = "",
  defaultDistrict = "",
}: ExportDossierModalProps) {
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [timeMode, setTimeMode] = useState<"all" | "month" | "range">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-05");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [division, setDivision] = useState<string>(defaultDivision || "");
  const [district, setDistrict] = useState<string>(defaultDistrict || "");
  const [status, setStatus] = useState<"PUBLISHED" | "ALL">("PUBLISHED");
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleDownload = async () => {
    setDownloading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams();
      params.set("outbreakId", outbreakId || "measles-2026");
      params.set("format", format);
      params.set("status", status);

      if (timeMode === "month" && selectedMonth) {
        params.set("month", selectedMonth);
      } else if (timeMode === "range") {
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
      }

      if (division) params.set("division", division);
      if (district) params.set("district", district);

      const url = `/api/reports/export?${params.toString()}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Download failed: HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = `measles_export_${format === "csv" ? "stata.csv" : "dossier.xlsx"}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      onClose();
    } catch (err: any) {
      console.error("Export error:", err);
      setErrorMessage(err.message || "Failed to download export file");
    } finally {
      setDownloading(false);
    }
  };

  const availableDistricts = division ? DISTRICTS[division] || [] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Export Surveillance Dossier</h3>
              <p className="text-xs text-slate-300">Detailed facility, temporal, and case statistics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              File Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat("xlsx")}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                  format === "xlsx"
                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <FileSpreadsheet className={`w-5 h-5 ${format === "xlsx" ? "text-emerald-600" : "text-slate-400"}`} />
                <div className="text-left">
                  <div className="text-sm">Excel Workbook</div>
                  <div className="text-[10px] text-slate-500">4-Sheet Dossier (.xlsx)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                  format === "csv"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <FileText className={`w-5 h-5 ${format === "csv" ? "text-indigo-600" : "text-slate-400"}`} />
                <div className="text-left">
                  <div className="text-sm">STATA / R CSV</div>
                  <div className="text-[10px] text-slate-500">Machine-Readable (.csv)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Timeframe Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Timeframe Filter
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1 mb-3">
              <button
                type="button"
                onClick={() => setTimeMode("month")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  timeMode === "month" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                By Month
              </button>
              <button
                type="button"
                onClick={() => setTimeMode("range")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  timeMode === "range" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Custom Range
              </button>
              <button
                type="button"
                onClick={() => setTimeMode("all")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  timeMode === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Time
              </button>
            </div>

            {timeMode === "month" && (
              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {timeMode === "range" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] text-slate-500 mb-1">From Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500 mb-1">To Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Geographic Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Geographic Scope
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <select
                  value={division}
                  onChange={(e) => {
                    setDivision(e.target.value);
                    setDistrict("");
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Divisions</option>
                  {DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={!division}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  <option value="">All Districts</option>
                  {availableDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Status Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Data Scope
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="radio"
                  name="exportStatus"
                  value="PUBLISHED"
                  checked={status === "PUBLISHED"}
                  onChange={() => setStatus("PUBLISHED")}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                Published Official Data
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="radio"
                  name="exportStatus"
                  value="ALL"
                  checked={status === "ALL"}
                  onChange={() => setStatus("ALL")}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                All Submissions (Internal Audit)
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-60"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Dossier...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download {format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
