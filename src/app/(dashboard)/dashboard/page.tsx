"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  Users,
  Hospital,
  Download,
  Filter,
  Calendar,
  ActivitySquare,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  Table as TableIcon,
  Search,
  PlusSquare,
  Edit,
  CloudOff,
  Skull,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Shield,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  Circle,
  ShieldCheck,
} from "lucide-react";
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
  Area,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { DIVISIONS, DISTRICTS } from "@/lib/constants";
import OutbreakMap from "@/components/OutbreakMap";
import EpiInsights from "@/components/EpiInsights";
import { generateGovtPDF } from "@/lib/pdf-report-generator";
import OutbreakSelector from "@/components/OutbreakSelector";
import { getBdDateString, getBdTime } from "@/lib/timezone";
import Image from "next/image";

// Safe number conversion function
const toBnNumSafe = (n: number | string | null | undefined, i18n: any) => {
  if (n == null || n === "" || (typeof n === "number" && isNaN(n))) return "-";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "-";

  if (i18n.language === "bn") {
    const bnNums = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return num
      .toLocaleString("en-US")
      .toString()
      .split("")
      .map((d) => (isNaN(parseInt(d)) ? d : bnNums[parseInt(d)]))
      .join("");
  }
  return num.toLocaleString("en-US");
};

// Sparkline Component
const Sparkline = ({
  data,
  color = "#6366f1",
}: {
  data: number[];
  color?: string;
}) => {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-0.5 h-8 mt-2">
      {data.map((val, i) => {
        const height = ((val - min) / range) * 100;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all"
            style={{
              height: `${Math.max(height, 10)}%`,
              backgroundColor: color,
              opacity: 0.3 + (i / data.length) * 0.7,
            }}
          />
        );
      })}
    </div>
  );
};

