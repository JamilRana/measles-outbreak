"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  X,
  Loader2,
  Clock,
} from "lucide-react";
import { DIVISIONS, DISTRICTS } from "@/lib/constants";
import { getBdDateString, getBdTime } from "@/lib/timezone";

interface ExportDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  outbreakId?: string | null;
  defaultDivision?: string | null;
  defaultDistrict?: string | null;
}

type TimePreset = "today" | "yesterday" | "last7" | "last30" | "month" | "range" | "all";

export default function ExportDossierModal({
  isOpen,
  onClose,
  outbreakId = "measles-2026",
  defaultDivision = "",
  defaultDistrict = "",
}: ExportDossierModalProps) {
  const [mounted, setMounted] = useState(false);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [preset, setPreset] = useState<TimePreset>("last30");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-04");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [division, setDivision] = useState<string>(defaultDivision || "");
  const [district, setDistrict] = useState<string>(defaultDistrict || "");
  const [status, setStatus] = useState<"PUBLISHED" | "ALL">("PUBLISHED");
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleDownload = async () => {
    setDownloading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams();
      params.set("outbreakId", outbreakId || "measles-2026");
      params.set("format", format);
      params.set("status", status);
      params.set("preset", preset);

      if (preset === "month" && selectedMonth) {
        params.set("month", selectedMonth);
      } else if (preset === "range") {
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
      let filename = `dghs_measles_${format === "csv" ? "stata.csv" : "dossier.xlsx"}`;
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

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full my-auto overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider">
                Export Surveillance Data
              </h3>
              <p className="text-xs text-slate-400">
                Raw data ordered by date & facility (.xlsx / .csv)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-bold">
              {errorMessage}
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
              Select Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat("xlsx")}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  format === "xlsx"
                    ? "border-emerald-600 bg-emerald-50/60 text-emerald-950 font-bold shadow-sm"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <FileSpreadsheet className={`w-5 h-5 shrink-0 mt-0.5 ${format === "xlsx" ? "text-emerald-600" : "text-slate-400"}`} />
                <div className="text-left">
                  <div className="text-sm font-black">Excel Spreadsheet</div>
                  <div className="text-[10px] text-slate-500 font-medium">Raw Data Sheet (.xlsx)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  format === "csv"
                    ? "border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold shadow-sm"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <FileText className={`w-5 h-5 shrink-0 mt-0.5 ${format === "csv" ? "text-indigo-600" : "text-slate-400"}`} />
                <div className="text-left">
                  <div className="text-sm font-black">Raw CSV File</div>
                  <div className="text-[10px] text-slate-500 font-medium">Date & Facility (.csv)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Timeframe Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Timeframe Scope & Presets
              </label>
              <span className="text-[10px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                BST Timezone
              </span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-3">
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "yesterday", label: "Yesterday" },
                  { id: "last7", label: "Last 7 Days" },
                  { id: "last30", label: "Last 30 Days" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all text-center ${
                    preset === p.id
                      ? "bg-white text-indigo-700 shadow-sm font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 mb-3">
              {(
                [
                  { id: "month", label: "By Month" },
                  { id: "range", label: "Custom Range" },
                  { id: "all", label: "All Time" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all text-center ${
                    preset === p.id
                      ? "bg-white text-indigo-700 shadow-sm font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Month Picker */}
            {preset === "month" && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Target Month
                  </span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-xs font-bold text-slate-800 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Custom Range Pickers */}
            {preset === "range" && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Start Date
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    End Date
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Geographic Filter Scope */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Division
              </label>
              <select
                value={division}
                onChange={(e) => {
                  setDivision(e.target.value);
                  setDistrict("");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Divisions</option>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                District
              </label>
              <select
                value={district}
                disabled={!division}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
              >
                <option value="">All Districts</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Preparing Raw Export...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Raw {format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
