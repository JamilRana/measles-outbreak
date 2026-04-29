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
import { SearchableSelect } from "@/components/SearchableSelect";
import dynamic from "next/dynamic";
import { 
  useDashboardSummary, 
  useCumulativeSummary, 
  useDashboardConfig, 
  useDashboardSettings, 
  useDashboardIndicators 
} from "@/hooks/useDashboard";
import { 
  KPICardSkeleton, 
  TableSkeleton, 
  MapSkeleton, 
  ChartSkeleton 
} from "@/components/skeletons";
import { getBdDateString, getBdTime, getLatestReportDate } from "@/lib/timezone";
import Image from "next/image";

// Dynamic imports with ssr: false for components that use browser APIs
const OutbreakMap = dynamic(() => import("@/components/OutbreakMap"), { 
  ssr: false,
  loading: () => <MapSkeleton />
});

const EpiInsights = dynamic(() => import("@/components/EpiInsights"), { 
  ssr: false, 
  loading: () => <ChartSkeleton />
});

const OutbreakSelector = dynamic(() => import("@/components/OutbreakSelector"), { ssr: false });

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
  
  // -- Filter State --
  const [viewMode, setViewMode] = useState<"all" | "today">("today");
  const [filterDate, setFilterDate] = useState(getLatestReportDate());
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedOutbreakId, setSelectedOutbreakId] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // -- SWR Hooks (Parallel Data Fetching) --
  const { data: settings } = useDashboardSettings();
  const { data: indicators } = useDashboardIndicators();
  const { data: config, isLoading: configLoading } = useDashboardConfig(selectedOutbreakId);

  // Memoize params for summary
  const summaryParams = useMemo(() => {
    if (!selectedOutbreakId) return null;
    const p = new URLSearchParams();
    p.set("outbreakId", selectedOutbreakId);
    if (viewMode === "today") {
      p.set("date", filterDate);
    } else if (dateRange.from && dateRange.to) {
      p.set("from", dateRange.from);
      p.set("to", dateRange.to);
    }
    if (selectedDivision) p.set("division", selectedDivision);
    if (selectedDistrict) p.set("district", selectedDistrict);
    return p;
  }, [selectedOutbreakId, viewMode, filterDate, dateRange, selectedDivision, selectedDistrict]);

  const { data: summary, isLoading: summaryLoading, mutate: mutateSummary } = useDashboardSummary(summaryParams);

  // Memoize params for cumulative outbreak summary
  const cumulativeParams = useMemo(() => {
    if (!selectedOutbreakId) return null;
    const p = new URLSearchParams();
    p.set("outbreakId", selectedOutbreakId);
    if (selectedDivision) p.set("division", selectedDivision);
    if (selectedDistrict) p.set("district", selectedDistrict);
    return p;
  }, [selectedOutbreakId, selectedDivision, selectedDistrict]);

  const { data: cumulative, isLoading: cumulativeLoading } = useCumulativeSummary(cumulativeParams);
  // -- Countdown Timer --
  const [countdown, setCountdown] = useState("00:00:00");
  useEffect(() => {
    if (!settings?.reportingDeadline) return;
    const timer = setInterval(() => {
      const now = getBdTime();
      const [h, m, s] = settings.reportingDeadline.split(":").map(Number);
      const target = new Date(now);
      target.setHours(h || 23, m || 59, s || 59, 0);

      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
         setCountdown("WINDOW CLOSED");
         clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [settings]);

  // Derived Values
  const stats = useMemo(() => {
    const todayRaw = summary?.totals || {};
    const cumulativeRaw = cumulative?.totals || {};
    
    const mapKeys = (d: any) => ({
      ...d,
      suspected: d.suspected24h || 0,
      suspectedDeath: d.suspectedDeath24h || 0,
      confirmed: d.confirmed24h || 0,
      confirmedDeath: d.confirmedDeath24h || 0,
      admitted: d.admitted24h || 0,
      recovered: d.discharged24h || 0,
    });

    return {
      today: mapKeys(todayRaw),
      cumulative: mapKeys(cumulativeRaw)
    };
  }, [summary, cumulative]);

  const tableData = useMemo(() => {
    const breakdown = summary?.breakdown || {};
    const cumBreakdown = cumulative?.breakdown || {};
    const items = selectedDivision ? (DISTRICTS[selectedDivision] || []) : DIVISIONS;

    return items.map((item) => {
      const d = breakdown[item] || {};
      const c = cumBreakdown[item] || {};
      return {
        name: item,
        today: {
          suspected: d.suspected24h || 0,
          suspectedDeath: d.suspectedDeath24h || 0,
          confirmed: d.confirmed24h || 0,
          confirmedDeath: d.confirmedDeath24h || 0,
          admitted: d.admitted24h || 0,
          recovered: d.discharged24h || 0
        },
        cumulative: {
          suspected: c.suspected24h || 0,
          suspectedDeath: c.suspectedDeath24h || 0,
          confirmed: c.confirmed24h || 0,
          confirmedDeath: c.confirmedDeath24h || 0,
          admitted: c.admitted24h || 0,
          recovered: c.discharged24h || 0
        },
      };
    });
  }, [summary, cumulative, selectedDivision]);

  // Derived Indicators from SWR data
  const calculatedIndicators = useMemo(() => {
    const kpi: any = stats.today;
    const values: Record<string, number> = {};
    (indicators || []).forEach((ind: any) => {
      const num = kpi[ind.numeratorKey] || 0;
      const den = ind.denominatorKey ? kpi[ind.denominatorKey] || 0 : 1;
      values[ind.id] = den === 0 ? 0 : (num / den) * (ind.multiplier || 1);
    });
    return values;
  }, [indicators, stats]);

  const publicationStatus: string = summary?.debug?.reportCount === 0 ? "PENDING" : "VERIFIED";
  const allReports = summary?.reports || []; // For title fallback
  const sevenDayTrend = [0, 0, 0, 0, 0, 0, 0]; // Placeholder for trend

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          outbreakId: selectedOutbreakId, 
          date: filterDate,
          from: dateRange.from,
          to: dateRange.to,
          division: selectedDivision,
          district: selectedDistrict
        }),
      });
      if (!res.ok) throw new Error("PDF export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SITREP_${filterDate || "CUMULATIVE"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    const data = tableData.map((d: any) => ({
      [selectedDivision ? 'District' : 'Division']: d.name,
      'Last 24h Suspected Cases': d.today.suspected,
      'Last 24h Suspected Death': d.today.suspectedDeath,
      'Last 24h Confirmed Cases': d.today.confirmed,
      'Last 24h Confirmed Death': d.today.confirmedDeath,
      'Last 24h Admitted': d.today.admitted,
      'Last 24h Recovered': d.today.recovered,
      'Cumulative Suspected Cases': d.cumulative.suspected,
      'Cumulative Suspected Death': d.cumulative.suspectedDeath,
      'Cumulative Confirmed Cases': d.cumulative.confirmed,
      'Cumulative Confirmed Death': d.cumulative.confirmedDeath,
      'Cumulative Admitted': d.cumulative.admitted,
      'Cumulative Recovered': d.cumulative.recovered,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Surveillance");
    XLSX.writeFile(wb, `MEASLES_SITREP_${getBdDateString()}.xlsx`);
  };

  const dynamicFilterParams = useMemo(() => {
    if (!selectedOutbreakId) return "";
    const p = new URLSearchParams();
    p.set("outbreakId", selectedOutbreakId);
    if (selectedDivision) p.set("division", selectedDivision);
    if (selectedDistrict) p.set("district", selectedDistrict);
    if (viewMode === "today") p.set("date", filterDate);
    else {
      if (dateRange.from) p.set("from", dateRange.from);
      if (dateRange.to) p.set("to", dateRange.to);
    }
    return p.toString();
  }, [selectedOutbreakId, selectedDivision, selectedDistrict, viewMode, filterDate, dateRange]);

  const loading = summaryLoading || configLoading;
  const coreFields = config?.kpiFields || [];
  const kpiData = stats.today;
  const userStats = { submissionRate: 100, activeToday: summary?.debug?.reportCount || 0 };

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
          (publicationStatus as string) === "PENDING"
            ? "bg-gradient-to-br from-amber-600 to-amber-900 border-amber-500/50"
            : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-indigo-500/10"
        }`}
      >
        <div className="absolute inset-0 bg-grid-white/[0.05] pointer-events-none" />

        <div className="flex items-center gap-6 relative z-10">
          <div
            className={`w-14 h-14 md:w-20 md:h-20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-xl border ${
              (publicationStatus as string) === "PENDING"
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
                (publicationStatus as string) === "PENDING"
                  ? "text-amber-200/60"
                  : "text-indigo-400"
              }`}
            >
              DGHS National Surveillance Hub
            </p>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
              {config?.outbreak?.name || "Measles Outbreak"}
            </h1>
          </div>
        </div>

        <div className="relative z-10 hidden lg:block">
          <div
            className={`flex items-center gap-4 px-8 py-4 rounded-3xl border-2 backdrop-blur-xl transition-all duration-500 ${
              (publicationStatus as string) === "VERIFIED"
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
      
      {(summary?.totals && !summary.totals.isPublished && summary.totals.hasReports) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-600/10 border border-amber-600/20 p-4 rounded-2xl flex items-center justify-center gap-3 no-print"
        >
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">
             Report is pending publication for {summary?.debug?.dataDate}. Showing last verified snapshot.
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
          <SearchableSelect 
            label=""
            placeholder="All Divisions"
            options={[{ value: "", label: "All Divisions" }, ...DIVISIONS.map(d => ({ value: d, label: d }))]}
            value={selectedDivision || ""}
            onChange={value => {
              setSelectedDivision(value || null);
              setSelectedDistrict(null);
            }}
          />
        </div>

        {selectedDivision && DISTRICTS[selectedDivision] && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <SearchableSelect 
              label=""
              placeholder="All Districts"
              options={[{ value: "", label: "All Districts" }, ...(DISTRICTS[selectedDivision] || []).map(d => ({ value: d, label: d }))]}
              value={selectedDistrict || ""}
              onChange={value => setSelectedDistrict(value || null)}
            />
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
          onClick={() => mutateSummary()}
          disabled={loading}
          className="ml-auto bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {loading ? "Syncing..." : "Sync Insights"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {coreFields.length > 0 ? (
          coreFields.map((field: any) => {
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