function KPICard({ title, value, subValue, icon, color }: any) {
  return (
    <motion.div
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-500">
        {React.cloneElement(icon, { className: "w-24 h-24" })}
      </div>
      <div className="flex items-start justify-between mb-8 relative z-10">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border transition-all"
          style={{
            backgroundColor: `${color}10`,
            borderColor: `${color}20`,
            color: color,
          }}
        >
          {React.cloneElement(icon, { className: "w-7 h-7" })}
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
          {title}
        </p>
        <h4 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2">
          {value}
        </h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
          {subValue || "National Aggregate"}
        </p>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { t, i18n } = useTranslation();
  const [allReports, setAllReports] = useState<any[]>([]);
  const [coreFields, setCoreFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"all" | "today">("today");
  const [filterDate, setFilterDate] = useState(getBdDateString());
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOutbreakId, setSelectedOutbreakId] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [publicationStatus, setPublicationStatus] = useState<"VERIFIED" | "PENDING">("PENDING");
  const [countdown, setCountdown] = useState("02:45:00");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [indicators, setIndicators] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [summaryTotals, setSummaryTotals] = useState<Record<string, number>>({});

  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    submissionRate: 0,
  });
  const [cumulativeTotals, setCumulativeTotals] = useState<Record<string, number>>({});
  const [summaryBreakdown, setSummaryBreakdown] = useState<Record<string, Record<string, number>>>({});
  const [cumSummaryBreakdown, setCumSummaryBreakdown] = useState<Record<string, Record<string, number>>>({});

  // Countdown timer effect
  useEffect(() => {
    let deadline = "23:59:59";
    if (settings?.reportingDeadline) deadline = settings.reportingDeadline;

    const timer = setInterval(() => {
      const now = getBdTime();
      const [h, m, s] = deadline.split(":").map(Number);
      const target = new Date(now);
      target.setHours(h || 23, m || 59, s || 59, 0);

      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
         setCountdown("WINDOW CLOSED");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [settings]);

  useEffect(() => {
    fetchReports();
    fetchSettings();
  }, [viewMode, filterDate, dateRange, selectedDivision, selectedDistrict, selectedOutbreakId]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) setSettings(await res.json());
    } catch (e) {
      console.error("Failed to fetch settings");
    }
  };

  useEffect(() => {
    if (selectedOutbreakId) {
      fetchCoreFields();
      fetchIndicators();
    }
  }, [selectedOutbreakId]);

  const fetchIndicators = async () => {
    try {
      const res = await fetch("/api/admin/indicators");
      if (res.ok) setIndicators(await res.json());
    } catch (e) {
      console.error("Failed to fetch indicators");
    }
  };

  const kpiData = useMemo(() => {
    const totals: Record<string, number> = { ...summaryTotals };
    if (Object.keys(totals).length === 0 && allReports.length > 0) {
      if (coreFields.length > 0) {
        coreFields.forEach((field) => {
          totals[field.fieldKey] = allReports.reduce((acc, r) => acc + (Number(r[field.fieldKey]) || 0), 0);
        });
      } else {
        totals["suspected24h"] = allReports.reduce((acc, r) => acc + (r.suspected24h || 0), 0);
        totals["confirmed24h"] = allReports.reduce((acc, r) => acc + (r.confirmed24h || 0), 0);
        totals["suspectedDeath24h"] = allReports.reduce((acc, r) => acc + (r.suspectedDeath24h || 0), 0);
        totals["confirmedDeath24h"] = allReports.reduce((acc, r) => acc + (r.confirmedDeath24h || 0), 0);
        totals["admitted24h"] = allReports.reduce((acc, r) => acc + (r.admitted24h || 0), 0);
      }
    }
    return totals;
  }, [allReports, coreFields, summaryTotals]);

  const stats = useMemo(() => {
    return {
      today: {
        suspected: summaryTotals?.suspected24h || 0,
        confirmed: summaryTotals?.confirmed24h || 0,
        admitted: summaryTotals?.admitted24h || 0,
        recovered: summaryTotals?.discharged24h || 0,
        confirmedDeath: summaryTotals?.confirmedDeath24h || 0,
        suspectedDeath: summaryTotals?.suspectedDeath24h || 0,
        referral: summaryTotals?.referral24h || 0,
        serumSent: summaryTotals?.serumSent24h || 0,
      },
      cumulative: {
        suspected: cumulativeTotals?.suspected24h || 0,
        confirmed: cumulativeTotals?.confirmed24h || 0,
        admitted: cumulativeTotals?.admitted24h || 0,
        recovered: cumulativeTotals?.discharged24h || 0,
        confirmedDeath: cumulativeTotals?.confirmedDeath24h || 0,
        suspectedDeath: cumulativeTotals?.suspectedDeath24h || 0,
        referral: cumulativeTotals?.referral24h || 0,
        serumSent: cumulativeTotals?.serumSent24h || 0,
      }
    };
  }, [summaryTotals, cumulativeTotals]);

  const fetchCoreFields = async () => {
    try {
      const res = await fetch(`/api/public/fields?outbreakId=${selectedOutbreakId}&coreOnly=true`);
      if (res.ok) setCoreFields(await res.json());
    } catch (e) {
      console.error("Core fields fetch error:", e);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const baseParams = new URLSearchParams();
      if (selectedDivision) baseParams.set("divisions", selectedDivision);
      if (selectedDistrict) baseParams.set("districts", selectedDistrict);
      if (selectedOutbreakId) baseParams.set("outbreakId", selectedOutbreakId);

      const listParams = new URLSearchParams(baseParams);
      if (viewMode === "today") {
        listParams.set("date", filterDate);
      } else if (dateRange.from && dateRange.to) {
        listParams.set("from", dateRange.from);
        listParams.set("to", dateRange.to);
      }

      // 1. Fetch Today/Filtered List and Summary
      const [listRes, summaryRes] = await Promise.all([
        fetch(`/api/reports?${listParams.toString()}&limit=100`),
        fetch(`/api/reports/summary?${listParams.toString()}`)
      ]);

      // 2. Fetch True Cumulative (Outbreak-wide, no date filter)
      const cumParams = new URLSearchParams();
      if (selectedOutbreakId) cumParams.set("outbreakId", selectedOutbreakId);
      // If a division/district is selected, we want the cumulative breakdown for THAT selection
      if (selectedDivision) cumParams.set("division", selectedDivision);
      if (selectedDistrict) cumParams.set("district", selectedDistrict);
      
      const cumulativeRes = await fetch(`/api/reports/summary?${cumParams.toString()}`);

      const listData = await listRes.json();
      const summaryData = await summaryRes.json();
      const cumData = await cumulativeRes.json();

      setAllReports(listData.reports || []);
      if (summaryData.totals) setSummaryTotals(summaryData.totals);
      if (summaryData.breakdown) setSummaryBreakdown(summaryData.breakdown);
      if (cumData.totals) setCumulativeTotals(cumData.totals);
      if (cumData.breakdown) setCumSummaryBreakdown(cumData.breakdown);
      
      setPublicationStatus(listData.temporal?.isHistorical ? "PENDING" : "VERIFIED");
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const tableData = useMemo(() => {
    const data: Record<string, any> = {};
    const level = selectedDivision ? "DISTRICT" : "DIVISION";
    const items = selectedDivision ? (DISTRICTS[selectedDivision] || []) : DIVISIONS;

    items.forEach((item) => {
      // Initialize with data from API breakdown if National View
      const apiData = level === "DIVISION" ? (summaryBreakdown[item] || {}) : {};
      const apiCumData = level === "DIVISION" ? (cumSummaryBreakdown[item] || {}) : {};
      
      data[item] = {
        name: item,
        today: { 
           suspected: apiData.suspected24h || 0, 
           suspectedDeath: apiData.suspectedDeath24h || 0, 
           confirmed: apiData.confirmed24h || 0, 
           confirmedDeath: apiData.confirmedDeath24h || 0, 
           admitted: apiData.admitted24h || 0, 
           recovered: apiData.discharged24h || 0 
        },
        cumulative: { 
           suspected: apiCumData.suspected24h || 0, 
           suspectedDeath: apiCumData.suspectedDeath24h || 0, 
           confirmed: apiCumData.confirmed24h || 0, 
           confirmedDeath: apiCumData.confirmedDeath24h || 0, 
           admitted: apiCumData.admitted24h || 0, 
           recovered: apiCumData.discharged24h || 0 
        },
      };
    });

    // If we are looking at districts, we still need to sum from paginated reports (or improve API further)
    if (level === "DISTRICT") {
       allReports.forEach((r) => {
          const dist = r.facility?.district;
          if (dist && data[dist]) {
             const keys = ["suspected24h", "admitted24h", "discharged24h", "suspectedDeath24h", "confirmed24h", "confirmedDeath24h"];
             const statKeys = ["suspected", "admitted", "recovered", "suspectedDeath", "confirmed", "confirmedDeath"];
             keys.forEach((k, idx) => {
               const val = Number(r[k]) || 0;
               data[dist].cumulative[statKeys[idx]] += val;
               data[dist].today[statKeys[idx]] += val;
             });
          }
       });
    }

    return Object.values(data);
  }, [allReports, summaryBreakdown, selectedDivision, selectedDistrict]);

  const sevenDayTrend = useMemo(() => {
    const days: Record<string, number> = {};
    const today = new Date(filterDate);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days[dateStr] = 0;
    }
    allReports.forEach((r) => {
      const rDate = r.reportingDate?.split("T")[0];
      if (days[rDate] !== undefined) days[rDate] += (r.suspected24h || 0) + (r.confirmed24h || 0);
    });
    return Object.values(days);
  }, [allReports, filterDate]);

  const trendData = useMemo(() => {
    const data: Record<string, any> = {};
    allReports.forEach((report) => {
      const date = new Date(report.reportingDate).toLocaleDateString(i18n.language === "bn" ? "bn-BD" : "en-GB", { day: "2-digit", month: "short" });
      if (!data[date]) data[date] = { name: date, suspected: 0, confirmed: 0, sortKey: new Date(report.reportingDate).getTime() };
      data[date].suspected += report.suspected24h || 0;
      data[date].confirmed += report.confirmed24h || 0;
    });
    return Object.values(data).sort((a: any, b: any) => a.sortKey - b.sortKey);
  }, [allReports]);

  const calculatedIndicators = useMemo(() => {
    const kpi: any = stats.today;
    const values: Record<string, number> = {};
    indicators.forEach((ind) => {
      const num = kpi[ind.numeratorKey] || 0;
      const den = ind.denominatorKey ? kpi[ind.denominatorKey] || 0 : 1;
      values[ind.id] = den === 0 ? 0 : (num / den) * (ind.multiplier || 1);
    });
    return values;
  }, [indicators, stats]);

  const handleExportPDF = async () => {
     generateGovtPDF(allReports, filterDate);
  };

  const handleExportExcel = () => {
    const data = tableData.map((d: any) => ({
      [selectedDivision ? 'District' : 'Division']: d.name,
      'Last 24h Suspected Cases': d.today.suspected,
      'Last 24h Suspected Deaths': d.today.suspectedDeath,
      'Last 24h Confirmed Cases': d.today.confirmed,
      'Last 24h Confirmed Deaths': d.today.confirmedDeath,
      'Last 24h Admitted': d.today.admitted,
      'Last 24h Recovered': d.today.recovered,
      'Cumulative Suspected Cases': d.cumulative.suspected,
      'Cumulative Suspected Deaths': d.cumulative.suspectedDeath,
      'Cumulative Confirmed Cases': d.cumulative.confirmed,
      'Cumulative Confirmed Deaths': d.cumulative.confirmedDeath,
      'Cumulative Admitted': d.cumulative.admitted,
      'Cumulative Recovered': d.cumulative.recovered,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Surveillance");
    XLSX.writeFile(wb, `MEASLES_SITREP_${getBdDateString()}.xlsx`);
  };

  const dynamicFilterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedOutbreakId) p.set("outbreakId", selectedOutbreakId);
    if (selectedDivision) p.set("divisions", selectedDivision);
    if (selectedDistrict) p.set("districts", selectedDistrict);
    return p.toString();
  }, [selectedOutbreakId, selectedDivision, selectedDistrict]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-32 print:p-0 relative">
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-sm flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.3em] animate-pulse">Syncing Surveillance Data...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-700 shadow-2xl relative overflow-hidden ${
          publicationStatus === "PENDING"
            ? "bg-gradient-to-br from-amber-600 to-amber-900 border-amber-500/50"
            : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-indigo-500/10"
        }`}
      >
        <div className="absolute inset-0 bg-grid-white/[0.05] pointer-events-none" />

        <div className="flex items-center gap-6 relative z-10">
          <div
            className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-xl border ${
              publicationStatus === "PENDING"
                ? "bg-white/10 border-white/20"
                : "bg-slate-800/50 border-slate-700"
            }`}
          >
            <Image
              src="/logo_mohfw.png"
              alt="MOHFW"
              width={48}
              height={48}
              className="object-contain brightness-110 drop-shadow-md"
            />
          </div>
          <div>
            <p
              className={`text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mb-1 ${
                publicationStatus === "PENDING"
                  ? "text-amber-200/60"
                  : "text-indigo-400"
              }`}
            >
              DGHS National Surveillance Hub
            </p>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
              {allReports[0]?.outbreak?.name || "Measles Outbreak"}
            </h1>
          </div>
        </div>

        <div className="relative z-10 hidden lg:block">
          <div
            className={`flex items-center gap-4 px-8 py-4 rounded-3xl border-2 backdrop-blur-xl transition-all duration-500 ${
              publicationStatus === "VERIFIED"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
            }`}
          >
            <div className="relative">
              {publicationStatus === "VERIFIED" ? (
                <ShieldCheck className="w-8 h-8" />
              ) : (
                <div className="relative">
                  <Clock className="w-8 h-8 animate-pulse" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black uppercase tracking-widest leading-none">
                {publicationStatus === "VERIFIED" ? "Verified" : "Pending"}
              </span>
              <span className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-wider">
                Data Acquisition Status
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6 relative z-10">
          <div
            className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all ${
              publicationStatus === "PENDING"
                ? "bg-amber-950/40 border-amber-500/30"
                : "bg-slate-950/40 border-slate-700"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-rose-400 animate-spin-slow" />
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400">
                Reporting Window
              </p>
              <p className="text-lg font-black font-mono text-white tracking-widest uppercase">
                {countdown}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {publicationStatus === "PENDING" && filterDate === getBdDateString() && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-600/10 border border-amber-600/20 p-4 rounded-2xl flex items-center justify-center gap-3 no-print"
        >
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">
             Today's report is pending publication. Showing last verified data: <span className="underline ml-1 font-black">{allReports[0]?.reportingDate?.split('T')[0] || 'N/A'}</span>
          </p>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 p-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {(["today", "all"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode ? "bg-white text-indigo-600 shadow-lg" : "text-slate-500 hover:text-slate-700"}`}
            >
              {mode === "today" ? "Live Today" : "Cumulative"}
            </button>
          ))}
        </div>

        {viewMode === "today" && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              max={getBdDateString()}
              className="bg-transparent border-none focus:ring-0 text-slate-700 text-xs font-bold cursor-pointer"
            />
          </div>
        )}

        {viewMode === "all" && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.from || ""}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="bg-transparent border-none focus:ring-0 text-slate-700 text-xs font-bold cursor-pointer"
              />
              <span className="text-slate-400 text-[10px] font-bold uppercase">to</span>
              <input
                type="date"
                value={dateRange.to || ""}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="bg-transparent border-none focus:ring-0 text-slate-700 text-xs font-bold cursor-pointer"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
          <Filter className="w-4 h-4 text-indigo-500" />
          <select
            value={selectedDivision || ""}
            onChange={(e) => {
              setSelectedDivision(e.target.value || null);
              setSelectedDistrict(null);
            }}
            className="bg-transparent border-none focus:ring-0 text-slate-700 text-xs font-bold cursor-pointer"
          >
            <option value="">All Divisions</option>
            {DIVISIONS.map((div) => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>

        {selectedDivision && DISTRICTS[selectedDivision] && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <select
              value={selectedDistrict || ""}
              onChange={(e) => setSelectedDistrict(e.target.value || null)}
              className="bg-transparent border-none focus:ring-0 text-slate-700 text-xs font-bold cursor-pointer"
            >
              <option value="">All Districts</option>
              {DISTRICTS[selectedDivision]?.map((dist) => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 min-w-[200px]">
          <Activity className="w-4 h-4 text-indigo-500" />
          <div className="flex-1">
            <OutbreakSelector
              onSelect={(id) => setSelectedOutbreakId(id)}
              defaultValue={selectedOutbreakId || undefined}
            />
          </div>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          className="ml-auto bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {loading ? "Syncing..." : "Sync Insights"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {coreFields.length > 0 ? (
          coreFields.map((field) => {
            const iconMap: any = {
              cases: <Users />,
              mortality: <Skull />,
              hospitalization: <PlusSquare />,
              lab: <ActivitySquare />,
            };
            const colorMap: any = {
              cases: "#F59E0B",
              mortality: "#0F172A",
              hospitalization: "#3B82F6",
              lab: "#8B5CF6",
            };
            const label = i18n.language === "bn" ? field.labelBn || field.label : field.label;
            return (
              <KPICard
                key={field.id}
                title={label}
                value={toBnNumSafe(kpiData[field.fieldKey], i18n)}
                subValue={viewMode === "all" ? "Cumulative Volume" : "Last 24 Hours"}
                icon={iconMap[field.section] || <Activity />}
                color={colorMap[field.section] || "#6366f1"}
              />
            );
          })
        ) : (
          <>
            <KPICard title="Suspected" value={toBnNumSafe(kpiData["suspected24h"], i18n)} subValue={viewMode === "all" ? "Cumulative Volume" : "Last 24 Hours"} icon={<Users />} color="#F59E0B" />
            <KPICard title="Confirmed" value={toBnNumSafe(kpiData["confirmed24h"], i18n)} subValue={viewMode === "all" ? "Cumulative Volume" : "Last 24 Hours"} icon={<Edit />} color="#EF4444" />
            <KPICard title="Admitted" value={toBnNumSafe(kpiData["admitted24h"], i18n)} subValue={viewMode === "all" ? "Cumulative Volume" : "Last 24 Hours"} icon={<PlusSquare />} color="#3B82F6" />
            <KPICard title="Mortality" value={toBnNumSafe((kpiData["suspectedDeath24h"] || 0) + (kpiData["confirmedDeath24h"] || 0), i18n)} subValue={viewMode === "all" ? "Total Volume" : "Last 24 Hours"} icon={<Skull />} color="#0F172A" />
            <KPICard title="Reporting Rate" value={`${userStats.submissionRate}%`} icon={<TrendingUp />} color="#8B5CF6" subValue={`${userStats.activeToday} facility reports`} />
          </>
        )}
      </div>

      <OutbreakMap apiEndpoint={`/api/reports/geo?${dynamicFilterParams}`} />
      <EpiInsights apiEndpoint={`/api/reports/timeseries?${dynamicFilterParams}`} />

      <section className="space-y-6">
         <div className="flex flex-col sm:flex-row items-center justify-between gap-6 no-print px-4">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedDivision ? `${selectedDivision}-WISE` : 'DIVISION-WISE'} DETAILED ANALYSIS</h2>
            <div className="flex gap-4">
               <button onClick={handleExportPDF} className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase shadow-2xl"><FileText className="w-5 h-5" /> PDF</button>
               <button onClick={handleExportExcel} className="flex items-center gap-3 px-8 py-4 bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase shadow-2xl"><Download className="w-5 h-5" /> EXCEL</button>
            </div>
         </div>

         <div className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
               <table className="w-full border-collapse hidden xl:table">
                  <thead className="bg-[#1e293b] text-white text-[9px] font-black uppercase tracking-[0.15em] text-center">
                     <tr>
                        <th rowSpan={2} className="px-8 py-8 text-left border-r border-slate-700 bg-[#0f172a] sticky left-0 z-20">{selectedDivision ? 'DISTRICT' : 'DIVISION'}</th>
                        <th colSpan={6} className="px-6 py-4 bg-[#1e293b] border-b border-white/5 tracking-widest text-[#94a3b8]">Last 24 Hour Surveillance</th>
                        <th colSpan={6} className="px-6 py-4 bg-[#0f172a] border-b border-white/5 tracking-widest text-[#6366f1]">Total Outbreak Volume (Cumulative)</th>
                     </tr>
                     <tr className="bg-[#1e293b] border-t border-white/5 text-[8px]">
                        <th colSpan={2} className="px-4 py-3 border-r border-white/5 bg-slate-800/50">Suspected</th>
                        <th colSpan={2} className="px-4 py-3 border-r border-white/5 bg-slate-800/50">Confirmed</th>
                        <th className="px-4 py-3 border-r border-white/5 bg-slate-800/50">ADM.</th>
                        <th className="px-4 py-3 border-r border-white/5 bg-slate-800/50">DIS.</th>
                        <th colSpan={2} className="px-4 py-3 border-r border-white/5 bg-[#0f172a]/50">Suspected</th>
                        <th colSpan={2} className="px-4 py-3 border-r border-white/5 bg-[#0f172a]/50">Confirmed</th>
                        <th className="px-4 py-3 border-r border-white/5 bg-[#0f172a]/50">ADM.</th>
                        <th className="px-4 py-3 bg-[#0f172a]/50">DIS.</th>
                     </tr>
                     <tr className="bg-[#0f172a] text-[#64748b] border-t border-slate-700 text-[8px]">
                        <th className="sticky left-0 bg-[#0f172a] border-r border-slate-700"></th>
                        <th className="px-3 py-3 border-r border-slate-700">Cases</th><th className="px-3 py-3 border-r border-slate-700">Deaths</th>
                        <th className="px-3 py-3 border-r border-slate-700">Cases</th><th className="px-3 py-3 border-r border-slate-700">Deaths</th>
                        <th className="px-3 py-3 border-r border-slate-700 uppercase">Vol.</th><th className="px-3 py-3 border-r border-slate-700 uppercase">Vol.</th>
                        <th className="px-3 py-3 border-r border-slate-700 uppercase text-white">Total</th><th className="px-3 py-3 border-r border-slate-700 uppercase text-rose-400">Total</th>
                        <th className="px-3 py-3 border-r border-slate-700 uppercase text-white">Total</th><th className="px-3 py-3 border-r border-slate-700 uppercase text-rose-400">Total</th>
                        <th className="px-3 py-3 border-r border-slate-700 uppercase text-white">Total</th><th className="px-3 py-3 uppercase text-white">Total</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {tableData.map((d: any) => (
                        <tr key={d.name} className="group hover:bg-slate-50 transition-all duration-200">
                           <td className="px-8 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-50 font-black text-slate-800 text-sm uppercase tracking-tighter">{d.name}</td>
                           <td className="px-4 py-4 text-center text-slate-400 font-bold text-sm bg-slate-50/30">{toBnNumSafe(d.today.suspected, i18n)}</td>
                           <td className="px-4 py-4 text-center text-slate-300 font-bold text-sm bg-slate-50/30">{toBnNumSafe(d.today.suspectedDeath, i18n)}</td>
                           <td className="px-4 py-4 text-center text-slate-400 font-bold text-sm bg-slate-50/30">{toBnNumSafe(d.today.confirmed, i18n)}</td>
                           <td className="px-4 py-4 text-center text-rose-400 font-bold text-sm bg-slate-50/30">{toBnNumSafe(d.today.confirmedDeath, i18n)}</td>
                           <td className="px-4 py-4 text-center text-slate-400 font-bold text-sm bg-slate-50/30">{toBnNumSafe(d.today.admitted, i18n)}</td>
                           <td className="px-4 py-4 text-center text-slate-400 font-bold text-sm bg-slate-50/30">{toBnNumSafe(d.today.recovered, i18n)}</td>
                           <td className="px-4 py-4 text-center text-slate-900 font-black text-sm">{toBnNumSafe(d.cumulative.suspected, i18n)}</td>
                           <td className="px-4 py-4 text-center text-slate-400 font-bold text-sm">{toBnNumSafe(d.cumulative.suspectedDeath, i18n)}</td>
                           <td className="px-4 py-4 text-center text-slate-900 font-black text-sm">{toBnNumSafe(d.cumulative.confirmed, i18n)}</td>
                           <td className="px-4 py-4 text-center text-rose-600 font-black text-sm">{toBnNumSafe(d.cumulative.confirmedDeath, i18n)}</td>
                           <td className="px-4 py-4 text-center text-slate-500 font-bold text-sm">{toBnNumSafe(d.cumulative.admitted, i18n)}</td>
                           <td className="px-4 py-4 text-center text-slate-500 font-bold text-sm">{toBnNumSafe(d.cumulative.recovered, i18n)}</td>
                        </tr>
                     ))}
                     <tr className="bg-slate-900 text-white font-black text-sm text-center">
                        <td className="py-8 px-8 text-left sticky left-0 bg-slate-900 z-10 uppercase tracking-widest">National Aggregate</td>
                        <td className="py-8 bg-slate-800/40">{toBnNumSafe(stats.today.suspected, i18n)}</td>
                        <td className="py-8 bg-slate-800/40">{toBnNumSafe(stats.today.suspectedDeath, i18n)}</td>
                        <td className="py-8 bg-slate-800/40">{toBnNumSafe(stats.today.confirmed, i18n)}</td>
                        <td className="py-8 bg-slate-800/40 text-rose-400">{toBnNumSafe(stats.today.confirmedDeath, i18n)}</td>
                        <td className="py-8 bg-slate-800/40">{toBnNumSafe(stats.today.admitted, i18n)}</td>
                        <td className="py-8 bg-slate-800/40">{toBnNumSafe(stats.today.recovered, i18n)}</td>
                        <td className="py-8 bg-indigo-900/40">{toBnNumSafe(stats.cumulative.suspected, i18n)}</td>
                        <td className="py-8 bg-indigo-900/40">{toBnNumSafe(stats.cumulative.suspectedDeath, i18n)}</td>
                        <td className="py-8 bg-indigo-900/40 text-emerald-400">{toBnNumSafe(stats.cumulative.confirmed, i18n)}</td>
                        <td className="py-8 bg-indigo-900/40 text-rose-400">{toBnNumSafe(stats.cumulative.confirmedDeath, i18n)}</td>
                        <td className="py-8 bg-indigo-900/40">{toBnNumSafe(stats.cumulative.admitted, i18n)}</td>
                        <td className="py-8 bg-indigo-900/40">{toBnNumSafe(stats.cumulative.recovered, i18n)}</td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 no-print px-4">
         <div className="lg:col-span-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 p-10 relative overflow-hidden">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3"><Skull className="w-5 h-5 text-rose-500 animate-pulse" /> High Mortality Zones</h3>
            <div className="space-y-6">
               {tableData.sort((a,b) => (b.cumulative.confirmedDeath + b.cumulative.suspectedDeath) - (a.cumulative.confirmedDeath + a.cumulative.suspectedDeath)).slice(0, 5).map((d: any) => (
                  <div key={d.name} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl hover:bg-rose-50 transition-colors cursor-default group">
                     <span className="text-xs font-black text-slate-700 uppercase tracking-tight group-hover:text-rose-600 transition-colors">{d.name}</span>
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 group-hover:text-rose-700 transition-colors font-mono">{toBnNumSafe(d.cumulative.confirmedDeath + d.cumulative.suspectedDeath, i18n)}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}