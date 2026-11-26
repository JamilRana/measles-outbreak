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
  RefreshCw,
  ArrowUpRight,
  RotateCcw,
  Sparkles,
  Layers,
  Compass,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DIVISIONS, DISTRICTS } from "@/lib/constants";
import { BD_DISTRICT_TO_DIVISION, normalizeDistrictName, normalizeDivisionName } from "@/lib/bd-districts";
import { SearchableSelect } from "@/components/SearchableSelect";
import dynamic from "next/dynamic";
import {
  useDashboardSummary,
  useCumulativeSummary,
  useDashboardConfig,
  useDashboardSettings,
  useDashboardIndicators,
  useDashboardCompliance
} from "@/hooks/useDashboard";
import {
  KPICardSkeleton,
  TableSkeleton,
  MapSkeleton,
  ChartSkeleton
} from "@/components/skeletons";
import { getBdDateString, getBdTime } from "@/lib/timezone";
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
const ExportDossierModal = dynamic(() => import("@/components/ExportDossierModal"), { ssr: false });
const FacilityComplianceModal = dynamic(() => import("@/components/FacilityComplianceModal"), { ssr: false });

// Converts ASCII digits to Bengali digits without altering any punctuation, colons, hyphens, etc.
const toBnDigits = (str: string | number | null | undefined) => {
  if (str == null || str === "") return "";
  const bnNums = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(str).replace(/[0-9]/g, (d) => bnNums[parseInt(d, 10)]);
};

// Formats a date string (e.g. "2026-11-24") safely for display without truncating to year
const formatDateDisplay = (dateStr: string | null | undefined, i18n: any) => {
  if (!dateStr) return "-";
  return i18n.language === "bn" ? toBnDigits(dateStr) : dateStr;
};

// Formats a clock/countdown string (e.g. "00:15:30")
const formatCountdownDisplay = (timerStr: string | null | undefined, i18n: any) => {
  if (!timerStr) return "00:00:00";
  return i18n.language === "bn" ? toBnDigits(timerStr) : timerStr;
};

// Safe number conversion function for numeric metrics
const toBnNumSafe = (n: number | string | null | undefined, i18n: any) => {
  if (n == null || n === "" || (typeof n === "number" && isNaN(n))) return "-";
  const num = typeof n === "number" ? n : Number(n);
  if (isNaN(num)) return String(n);

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

// Modern Executive KPI Card - Minimalist (Clean Title & Big Value)
interface ModernKPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  accentColor: string;
}

