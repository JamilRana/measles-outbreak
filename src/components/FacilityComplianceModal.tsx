"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Building2, 
  ShieldAlert, 
  FileText,
  Filter,
  TrendingUp,
  MapPin
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface FacilityComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  complianceData: any;
  isLoading: boolean;
  onSelectFacility?: (facilityId: string) => void;
}

export default function FacilityComplianceModal({
  isOpen,
  onClose,
  complianceData,
  isLoading,
  onSelectFacility,
}: FacilityComplianceModalProps) {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "ON_TIME" | "LATE" | "MISSED" | "NIL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const toBnDigits = (str: string | number | null | undefined) => {
    if (str == null || str === "") return "";
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(str).replace(/[0-9]/g, (d) => bnNums[parseInt(d, 10)]);
  };

  const toBnNum = (n: number | string | null | undefined) => {
    if (n == null || n === '') return '0';
    const num = typeof n === 'number' ? n : Number(n);
    if (isNaN(num)) return i18n.language === 'bn' ? toBnDigits(n) : String(n);
    if (i18n.language !== 'bn') return num.toLocaleString('en-US');
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toLocaleString('en-US')
      .toString()
      .split('')
      .map(char => {
        const digit = parseInt(char, 10);
        return !isNaN(digit) ? bnNums[digit] : char;
      })
      .join('');
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const metrics = complianceData?.metrics || {
    totalFacilities: 0,
    submittedCount: 0,
    onTimeCount: 0,
    lateCount: 0,
    missedCount: 0,
    nilCount: 0,
    complianceRate: 0,
    onTimeRate: 0,
  };

  const facilities = complianceData?.facilities || [];
  const byDivision = complianceData?.byDivision || [];

  const filteredFacilities = useMemo(() => {
    return facilities.filter((f: any) => {
      // Tab filter
      if (activeTab === "ON_TIME" && f.status !== "ON_TIME") return false;
      if (activeTab === "LATE" && f.status !== "LATE") return false;
      if (activeTab === "MISSED" && f.status !== "MISSED") return false;
      if (activeTab === "NIL" && !f.isNilReport) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = f.facilityName?.toLowerCase().includes(q);
        const codeMatch = f.facilityCode?.toLowerCase().includes(q);
        const divMatch = f.division?.toLowerCase().includes(q);
        const distMatch = f.district?.toLowerCase().includes(q);
        const upazilaMatch = f.upazila?.toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !divMatch && !distMatch && !upazilaMatch) {
          return false;
        }
      }

      return true;
    });
  }, [facilities, activeTab, searchQuery]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white border border-slate-200 rounded-[2rem] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">
                  {i18n.language === "bn" ? "স্বাস্থ্য প্রতিষ্ঠান রিপোর্টিং কমপ্লায়েন্স ট্র্যাকার" : "Facility Reporting Compliance Tracker"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  {i18n.language === "bn" ? "কাটঅফ: ১০:০০ পূর্বাহ্ণ BST" : "Cutoff: 10:00 AM BST"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {i18n.language === "bn" ? (
                  <>নজরদারি রিপোর্ট জমার সময়সীমা পর্যবেক্ষণ — <span className="text-slate-200 font-mono font-bold">{complianceData?.date || "আজ"}</span></>
                ) : (
                  <>Surveillance reporting window monitoring for <span className="text-slate-200 font-mono font-bold">{complianceData?.date || "Today"}</span></>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top KPI Metrics Deck */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Total Facilities */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                {i18n.language === "bn" ? "প্রত্যাশিত প্রতিষ্ঠান" : "Expected Facilities"}
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {toBnNum(metrics.totalFacilities)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {i18n.language === "bn" ? "সক্রিয় নজরদারি" : "Active Surveillance"}
              </span>
            </div>

            {/* Overall Compliance */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
                {i18n.language === "bn" ? "কমপ্লায়েন্স হার" : "Compliance Rate"}
              </span>
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {toBnNum(metrics.complianceRate)}%
              </span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">
                {i18n.language === "bn" ? `${toBnNum(metrics.submittedCount)} প্রতিষ্ঠান জমা দিয়েছে` : `${metrics.submittedCount} Submitted`}
              </span>
            </div>

            {/* On-Time (<= 10:00 AM) */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block mb-1">
                {i18n.language === "bn" ? "সময়মতো (≤১০:০০)" : "On-Time (≤10:00 AM)"}
              </span>
              <span className="text-2xl font-black text-indigo-700 font-mono">
                {toBnNum(metrics.onTimeCount)}
              </span>
              <span className="text-[10px] text-indigo-600 block mt-0.5">
                {i18n.language === "bn" ? `মোটের ${toBnNum(metrics.onTimeRate)}%` : `${metrics.onTimeRate}% of total`}
              </span>
            </div>

            {/* Late (> 10:00 AM) */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block mb-1">
                {i18n.language === "bn" ? "দেরিতে জমাকৃত" : "Late Submissions"}
              </span>
              <span className="text-2xl font-black text-amber-700 font-mono">
                {toBnNum(metrics.lateCount)}
              </span>
              <span className="text-[10px] text-amber-600 block mt-0.5">
                {i18n.language === "bn" ? "সময়সীমা পরবর্তী" : "Post-Cutoff"}
              </span>
            </div>

            {/* Missed / Delinquent */}
            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block mb-1">
                {i18n.language === "bn" ? "অনুপস্থিত (জমাহীন)" : "Delinquent (Missed)"}
              </span>
              <span className="text-2xl font-black text-rose-700 font-mono">
                {toBnNum(metrics.missedCount)}
              </span>
              <span className="text-[10px] text-rose-600 block mt-0.5">
                {i18n.language === "bn" ? "রিপোর্ট পাওয়া যায়নি" : "Zero submission"}
              </span>
            </div>

            {/* Nil Reports */}
            <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block mb-1">
                {i18n.language === "bn" ? "শূন্য রিপোর্ট (Nil)" : "Nil Reports"}
              </span>
              <span className="text-2xl font-black text-teal-700 font-mono">
                {toBnNum(metrics.nilCount)}
              </span>
              <span className="text-[10px] text-teal-600 block mt-0.5">
                {i18n.language === "bn" ? "শূন্য কেস নিশ্চিত" : "Zero cases verified"}
              </span>
            </div>
          </div>

          {/* Division Breakdown Matrix */}
          <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              {i18n.language === "bn" ? "বিভাগীয় রিপোর্টিং কমপ্লায়েন্স কার্যক্ষমতা" : "Division Reporting Compliance Performance"}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {byDivision.map((div: any) => (
                <div key={div.division} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>{div.division}</span>
                    <span className={div.complianceRate >= 80 ? "text-emerald-600 font-black" : "text-amber-600 font-black"}>
                      {toBnNum(div.complianceRate)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>
                      {i18n.language === "bn" ? `${toBnNum(div.submitted)}/${toBnNum(div.total)} প্রেরিত` : `${div.submitted}/${div.total} sent`}
                    </span>
                    <span className="text-rose-500 font-semibold">
                      {i18n.language === "bn" ? `${toBnNum(div.missed)} অনুপস্থিত` : `${div.missed} missed`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {i18n.language === "bn" ? `সকল (${toBnNum(facilities.length)})` : `All (${facilities.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ON_TIME")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "ON_TIME" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {i18n.language === "bn" ? `সময়মতো (${toBnNum(metrics.onTimeCount)})` : `On-Time (${metrics.onTimeCount})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("LATE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "LATE" ? "bg-amber-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {i18n.language === "bn" ? `দেরিতে (${toBnNum(metrics.lateCount)})` : `Late (${metrics.lateCount})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("MISSED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "MISSED" ? "bg-rose-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {i18n.language === "bn" ? `অনুপস্থিত (${toBnNum(metrics.missedCount)})` : `Missed (${metrics.missedCount})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("NIL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "NIL" ? "bg-teal-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {i18n.language === "bn" ? `শূন্য (${toBnNum(metrics.nilCount)})` : `Nil (${metrics.nilCount})`}
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={i18n.language === "bn" ? "প্রতিষ্ঠান, কোড, জেলা খুঁজুন..." : "Search facility, code, district..."}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Detailed Facilities Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">{i18n.language === "bn" ? "প্রতিষ্ঠানের কোড ও নাম" : "Facility Code & Name"}</th>
                    <th className="px-4 py-3">{i18n.language === "bn" ? "প্রশাসনিক অঞ্চল" : "Administrative Zone"}</th>
                    <th className="px-4 py-3">{i18n.language === "bn" ? "প্রতিষ্ঠানের ধরন" : "Facility Type"}</th>
                    <th className="px-4 py-3">{i18n.language === "bn" ? "স্ট্যাটাস" : "Status"}</th>
                    <th className="px-4 py-3">{i18n.language === "bn" ? "জমার সময়" : "Submission Timestamp"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-medium">
                        {i18n.language === "bn" ? "স্বাস্থ্য প্রতিষ্ঠানের কমপ্লায়েন্স ম্যাট্রিক্স লোড হচ্ছে..." : "Loading facility compliance tracking matrix..."}
                      </td>
                    </tr>
                  ) : filteredFacilities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-medium">
                        {i18n.language === "bn" ? "বাছাইকৃত শর্তের সাথে কোন প্রতিষ্ঠান পাওয়া যায়নি।" : "No facilities match the selected criteria."}
                      </td>
                    </tr>
                  ) : (
                    filteredFacilities.map((f: any) => {
                      const isOnTime = f.status === "ON_TIME";
                      const isLate = f.status === "LATE";
                      const isMissed = f.status === "MISSED";

                      return (
                        <tr 
                          key={f.facilityId}
                          onClick={() => onSelectFacility && onSelectFacility(f.facilityId)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            <div className="font-bold">{f.facilityName}</div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {i18n.language === "bn" ? "কোড: " : "Code: "}{toBnNum(f.facilityCode)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-[11px]">
                            <div>{f.district}, {f.division}</div>
                            <span className="text-[10px] text-slate-400">{f.upazila || ""}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-[11px]">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-medium">
                              {f.facilityType || (i18n.language === "bn" ? "স্বাস্থ্য প্রতিষ্ঠান" : "Health Facility")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isOnTime && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {i18n.language === "bn" ? "সময়মতো" : "On-Time"}
                              </span>
                            )}
                            {isLate && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {i18n.language === "bn" 
                                  ? `দেরিতে (${f.submittedAt ? toBnNum(f.submittedAt.substring(11, 16)) : ""} BST)` 
                                  : `Late (${f.submittedAt ? f.submittedAt.substring(11, 16) : ""} BST)`}
                              </span>
                            )}
                            {isMissed && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px] font-black uppercase">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                {i18n.language === "bn" ? "অনুপস্থিত (Delinquent)" : "Missed (Delinquent)"}
                              </span>
                            )}
                            {f.isNilReport && (
                              <span className="ml-1 inline-flex items-center px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-[9px] font-bold uppercase">
                                {i18n.language === "bn" ? "শূন্য" : "Nil"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                            {f.submittedAt ? (
                              <span>{i18n.language === "bn" ? toBnNum(f.submittedAt.replace("T", " ").substring(0, 19)) : f.submittedAt.replace("T", " ").substring(0, 19)}</span>
                            ) : (
                              <span className="text-rose-400 font-bold italic">
                                {i18n.language === "bn" ? "জমা দেওয়া হয়নি" : "Not Submitted"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500">
            {i18n.language === "bn" ? (
              <><b>{toBnNum(facilities.length)}</b> টির মধ্যে <b>{toBnNum(filteredFacilities.length)}</b> টি প্রতিষ্ঠান প্রদর্শিত</>
            ) : (
              <>Showing <b>{filteredFacilities.length}</b> of <b>{facilities.length}</b> facilities</>
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
          >
            {i18n.language === "bn" ? "ট্র্যাকার বন্ধ করুন" : "Close Tracker"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