function ModernKPICard({
  title,
  value,
  icon,
  accentColor,
}: ModernKPICardProps) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between"
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 transition-all group-hover:h-2"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-center justify-between mb-3.5 pt-1">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
          style={{
            backgroundColor: `${accentColor}18`,
            color: accentColor,
          }}
        >
          {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
        </div>
      </div>

      <div>
        <p className="text-xs sm:text-[13px] font-bold text-slate-600 mb-1 leading-snug">
          {title}
        </p>
        <h4 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
          {value}
        </h4>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { t, i18n } = useTranslation();

  // -- Filter State --
  const [viewMode, setViewMode] = useState<"all" | "today">("today");
  const [activeDatePreset, setActiveDatePreset] = useState<"today" | "yesterday" | "last7" | "last30" | "month" | "custom">("today");
  const [filterDate, setFilterDate] = useState(getBdDateString());
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedMonth, setSelectedMonth] = useState("2026-04");
  const [selectedOutbreakId, setSelectedOutbreakId] = useState<string | null>(null);

  // Date Preset Switcher
  const handleSelectDatePreset = (preset: "today" | "yesterday" | "last7" | "last30" | "month" | "custom") => {
    setActiveDatePreset(preset);
    const bdNow = getBdTime();
    const todayStr = getBdDateString(bdNow);

    if (preset === "today") {
      setViewMode("today");
      setFilterDate(todayStr);
    } else if (preset === "yesterday") {
      setViewMode("today");
      const yesterday = new Date(bdNow.getTime() - 24 * 60 * 60 * 1000);
      setFilterDate(getBdDateString(yesterday));
    } else if (preset === "last7") {
      setViewMode("all");
      const past7 = new Date(bdNow.getTime() - 7 * 24 * 60 * 60 * 1000);
      setDateRange({ from: getBdDateString(past7), to: todayStr });
    } else if (preset === "last30") {
      setViewMode("all");
      const past30 = new Date(bdNow.getTime() - 30 * 24 * 60 * 60 * 1000);
      setDateRange({ from: getBdDateString(past30), to: todayStr });
    } else if (preset === "month") {
      setViewMode("all");
      const [year, month] = selectedMonth.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      setDateRange({
        from: `${selectedMonth}-01`,
        to: `${selectedMonth}-${String(lastDay).padStart(2, "0")}`,
      });
    } else if (preset === "custom") {
      setViewMode("all");
    }
  };
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<{ value: string; label: string }[]>([]);
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [exporting, setExporting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);

  // -- Detailed Table Sort & Pagination State --
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset pagination when filter selections change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDivision, selectedDistrict, selectedFacilityId, viewMode, filterDate, dateRange, tableSearchTerm]);

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
    if (selectedFacilityId) p.set("facilityId", selectedFacilityId);
    return p;
  }, [selectedOutbreakId, viewMode, filterDate, dateRange, selectedDivision, selectedDistrict, selectedFacilityId]);

  const { data: summary, isLoading: summaryLoading, mutate: mutateSummary } = useDashboardSummary(summaryParams);

  // Memoize params for cumulative outbreak summary
  const cumulativeParams = useMemo(() => {
    if (!selectedOutbreakId) return null;
    const p = new URLSearchParams();
    p.set("outbreakId", selectedOutbreakId);

    // Cumulative reflects totals up to the selected date
    if (viewMode === "today") {
      p.set("to", filterDate);
    } else if (dateRange.to) {
      p.set("to", dateRange.to);
    }

    if (selectedDivision) p.set("division", selectedDivision);
    if (selectedDistrict) p.set("district", selectedDistrict);
    if (selectedFacilityId) p.set("facilityId", selectedFacilityId);
    return p;
  }, [selectedOutbreakId, viewMode, filterDate, dateRange.to, selectedDivision, selectedDistrict, selectedFacilityId]);

  const { data: cumulative, isLoading: cumulativeLoading } = useCumulativeSummary(cumulativeParams);

  // Memoize params for facility reporting compliance (only fetch if authenticated)
  const complianceParams = useMemo(() => {
    if (!session?.user || !selectedOutbreakId) return null;
    const p = new URLSearchParams();
    p.set("outbreakId", selectedOutbreakId);
    if (viewMode === "today") {
      p.set("date", filterDate);
    } else if (dateRange.to) {
      p.set("date", dateRange.to);
    }
    if (selectedDivision) p.set("division", selectedDivision);
    if (selectedDistrict) p.set("district", selectedDistrict);
    return p;
  }, [session, selectedOutbreakId, viewMode, filterDate, dateRange.to, selectedDivision, selectedDistrict]);

  const { data: complianceData, isLoading: complianceLoading } = useDashboardCompliance(complianceParams);

  // -- Countdown Timer --
  const [countdown, setCountdown] = useState("00:00:00");
  const [isWindowClosed, setIsWindowClosed] = useState(false);

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
        setIsWindowClosed(true);
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        setIsWindowClosed(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [settings]);

  // Fetch facilities for the selected district
  useEffect(() => {
    if (selectedDistrict) {
      fetch(`/api/facilities?district=${selectedDistrict}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setFacilities([{ value: "", label: "All Facilities" }, ...data.map((f: any) => ({ value: f.id, label: f.facilityName }))]);
          }
        })
        .catch(err => console.error("Failed to fetch facilities", err));
    } else {
      setFacilities([]);
      setSelectedFacilityId(null);
    }
  }, [selectedDistrict]);

  // Sync default outbreak from settings if not selected
  useEffect(() => {
    if (!selectedOutbreakId && settings?.defaultOutbreakId) {
      setSelectedOutbreakId(settings.defaultOutbreakId);
    }
  }, [settings, selectedOutbreakId]);

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
    let items = selectedDivision ? (DISTRICTS[selectedDivision] || []) : DIVISIONS;

    if (selectedFacilityId) {
      const fac = facilities.find(f => f.value === selectedFacilityId);
      items = fac ? [fac.label] : [];
    } else if (selectedDistrict) {
      items = facilities
        .filter(f => f.value !== "")
        .map(f => f.label);
    }

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
  }, [summary, cumulative, selectedDivision, selectedDistrict, selectedFacilityId, facilities]);

  // Filtered by table search term
  const filteredTableData = useMemo(() => {
    if (!tableSearchTerm.trim()) return tableData;
    const term = tableSearchTerm.toLowerCase();
    return tableData.filter((item: any) => item.name.toLowerCase().includes(term));
  }, [tableData, tableSearchTerm]);

  // Sort detailed table data
  const sortedTableData = useMemo(() => {
    return [...filteredTableData].sort((a: any, b: any) => {
      if (sortField === "name") {
        const aName = a.name || "";
        const bName = b.name || "";
        return sortDirection === "asc"
          ? aName.localeCompare(bName, undefined, { numeric: true, sensitivity: "base" })
          : bName.localeCompare(aName, undefined, { numeric: true, sensitivity: "base" });
      }

      const [timeframe, key] = sortField.split(".");
      const aVal = a[timeframe]?.[key] || 0;
      const bVal = b[timeframe]?.[key] || 0;

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredTableData, sortField, sortDirection]);

  // Paginated detailed table data (20 items per page)
  const paginatedTableData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTableData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTableData, currentPage]);

  const totalPages = Math.ceil(filteredTableData.length / itemsPerPage);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "name" ? "asc" : "desc");
    }
  };

  const renderSortableHeader = (field: string, label: string, extraClass: string) => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-3 py-3 border-r border-slate-700/80 cursor-pointer hover:bg-slate-800 transition-colors group select-none ${extraClass}`}
      >
        <div className="flex items-center justify-center gap-1">
          <span>{label}</span>
          {isActive ? (
            sortDirection === "asc" ? <ChevronUp className="w-3 h-3 text-indigo-400 shrink-0" /> : <ChevronDown className="w-3 h-3 text-indigo-400 shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </div>
      </th>
    );
  };

  const publicationStatus = useMemo(() => {
    if (!config?.outbreak) return "VERIFIED";
    const now = getBdTime();
    const today = getBdDateString(now);

    if (viewMode === "today" && filterDate === today) {
      const publishTime = new Date(now);
      publishTime.setHours(config.outbreak.publishTimeHour || 0, config.outbreak.publishTimeMinute || 0, 0, 0);
      return now < publishTime ? "PENDING" : "VERIFIED";
    }

    return "VERIFIED";
  }, [config, filterDate, viewMode]);

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
    setIsExportModalOpen(true);
  };

  // Reset all filters function
  const handleClearAllFilters = () => {
    setSelectedDivision(null);
    setSelectedDistrict(null);
    setSelectedFacilityId(null);
    setFilterDate(getBdDateString());
    setDateRange({ from: "", to: "" });
    setViewMode("today");
    setTableSearchTerm("");
  };

  // Click on a table row to drill down
  const handleRowDrilldown = (name: string) => {
    if (!selectedDivision) {
      setSelectedDivision(name);
      setSelectedDistrict(null);
      setSelectedFacilityId(null);
    } else if (!selectedDistrict) {
      setSelectedDistrict(name);
      setSelectedFacilityId(null);
    }
  };

  const dynamicFilterParams = useMemo(() => {
    if (!selectedOutbreakId) return "";
    const p = new URLSearchParams();
    p.set("outbreakId", selectedOutbreakId);
    if (selectedDivision) p.set("division", selectedDivision);
    if (selectedDistrict) p.set("district", selectedDistrict);
    if (selectedFacilityId) p.set("facilityId", selectedFacilityId);
    if (viewMode === "today") p.set("date", filterDate);
    else {
      if (dateRange.from) p.set("from", dateRange.from);
      if (dateRange.to) p.set("to", dateRange.to);
    }
    return p.toString();
  }, [selectedOutbreakId, selectedDivision, selectedDistrict, selectedFacilityId, viewMode, filterDate, dateRange]);

  const loading = summaryLoading || configLoading;
  const activeMetrics = viewMode === "today" ? stats.today : stats.cumulative;

  // Epidemiological calculated values
  const totalSuspected = activeMetrics.suspected || 0;
  const totalConfirmed = activeMetrics.confirmed || 0;
  const totalCases = totalSuspected + totalConfirmed;
  const totalSuspectedDeaths = activeMetrics.suspectedDeath || 0;
  const totalConfirmedDeaths = activeMetrics.confirmedDeath || 0;
  const totalDeaths = totalSuspectedDeaths + totalConfirmedDeaths;
  const totalAdmitted = activeMetrics.admitted || 0;
  const totalRecovered = activeMetrics.recovered || 0;

  // CFR: Case Fatality Rate (%)
  const cfrRate = totalCases > 0 ? ((totalDeaths / totalCases) * 100).toFixed(2) : "0.00";
  // Confirmed Positivity / Proportion
  const labConfirmationRate = totalCases > 0 ? ((totalConfirmed / totalCases) * 100).toFixed(1) : "0.0";
  // Hospitalization rate
  const hospitalizationRate = totalCases > 0 ? ((totalAdmitted / totalCases) * 100).toFixed(1) : "0.0";

  const userStats = {
    submissionRate: 100,
    activeToday: summary?.debug?.reportCount || 0
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1700px] mx-auto space-y-8 pb-36 print:p-0 relative font-sans">
      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/70 backdrop-blur-sm flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white/90 p-6 rounded-3xl border border-slate-200 shadow-2xl flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-800 uppercase tracking-widest animate-pulse">
                Syncing National Surveillance...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. EXECUTIVE COMMAND HEADER */}
      <header className="relative overflow-hidden rounded-[2.5rem] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />

        <div className="relative z-10 px-6 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Left: Branding & Outbreak Title */}
          <div className="flex items-center gap-5 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2.5 backdrop-blur-md shadow-inner shrink-0">
              <Image
                src="/logo_mohfw.png"
                alt="MOHFW"
                width={56}
                height={56}
                className="object-contain brightness-110 drop-shadow-md"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">
                  {i18n.language === "bn" ? "ডিজিএইচএস জাতীয় ডিসিজ সার্ভিল্যান্স " : "DGHS National Disease Surveillance"}
                </span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-[10px] font-mono font-medium text-slate-400">
                  {viewMode === "today"
                    ? (i18n.language === "bn" ? `লাইভ তারিখ: ${formatDateDisplay(filterDate, i18n)}` : `Live Date: ${filterDate}`)
                    : (i18n.language === "bn" ? "প্রাদুর্ভাব সময়সীমা" : "Cumulative Outbreak Timeline")}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                {config?.outbreak?.name || (i18n.language === "bn" ? "হাম প্রাদুর্ভাব নজরদারি" : "Measles Outbreak Surveillance")}
              </h1>

              {/* Geographic Breadcrumbs */}
              <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-400">
                <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="hover:text-white transition-colors underline decoration-slate-600 underline-offset-4"
                >
                  {i18n.language === "bn" ? "বাংলাদেশ জাতীয়" : "Bangladesh National"}
                </button>
                {selectedDivision && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDistrict(null);
                        setSelectedFacilityId(null);
                      }}
                      className="hover:text-white transition-colors underline decoration-slate-600 underline-offset-4 text-slate-300"
                    >
                      {selectedDivision} {i18n.language === "bn" ? "বিভাগ" : "Division"}
                    </button>
                  </>
                )}
                {selectedDistrict && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-indigo-400 font-bold">{selectedDistrict} {i18n.language === "bn" ? "জেলা" : "District"}</span>
                  </>
                )}
                {selectedFacilityId && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-emerald-400 font-bold">{i18n.language === "bn" ? "প্রতিষ্ঠান নির্বাচিত" : "Facility Selected"}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Operational Status Badges & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-start xl:self-center">
            {/* Publication Status Pill */}
            <div
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all text-xs font-bold ${publicationStatus === "VERIFIED"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-amber-950/60 border-amber-500/40 text-amber-300 animate-pulse"
                }`}
            >
              {publicationStatus === "VERIFIED" ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div>
                <span className="block text-[9px] uppercase tracking-wider opacity-75">{i18n.language === "bn" ? "তথ্য" : "Data State"}</span>
                <span>{publicationStatus === "VERIFIED" ? (i18n.language === "bn" ? "যাচাইকৃত প্রতিবেদন" : "Verified SitRep") : (i18n.language === "bn" ? "খসড়া" : "Draft")}</span>
              </div>
            </div>

            {/* Reporting Window Countdown Pill */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-slate-700 bg-slate-900/80 text-xs">
              <Clock className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="block text-[9px] font-black uppercase tracking-wider text-rose-400">
                  {i18n.language === "bn" ? "রিপোর্টিং উইন্ডো" : "Reporting Window"}
                </span>
                <span className="font-mono font-bold text-white tracking-wider">
                  {formatCountdownDisplay(countdown, i18n)}
                </span>
              </div>
            </div>

            {/* Action Buttons: Export & Refresh */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer"
                title="Export raw surveillance records by date & facility"
              >
                <Download className="w-3.5 h-3.5" />
                {i18n.language === "bn" ? "এক্সপোর্ট" : "Export"}
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                disabled={exporting}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-2xl transition-all shadow-sm disabled:opacity-50"
                title="Print / PDF SitRep"
              >
                <Printer className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => mutateSummary()}
                disabled={loading}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-2xl transition-all shadow-sm disabled:opacity-50"
                title="Sync Insights"
              >
                <RefreshCw className={`w-4 h-4 text-slate-300 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Pending Banner Alert if today is before publish time */}
      {publicationStatus === "PENDING" && filterDate === getBdDateString() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-3xl flex items-center gap-3 text-amber-800 text-xs font-bold"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            Today's epidemiological statistics are provisional. Official verified SitRep will be released at{" "}
            <b>{config?.outbreak?.releaseTime || "14:00 BST"}</b>.
          </span>
        </motion.div>
      )}

      {config?.outbreak?.hasDashboard === false ? (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ActivitySquare className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">
            Analytics Restricted
          </h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed mb-6">
            The reporting dashboard has been restricted for this outbreak. Contact the MIS Department for official access.
          </p>
        </div>
      ) : (
        <>
          {/* 2. REFINED FILTER & SCOPING CONSOLE */}
          <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Timeframe Presets & Date Pickers */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Presets Pill Bar */}
                <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
                  {(
                    [
                      { id: "today", label: i18n.language === "bn" ? "আজ" : "Today" },
                      { id: "yesterday", label: i18n.language === "bn" ? "গতকাল" : "Yesterday" },
                      { id: "last7", label: i18n.language === "bn" ? "গত ৭ দিন" : "Last 7 Days" },
                      { id: "last30", label: i18n.language === "bn" ? "গত ৩০ দিন" : "Last 30 Days" },
                      { id: "month", label: i18n.language === "bn" ? "মাস অনুযায়ী" : "By Month" },
                      { id: "custom", label: i18n.language === "bn" ? "কাস্টম রেঞ্জ" : "Custom Range" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectDatePreset(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeDatePreset === p.id
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Sub-inputs based on preset */}
                {activeDatePreset === "today" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{formatDateDisplay(filterDate, i18n)}</span>
                  </div>
                )}

                {activeDatePreset === "yesterday" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{formatDateDisplay(filterDate, i18n)}</span>
                  </div>
                )}

                {activeDatePreset === "month" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => {
                        const m = e.target.value;
                        setSelectedMonth(m);
                        const [year, month] = m.split("-").map(Number);
                        const lastDay = new Date(year, month, 0).getDate();
                        setDateRange({
                          from: `${m}-01`,
                          to: `${m}-${String(lastDay).padStart(2, "0")}`,
                        });
                      }}
                      className="bg-transparent border-none p-0 text-xs font-bold text-slate-800 focus:ring-0 cursor-pointer"
                    />
                  </div>
                )}

                {(activeDatePreset === "custom" || activeDatePreset === "last7" || activeDatePreset === "last30") && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <input
                      type="date"
                      value={dateRange.from || ""}
                      onChange={(e) => {
                        setActiveDatePreset("custom");
                        setDateRange({ ...dateRange, from: e.target.value });
                      }}
                      min="2026-04-10"
                      className="bg-transparent border-none p-0 focus:ring-0 text-slate-800 font-bold cursor-pointer text-xs"
                    />
                    <span className="text-slate-400 font-bold text-[10px] uppercase">
                      {i18n.language === "bn" ? "থেকে" : "to"}
                    </span>
                    <input
                      type="date"
                      value={dateRange.to || ""}
                      onChange={(e) => {
                        setActiveDatePreset("custom");
                        setDateRange({ ...dateRange, to: e.target.value });
                      }}
                      min="2026-04-10"
                      className="bg-transparent border-none p-0 focus:ring-0 text-slate-800 font-bold cursor-pointer text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Right: Geographic Dropdown Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Division Filter */}
                <div className="min-w-[190px]">
                  <SearchableSelect
                    placeholder={i18n.language === "bn" ? "সমগ্র বাংলাদেশ (বিভাগ)" : "All Bangladesh (Divisions)"}
                    options={[
                      { value: "", label: i18n.language === "bn" ? "সমগ্র বাংলাদেশ" : "All Bangladesh" },
                      ...DIVISIONS.map(d => ({ value: d, label: i18n.language === "bn" ? `${d} বিভাগ` : `${d} Division` }))
                    ]}
                    value={selectedDivision || ""}
                    onChange={value => {
                      setSelectedDivision(value || null);
                      setSelectedDistrict(null);
                      setSelectedFacilityId(null);
                    }}
                  />
                </div>

                {/* District Filter (Cascades when division selected) */}
                {selectedDivision && DISTRICTS[selectedDivision] && (
                  <div className="min-w-[190px]">
                    <SearchableSelect
                      placeholder={i18n.language === "bn" ? "সকল জেলা" : "All Districts"}
                      options={[
                        { value: "", label: i18n.language === "bn" ? `${selectedDivision} বিভাগের সকল জেলা` : `All ${selectedDivision} Districts` },
                        ...(DISTRICTS[selectedDivision] || []).map(d => ({ value: d, label: i18n.language === "bn" ? `${d} জেলা` : `${d} District` }))
                      ]}
                      value={selectedDistrict || ""}
                      onChange={value => {
                        setSelectedDistrict(value || null);
                        setSelectedFacilityId(null);
                      }}
                    />
                  </div>
                )}

                {/* Facility Filter (Cascades when district selected) */}
                {selectedDistrict && facilities.length > 0 && (
                  <div className="min-w-[210px]">
                    <SearchableSelect
                      placeholder="All Facilities"
                      options={facilities}
                      value={selectedFacilityId || ""}
                      onChange={value => setSelectedFacilityId(value || null)}
                    />
                  </div>
                )}

                {/* Clear All Filters Button */}
                {(selectedDivision || selectedDistrict || selectedFacilityId || viewMode !== "today") && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* 3. MODERN EPIDEMIOLOGICAL KPI DECK (6 CORE CARDS) */}
          <section className="space-y-3.5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-4">
              {/* KPI 1: সন্দেহভাজন কেস */}
              <ModernKPICard
                title={i18n.language === "bn" ? "সন্দেহভাজন কেস" : "Suspected Cases"}
                value={toBnNumSafe(totalSuspected, i18n)}
                icon={<Users />}
                accentColor="#f59e0b"
              />

              {/* KPI 2: নিশ্চিত কেস */}
              <ModernKPICard
                title={i18n.language === "bn" ? "নিশ্চিত কেস" : "Confirmed Cases"}
                value={toBnNumSafe(totalConfirmed, i18n)}
                icon={<CheckCircle2 />}
                accentColor="#2563eb"
              />

              {/* KPI 3: সন্দেহভাজন মৃত্যু */}
              <ModernKPICard
                title={i18n.language === "bn" ? "সন্দেহভাজন মৃত্যু" : "Suspected Deaths"}
                value={toBnNumSafe(totalSuspectedDeaths, i18n)}
                icon={<AlertTriangle />}
                accentColor="#f97316"
              />

              {/* KPI 4: নিশ্চিত মৃত্যু */}
              <ModernKPICard
                title={i18n.language === "bn" ? "নিশ্চিত মৃত্যু" : "Confirmed Deaths"}
                value={toBnNumSafe(totalConfirmedDeaths, i18n)}
                icon={<Skull />}
                accentColor="#ef4444"
              />

              {/* KPI 5: ভর্তি */}
              <ModernKPICard
                title={i18n.language === "bn" ? "ভর্তি" : "Hospitalized"}
                value={toBnNumSafe(totalAdmitted, i18n)}
                icon={<Hospital />}
                accentColor="#059669"
              />

              {/* KPI 6: ছাড়পত্র */}
              <ModernKPICard
                title={i18n.language === "bn" ? "ছাড়পত্র" : "Discharged"}
                value={toBnNumSafe(totalRecovered, i18n)}
                icon={<Activity />}
                accentColor="#10b981"
              />
            </div>

            {/* 10:00 AM BST Reporting Compliance Bar - ONLY for logged-in users */}
            {session?.user && (
              <div
                onClick={() => setIsComplianceModalOpen(true)}
                className="bg-gradient-to-r from-emerald-50/80 via-teal-50/80 to-blue-50/80 border border-emerald-200/80 rounded-2xl p-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-sm transition-all cursor-pointer group"
                title="Click to view 10:00 AM Cutoff Facility Compliance Tracker"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {i18n.language === "bn" ? "দৈনিক স্বাস্থ্য প্রতিষ্ঠান রিপোর্টিং কমপ্লায়েন্স " : "Facility Reporting Compliance"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {toBnNumSafe(complianceData?.metrics?.complianceRate ?? 0, i18n)}% {i18n.language === "bn" ? "সময়মতো" : "On-Time"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {toBnNumSafe(complianceData?.metrics?.onTimeCount ?? 0, i18n)} {i18n.language === "bn" ? "সময়মতো জমা" : "On-Time"} · {toBnNumSafe(complianceData?.metrics?.lateCount ?? 0, i18n)} {i18n.language === "bn" ? "দেরিতে জমা" : "Late"} · {toBnNumSafe(complianceData?.metrics?.missedCount ?? 0, i18n)} {i18n.language === "bn" ? "অনুপস্থিত" : "Missed"} · {toBnNumSafe(complianceData?.metrics?.submittedCount ?? 0, i18n)}/{toBnNumSafe(complianceData?.metrics?.totalFacilities ?? 0, i18n)} {i18n.language === "bn" ? "প্রতিষ্ঠান জমা দিয়েছে" : "Facilities Sent"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:text-emerald-800 shrink-0">
                  <span>{i18n.language === "bn" ? "পূর্ণাঙ্গ ট্র্যাকার দেখুন" : "View Full Tracker"}</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            )}
          </section>

          {/* 4. HIGH-RISK SURVEILLANCE HOTSPOTS (INTERACTIVE) */}
          <section className="bg-white rounded-[2.5rem] border border-slate-200/90 shadow-sm p-6 sm:p-7 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                  {i18n.language === "bn" ? "মহামারী হটস্পট" : "Epidemiological Hotspots"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {i18n.language === "bn"
                    ? "মৃত্যু ও আক্রান্তের সংখ্যা অনুযায়ী শীর্ষ ভৌগোলিক অঞ্চল। ড্যাশবোর্ডে ফিল্টার করতে ক্লিক করুন।"
                    : "Top geographic areas ranked by mortality & case burden. Click any hotspot to isolate in dashboard."}
                </p>
              </div>

              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
                {i18n.language === "bn" ? "মোট মৃত্যুর ভিত্তিতে সাজানো" : "Ranked by Total Deaths"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {tableData
                .slice()
                .sort(
                  (a, b) =>
                    b.cumulative.confirmedDeath +
                    b.cumulative.suspectedDeath -
                    (a.cumulative.confirmedDeath + a.cumulative.suspectedDeath)
                )
                .slice(0, 5)
                .map((d: any, idx: number) => {
                  const cumDeaths = d.cumulative.confirmedDeath + d.cumulative.suspectedDeath;
                  const cumCases = d.cumulative.confirmed + d.cumulative.suspected;
                  const hotspotCfr = cumCases > 0 ? ((cumDeaths / cumCases) * 100).toFixed(2) : "0.00";
                  const isTopOne = idx === 0 && cumDeaths > 0;

                  return (
                    <button
                      key={d.name}
                      type="button"
                      onClick={() => handleRowDrilldown(d.name)}
                      className={`text-left p-4 rounded-2xl border transition-all duration-200 relative group ${isTopOne
                        ? "bg-rose-50/60 border-rose-200 hover:bg-rose-100/70 hover:border-rose-300"
                        : "bg-slate-50 border-slate-200/70 hover:bg-indigo-50/60 hover:border-indigo-200"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-slate-900 transition-colors">
                          #{toBnNumSafe(idx + 1, i18n)} {d.name}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <span className="text-2xl font-black text-slate-900 font-mono">
                            {toBnNumSafe(cumDeaths, i18n)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                            {i18n.language === "bn" ? "মৃত্যু" : "Deaths"}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cumDeaths > 0
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-200 text-slate-600"
                            }`}
                        >
                          CFR {toBnNumSafe(hotspotCfr, i18n)}%
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-500 font-medium">
                        {i18n.language === "bn" ? "মোট কেস:" : "Total Cases:"} <b>{toBnNumSafe(cumCases, i18n)}</b>
                      </div>
                    </button>
                  );
                })}
            </div>
          </section>

          {/* 5. GEOGRAPHIC SURVEILLANCE & VECTOR CHOROPLETH MAP */}
          <section className="space-y-3">
            <OutbreakMap
              apiEndpoint={`/api/reports/geo?${dynamicFilterParams}`}
              selectedDistrict={selectedDistrict}
              selectedDivision={selectedDivision}
              onSelectDistrict={(d) => {
                if (!d || d === selectedDistrict) {
                  setSelectedDistrict(null);
                } else {
                  const norm = normalizeDistrictName(d);
                  setSelectedDistrict(norm);
                  const div = BD_DISTRICT_TO_DIVISION[norm];
                  if (div) setSelectedDivision(div);
                }
              }}
              onSelectDivision={(div) => {
                if (!div) {
                  setSelectedDivision(null);
                  setSelectedDistrict(null);
                } else if (div === selectedDivision && !selectedDistrict) {
                  setSelectedDivision(null);
                  setSelectedDistrict(null);
                } else {
                  const normDiv = normalizeDivisionName(div);
                  setSelectedDivision(normDiv);
                  if (div === selectedDivision && selectedDistrict) {
                    setSelectedDistrict(null);
                  } else if (selectedDistrict && BD_DISTRICT_TO_DIVISION[selectedDistrict] !== normDiv) {
                    setSelectedDistrict(null);
                  }
                }
              }}
            />
          </section>

          {/* 6. EPIDEMIOLOGICAL CURVE & TRANSMISSION DYNAMICS */}
          <section className="space-y-3">
            <EpiInsights apiEndpoint={`/api/reports/timeseries?${dynamicFilterParams}`} />
          </section>

          {/* 7. DETAILED FACILITY & GEOGRAPHIC ANALYSIS MATRIX */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print px-1">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
                  <TableIcon className="w-5 h-5 text-indigo-600 shrink-0" />
                  {selectedFacilityId
                    ? (i18n.language === "bn" ? "প্রতিষ্ঠান ভিত্তিক" : "Facility-Level Surveillance")
                    : selectedDistrict
                      ? (i18n.language === "bn" ? `${selectedDistrict} জেলা ভিত্তিক ` : `${selectedDistrict} District Facility Matrix`)
                      : selectedDivision
                        ? (i18n.language === "bn" ? `${selectedDivision} বিভাগীয় জেলা বিভাজন` : `${selectedDivision} Division District Breakdown`)
                        : (i18n.language === "bn" ? "জাতীয়" : "National Administrative Breakdown")}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {i18n.language === "bn"
                    ? "জেলা বা প্রতিষ্ঠান ভিত্তিক তথ্য দেখতে যেকোনো সারিতে ক্লিক করুন।"
                    : "Click any row to drill down into district-level or facility-level data."}
                </p>
              </div>

              {/* Table Search & Export Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Instant Table Search Filter */}
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tableSearchTerm}
                    onChange={(e) => setTableSearchTerm(e.target.value)}
                    placeholder={i18n.language === "bn" ? "জেলা বা প্রতিষ্ঠান খুঁজুন..." : "Search district / facility..."}
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                  {tableSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setTableSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
                  title="Export raw data records by date & facility"
                >
                  <Download className="w-4 h-4" />
                  {i18n.language === "bn" ? "এক্সপোর্ট (.xlsx)" : "Export (.xlsx)"}
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.12em] text-center">
                    <tr>
                      <th
                        rowSpan={3}
                        onClick={() => handleSort("name")}
                        className="px-6 py-6 text-left border-r border-slate-800 bg-slate-950 sticky left-0 z-20 cursor-pointer hover:bg-slate-900 transition-colors group select-none min-w-[180px]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>
                            {selectedDistrict
                              ? (i18n.language === "bn" ? "প্রতিষ্ঠান" : "FACILITY NAME")
                              : selectedDivision
                                ? (i18n.language === "bn" ? "জেলা" : "DISTRICT")
                                : (i18n.language === "bn" ? "বিভাগ" : "DIVISION")}
                          </span>
                          {sortField === "name" ? (
                            sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-indigo-400" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>
                      <th colSpan={6} className="px-6 py-3.5 bg-slate-900 border-b border-white/10 tracking-widest text-slate-300">
                        {i18n.language === "bn" ? "গত ২৪ ঘণ্টার নজরদারি" : "Last 24 Hours Surveillance"}
                      </th>
                      <th colSpan={6} className="px-6 py-3.5 bg-slate-950 border-b border-white/10 tracking-widest text-indigo-300">
                        {i18n.language === "bn" ? "মোট প্রাদুর্ভাব" : "Cumulative Outbreak Volume"}
                      </th>
                    </tr>
                    <tr className="bg-slate-900 border-t border-white/10 text-[8px]">
                      <th colSpan={2} className="px-3 py-2.5 border-r border-white/10 bg-slate-800/60">
                        {i18n.language === "bn" ? "সন্দেহভাজন" : "Suspected"}
                      </th>
                      <th colSpan={2} className="px-3 py-2.5 border-r border-white/10 bg-slate-800/60">
                        {i18n.language === "bn" ? "নিশ্চিত" : "Confirmed"}
                      </th>
                      <th className="px-3 py-2.5 border-r border-white/10 bg-slate-800/60">
                        {i18n.language === "bn" ? "ভর্তি" : "Admitted"}
                      </th>
                      <th className="px-3 py-2.5 border-r border-white/10 bg-slate-800/60">
                        {i18n.language === "bn" ? "ছাড়পত্র" : "Discharged"}
                      </th>
                      <th colSpan={2} className="px-3 py-2.5 border-r border-white/10 bg-slate-950/80">
                        {i18n.language === "bn" ? "সন্দেহভাজন" : "Suspected"}
                      </th>
                      <th colSpan={2} className="px-3 py-2.5 border-r border-white/10 bg-slate-950/80">
                        {i18n.language === "bn" ? "নিশ্চিত" : "Confirmed"}
                      </th>
                      <th className="px-3 py-2.5 border-r border-white/10 bg-slate-950/80">
                        {i18n.language === "bn" ? "ভর্তি" : "Admitted"}
                      </th>
                      <th className="px-3 py-2.5 border-r border-white/10 bg-slate-950/80">
                        {i18n.language === "bn" ? "ছাড়পত্র" : "Discharged"}
                      </th>
                    </tr>
                    <tr className="bg-slate-950 text-slate-400 border-t border-slate-800 text-[8px]">
                      {renderSortableHeader("today.suspected", i18n.language === "bn" ? "কেস" : "Cases", "bg-slate-900 text-white")}
                      {renderSortableHeader("today.suspectedDeath", i18n.language === "bn" ? "মৃত্যু" : "Deaths", "bg-slate-900 text-rose-400")}
                      {renderSortableHeader("today.confirmed", i18n.language === "bn" ? "কেস" : "Cases", "bg-slate-900 text-white")}
                      {renderSortableHeader("today.confirmedDeath", i18n.language === "bn" ? "মৃত্যু" : "Deaths", "bg-slate-900 text-rose-400")}
                      {renderSortableHeader("today.admitted", i18n.language === "bn" ? "মোট" : "Total", "bg-slate-900 text-white")}
                      {renderSortableHeader("today.recovered", i18n.language === "bn" ? "মোট" : "Total", "bg-slate-900 text-white")}
                      {renderSortableHeader("cumulative.suspected", i18n.language === "bn" ? "কেস" : "Cases", "bg-slate-950 text-white")}
                      {renderSortableHeader("cumulative.suspectedDeath", i18n.language === "bn" ? "মৃত্যু" : "Deaths", "bg-slate-950 text-rose-400")}
                      {renderSortableHeader("cumulative.confirmed", i18n.language === "bn" ? "কেস" : "Cases", "bg-slate-950 text-white")}
                      {renderSortableHeader("cumulative.confirmedDeath", i18n.language === "bn" ? "মৃত্যু" : "Deaths", "bg-slate-950 text-rose-400")}
                      {renderSortableHeader("cumulative.admitted", i18n.language === "bn" ? "মোট" : "Total", "bg-slate-950 text-white")}
                      {renderSortableHeader("cumulative.recovered", i18n.language === "bn" ? "মোট" : "Total", "bg-slate-950 text-white")}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedTableData.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="text-center py-12 text-slate-400 font-medium">
                          {i18n.language === "bn" ? `"${tableSearchTerm}" এর সাথে মিলে এমন কোনো তথ্য পাওয়া যায়নি।` : `No matching records found for "${tableSearchTerm}".`}
                        </td>
                      </tr>
                    ) : (
                      paginatedTableData.map((d: any) => {
                        const hasTodayDeaths = d.today.suspectedDeath > 0 || d.today.confirmedDeath > 0;
                        const hasCumDeaths = d.cumulative.suspectedDeath > 0 || d.cumulative.confirmedDeath > 0;

                        return (
                          <tr
                            key={d.name}
                            onClick={() => handleRowDrilldown(d.name)}
                            className="group hover:bg-indigo-50/40 transition-colors cursor-pointer"
                            title="Click to drill down"
                          >
                            <td className="px-6 py-3.5 sticky left-0 bg-white group-hover:bg-indigo-50/40 z-10 border-r border-slate-100 font-black text-slate-800 text-xs uppercase tracking-tight flex items-center justify-between gap-2">
                              <span>{d.name}</span>
                              {!selectedDistrict && (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </td>
                            {/* Today 24h Columns */}
                            <td className="px-3 py-3 text-center text-slate-700 font-bold bg-slate-50/50">
                              {toBnNumSafe(d.today.suspected, i18n)}
                            </td>
                            <td className={`px-3 py-3 text-center font-bold bg-slate-50/50 ${d.today.suspectedDeath > 0 ? "text-rose-600 font-black" : "text-slate-400"}`}>
                              {toBnNumSafe(d.today.suspectedDeath, i18n)}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-700 font-bold bg-slate-50/50">
                              {toBnNumSafe(d.today.confirmed, i18n)}
                            </td>
                            <td className={`px-3 py-3 text-center font-bold bg-slate-50/50 ${d.today.confirmedDeath > 0 ? "text-rose-600 font-black" : "text-slate-400"}`}>
                              {toBnNumSafe(d.today.confirmedDeath, i18n)}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-700 font-bold bg-slate-50/50">
                              {toBnNumSafe(d.today.admitted, i18n)}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-700 font-bold bg-slate-50/50">
                              {toBnNumSafe(d.today.recovered, i18n)}
                            </td>

                            {/* Cumulative Columns */}
                            <td className="px-3 py-3 text-center text-slate-900 font-black">
                              {toBnNumSafe(d.cumulative.suspected, i18n)}
                            </td>
                            <td className={`px-3 py-3 text-center font-bold ${d.cumulative.suspectedDeath > 0 ? "text-rose-600 font-black" : "text-slate-400"}`}>
                              {toBnNumSafe(d.cumulative.suspectedDeath, i18n)}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-900 font-black">
                              {toBnNumSafe(d.cumulative.confirmed, i18n)}
                            </td>
                            <td className={`px-3 py-3 text-center font-bold ${d.cumulative.confirmedDeath > 0 ? "text-rose-600 font-black" : "text-slate-400"}`}>
                              {toBnNumSafe(d.cumulative.confirmedDeath, i18n)}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-600 font-semibold">
                              {toBnNumSafe(d.cumulative.admitted, i18n)}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-600 font-semibold">
                              {toBnNumSafe(d.cumulative.recovered, i18n)}
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* Aggregate Summary Footer Row */}
                    <tr className="bg-slate-950 text-white font-black text-xs text-center">
                      <td className="py-5 px-6 text-left sticky left-0 bg-slate-950 z-10 uppercase tracking-wider">
                        {selectedDistrict
                          ? (i18n.language === "bn" ? "জেলা সর্বমোট" : "District Total")
                          : selectedDivision
                            ? (i18n.language === "bn" ? "বিভাগীয় মোট" : "Division Aggregate")
                            : (i18n.language === "bn" ? "জাতীয় মোট" : "National Aggregate")}
                      </td>
                      <td className="py-5 bg-slate-900/60">{toBnNumSafe(stats.today.suspected, i18n)}</td>
                      <td className="py-5 bg-slate-900/60 text-rose-400">{toBnNumSafe(stats.today.suspectedDeath, i18n)}</td>
                      <td className="py-5 bg-slate-900/60">{toBnNumSafe(stats.today.confirmed, i18n)}</td>
                      <td className="py-5 bg-slate-900/60 text-rose-400">{toBnNumSafe(stats.today.confirmedDeath, i18n)}</td>
                      <td className="py-5 bg-slate-900/60">{toBnNumSafe(stats.today.admitted, i18n)}</td>
                      <td className="py-5 bg-slate-900/60">{toBnNumSafe(stats.today.recovered, i18n)}</td>
                      <td className="py-5 bg-indigo-950/80">{toBnNumSafe(stats.cumulative.suspected, i18n)}</td>
                      <td className="py-5 bg-indigo-950/80 text-rose-400">{toBnNumSafe(stats.cumulative.suspectedDeath, i18n)}</td>
                      <td className="py-5 bg-indigo-950/80 text-purple-300">{toBnNumSafe(stats.cumulative.confirmed, i18n)}</td>
                      <td className="py-5 bg-indigo-950/80 text-rose-400">{toBnNumSafe(stats.cumulative.confirmedDeath, i18n)}</td>
                      <td className="py-5 bg-indigo-950/80">{toBnNumSafe(stats.cumulative.admitted, i18n)}</td>
                      <td className="py-5 bg-indigo-950/80">{toBnNumSafe(stats.cumulative.recovered, i18n)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredTableData.length > itemsPerPage && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
                  <p className="font-bold text-slate-500">
                    {i18n.language === "bn" ? (
                      <>
                        দেখানো হচ্ছে <b>{toBnNumSafe((currentPage - 1) * itemsPerPage + 1, i18n)} &ndash; {toBnNumSafe(Math.min(currentPage * itemsPerPage, filteredTableData.length), i18n)}</b>, সর্বমোট <b>{toBnNumSafe(filteredTableData.length, i18n)}</b> টি রেকর্ড
                      </>
                    ) : (
                      <>
                        Showing <b>{(currentPage - 1) * itemsPerPage + 1} &ndash; {Math.min(currentPage * itemsPerPage, filteredTableData.length)}</b> of <b>{filteredTableData.length}</b> records
                      </>
                    )}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:text-indigo-600 disabled:opacity-40 transition-all shadow-sm disabled:cursor-not-allowed"
                    >
                      {i18n.language === "bn" ? "পূর্ববর্তী" : "Previous"}
                    </button>

                    <span className="font-bold text-slate-400 px-2">
                      {i18n.language === "bn"
                        ? `পৃষ্ঠা ${toBnNumSafe(currentPage, i18n)} / ${toBnNumSafe(totalPages || 1, i18n)}`
                        : `Page ${currentPage} of ${totalPages || 1}`}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:text-indigo-600 disabled:opacity-40 transition-all shadow-sm disabled:cursor-not-allowed"
                    >
                      {i18n.language === "bn" ? "পরবর্তী" : "Next"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Export Modal Component */}
      <ExportDossierModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        outbreakId={selectedOutbreakId}
        defaultDivision={selectedDivision}
        defaultDistrict={selectedDistrict}
      />

      {/* Facility Compliance Tracker Modal - ONLY for authenticated users */}
      {session?.user && (
        <FacilityComplianceModal
          isOpen={isComplianceModalOpen}
          onClose={() => setIsComplianceModalOpen(false)}
          complianceData={complianceData}
          isLoading={complianceLoading}
        />
      )}
    </div>
  );
}
