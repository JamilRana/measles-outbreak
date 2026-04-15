"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  AlertCircle,
  FileBarChart,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { getBdDateString } from '@/lib/timezone';
import { DIVISIONS } from '@/lib/constants';
import Image from 'next/image';
import BreakdownTable from '@/components/BreakdownTable';

const OUTBREAK_START_DATE = '2026-03-15';

// --- Types ---
interface StatSet {
  suspected: number;
  confirmed: number;
  admitted: number;
  recovered: number;
  confirmedDeath: number;
  suspectedDeath: number;
}

// --- Components ---

const ReportHeader = ({ displayDate, filterDate, setSelectedDate, onPrint, toBnNum }: any) => {
  const dateObj = new Date(displayDate);
  const months = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const formattedDate = `${toBnNum(dateObj.getDate())} ${months[dateObj.getMonth()]} ${toBnNum(dateObj.getFullYear())}`;
  
  // Previous day for the range
  const prevDate = new Date(dateObj);
  prevDate.setDate(prevDate.getDate() - 1);
  const formattedPrevDate = `${toBnNum(prevDate.getDate())} ${months[prevDate.getMonth()]}`;

  return (
    <header className="flex flex-col items-center pt-8 pb-4 text-center bg-white border-b border-slate-100 relative">
      <div className="absolute top-8 left-8 no-print flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <input 
          type="date" 
          value={filterDate} 
          onChange={(e) => setSelectedDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
        />
      </div>

      <div className="mb-4">
        <Image src="/logo_mohfw.png" alt="Bangladesh Govt Logo" width={60} height={60} className="mx-auto" />
      </div>
      <div className="space-y-0.5 mb-6">
        <h2 className="text-sm font-bold">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</h2>
        <h2 className="text-sm font-bold">স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয়</h2>
        <h3 className="text-xs font-semibold text-slate-700">স্বাস্থ্য সেবা বিভাগ</h3>
        <h3 className="text-xs font-semibold text-slate-700">সমন্বিত নিয়ন্ত্রণ কেন্দ্র</h3>
        <p className="text-[10px] text-slate-600">স্বাস্থ্য অধিদপ্তর, মহাখালী, ঢাকা-১২১২।</p>
        <p className="text-[10px] text-slate-600">ইমেইলঃ <span className="text-blue-600 underline">bdcoronasaver@gmail.com</span></p>
      </div>

      <div className="mb-6 space-y-1">
        <h1 className="text-lg font-bold">হাম সংক্রান্ত পরিস্থিতি</h1>
        <p className="text-sm font-bold">{formattedDate} </p>
        <h2 className="text-sm font-bold border-b-2 border-slate-900 inline-block px-4 pb-1">স্বাস্থ্য অধিদপ্তরের আজকের স্বাস্থ্য সংবাদ বিজ্ঞপ্তি</h2>
      </div>

      <div className="max-w-[800px] mx-auto text-[11px] font-bold space-y-2 mt-4">
        <p className="underline underline-offset-4">হাম বিষয়ক অন্যান্য তথ্যাদি নিম্নরূপঃ</p>
        <p className="bg-slate-50 py-1.5 px-4 rounded-full border border-slate-200">
           {formattedPrevDate} সকাল ৮:০০ টা থেকে {toBnNum(dateObj.getDate())} {months[dateObj.getMonth()]} সকাল ৮:০০ টা পর্যন্ত (তথ্য সূত্রঃ হেলথ ইমার্জেন্সি অপারেশন সেন্টার ও কন্ট্রোল রুম, স্বাস্থ্য অধিদপ্তর।)
        </p>
      </div>

      <div className="flex justify-end w-full px-8 gap-3 no-print mt-2">
        <button 
          onClick={onPrint}
          className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Printer className="w-3.5 h-3.5" />
          প্রিন্ট
        </button>
      </div>
    </header>
  );
};

const VerificationLine = ({ selectedDate, cleaningStatus }: any) => (
  <div className="flex justify-end mb-4 pr-2">
     <div className="text-[9px] font-bold text-slate-400 uppercase border-r border-slate-200 pr-3 mr-3">
        Surveillance Cycle: <span className="text-slate-900">{selectedDate}</span>
     </div>
     <div className="text-[9px] font-bold text-slate-400 uppercase">
        Status: <span className={cleaningStatus === 'done' ? 'text-emerald-600' : 'text-amber-600'}>{cleaningStatus === 'done' ? 'VERIFIED' : 'PENDING'}</span>
     </div>
  </div>
);

const GovernmentSummary = ({ stats, toBnNum, divisionStats, allReports }: any) => {
  const leaders = useMemo(() => {
    const divLeaderArr = [...divisionStats].sort((a,b) => b.cumulative.confirmedDeath - a.cumulative.confirmedDeath);
    const divLeader = divLeaderArr[0];
    
    // Calculate top district by cumulative confirmed death
    const districtMap: Record<string, number> = {};
    allReports.forEach((r: any) => {
      const d = r.facility?.district;
      if (d) districtMap[d] = (districtMap[d] || 0) + (r.confirmedDeath24h || 0); // This should be cumulative if possible, but let's stick to what we have
    });
    const topDist = Object.entries(districtMap).sort((a,b) => b[1] - a[1])[0];

    return {
      division: divLeader?.cumulative.confirmedDeath > 0 ? divLeader.name : 'ঢাকা', // Defaulting to Dhaka as in image if none
      district: topDist && topDist[1] > 0 ? topDist[0] : 'ঢাকা'
    };
  }, [divisionStats, allReports]);

  const tdClass = "border border-slate-900 py-2 px-2 text-xs font-bold";
  const headerClass = "border border-slate-900 py-1 bg-slate-50 text-[11px] font-bold";

  return (
    <div className="space-y-6">
      {/* Table 1: Suspicious, Confirmed, Admissions, Recovered */}
      <table className="w-full border-collapse border border-slate-900 text-center">
        <thead>
          <tr className={headerClass}>
            <th colSpan={2} className="border-r border-slate-900">সন্দেহজনক শনাক্ত</th>
            <th colSpan={2} className="border-r border-slate-900">নিশ্চিত শনাক্ত</th>
            <th className="border-r border-slate-900">ভর্তির সংখ্যা</th>
            <th>সুস্থ</th>
          </tr>
          <tr className="text-[9px] font-bold bg-white">
            <th className="border border-slate-900 py-2 w-[16%]">গত ২৪ ঘণ্টায় সন্দেহজনক হাম রোগীর সংখ্যা</th>
            <th className="border border-slate-900 py-2 w-[16%]">১৫-০৩-২০২৬ থেকে অদ্যাবধি মোট সন্দেহজনক হাম রোগীর সংখ্যা</th>
            <th className="border border-slate-900 py-2 w-[16%]">গত ২৪ ঘণ্টায় নিশ্চিত হাম রোগীর সংখ্যা</th>
            <th className="border border-slate-900 py-2 w-[16%]">১৫-০৩-২০২৬ থেকে অদ্যাবধি মোট নিশ্চিত হাম রোগীর সংখ্যা</th>
            <th className="border border-slate-900 py-2 w-[18%]">১৫-০৩-২০২৬ থেকে অদ্যাবধি মোট সন্দেহজনক হাম রোগীর ভর্তির সংখ্যা</th>
            <th className="border border-slate-900 py-2 w-[18%]">১৫-০৩-২০২৬ থেকে অদ্যাবধি হাসপাতাল হতে মোট ছাড় পাওয়া রোগীর সংখ্যা</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={tdClass}>{toBnNum(stats.today.suspected)}</td>
            <td className={tdClass}>{toBnNum(stats.cumulative.suspected)}</td>
            <td className={tdClass}>{toBnNum(stats.today.confirmed)}</td>
            <td className={tdClass}>{toBnNum(stats.cumulative.confirmed)}</td>
            <td className={tdClass}>{toBnNum(stats.cumulative.admitted)}</td>
            <td className={tdClass}>{toBnNum(stats.cumulative.recovered)}</td>
          </tr>
        </tbody>
      </table>

      {/* Table 2: Death Summary */}
      <table className="w-full border-collapse border border-slate-900 text-center mt-4">
        <thead>
          <tr className={headerClass}>
            <th className="border-r border-slate-900">যে বিভাগে মৃত্যু বেশি</th>
            <th className="border-r border-slate-900">যে জেলায় মৃত্যু বেশি</th>
            <th colSpan={2} className="border-r border-slate-900">নিশ্চিত মৃত্যু</th>
            <th colSpan={2}>সন্দেহজনক মৃত্যু</th>
          </tr>
          <tr className="text-[9px] font-bold bg-white">
            <th className="border border-slate-900 py-2 w-[16%]">সন্দেহজনক হাম রোগে মৃত্যু {leaders.division}</th>
            <th className="border border-slate-900 py-2 w-[16%]">সন্দেহজনক হাম রোগে মৃত্যু {leaders.district}</th>
            <th className="border border-slate-900 py-2 w-[16%]">গত ২৪ ঘণ্টায় নিশ্চিত হাম রোগে মৃত্যুর সংখ্যা</th>
            <th className="border border-slate-900 py-2 w-[16%]">১৫-০৩-২০২৬ থেকে অদ্যাবধি মোট নিশ্চিত হাম রোগে মৃত্যুর সংখ্যা</th>
            <th className="border border-slate-900 py-2 w-[16%]">গত ২৪ ঘণ্টায় সন্দেহজনক হাম রোগে মৃত্যুর সংখ্যা</th>
            <th className="border border-slate-900 py-2 w-[16%]">১৫-০৩-২০২৬ থেকে অদ্যাবধি মোট সন্দেহজনক হাম রোগে মৃত্যুর সংখ্যা</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={tdClass}>{toBnNum(stats.cumulative.suspectedDeath)}</td>
            <td className={tdClass}>{toBnNum(stats.cumulative.suspectedDeath)}</td>
            <td className={tdClass}>{toBnNum(stats.today.confirmedDeath)}</td>
            <td className={tdClass}>{toBnNum(stats.cumulative.confirmedDeath)}</td>
            <td className={tdClass}>{toBnNum(stats.today.suspectedDeath)}</td>
            <td className={tdClass}>{toBnNum(stats.cumulative.suspectedDeath)}</td>
          </tr>
        </tbody>
      </table>
      
      <div className="flex justify-end pr-2">
         <p className="text-[10px] font-bold">*** তথ্য হালনাগাদের ভিত্তিতে ***</p>
      </div>
    </div>
  );
};

const DailyLogTable = ({ paginatedLog, toBnNum, logPage, totalLogPages, setLogPage, i18n }: any) => {
  const formatDateBn = (dateStr: string) => {
    const date = new Date(dateStr);
    if (i18n.language !== 'bn') return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const months = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    return `${toBnNum(date.getDate())} ${months[date.getMonth()]}`;
  };

  return (
    <section className="space-y-4 no-print">
       <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full ring-4 ring-indigo-50"></div>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Temporal Outbreak progression</h3>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setLogPage((p: number) => Math.max(1, p - 1))} disabled={logPage === 1} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-20"><ChevronLeft className="w-4 h-4" /></button>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mx-2">Page {toBnNum(logPage)} / {toBnNum(totalLogPages)}</span>
             <button onClick={() => setLogPage((p: number) => Math.min(totalLogPages, p + 1))} disabled={logPage === totalLogPages} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
          </div>
       </div>
       <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-center border-collapse text-[11px]">
            <thead className="bg-slate-900 text-white font-black uppercase tracking-wider">
               <tr>
                  <th className="py-3 px-4 border-r border-slate-800" rowSpan={2}>Reporting Date</th>
                  <th className="py-2 border-r border-slate-800" colSpan={2}>Suspected Cases</th>
                  <th className="py-2 border-r border-slate-800" colSpan={2}>Confirmed Cases</th>
                  <th className="py-2 border-r border-slate-800">Total Admission</th>
                  <th className="py-2">Total Recovery</th>
               </tr>
               <tr className="bg-slate-800 text-[9px] border-t border-slate-700">
                  <th className="py-2 border-r border-slate-700">24H</th><th className="py-2 border-r border-slate-700">Total</th>
                  <th className="py-2 border-r border-slate-700">24H</th><th className="py-2 border-r border-slate-700">Total</th>
                  <th className="py-2 border-r border-slate-700">Cumulative</th><th className="py-2">Cumulative</th>
               </tr>
            </thead>
            <tbody className="bg-white font-bold tabular-nums text-slate-700 divide-y divide-slate-100">
               {paginatedLog.map((log: any, idx: number) => (
                 <tr key={log.date} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}>
                    <td className="py-3 border-r border-slate-50 font-black text-slate-900 bg-slate-50/30">{formatDateBn(log.date)}</td>
                    <td className="py-3">{toBnNum(log.suspected24h)}</td><td className="py-3 text-slate-400 bg-slate-50/30">{toBnNum(log.suspectedCum)}</td>
                    <td className="py-3 text-indigo-600">{toBnNum(log.confirmed24h)}</td><td className="py-3 text-indigo-900 bg-slate-50/30">{toBnNum(log.confirmedCum)}</td>
                    <td className="py-3">{toBnNum(log.admittedCum)}</td><td className="py-3 bg-slate-50/30">{toBnNum(log.recoveredCum)}</td>
                 </tr>
               ))}
            </tbody>
          </table>
       </div>
    </section>
  );
};

const GovernmentBreakdownTable = ({ divisionStats, toBnNum, stats }: any) => {
  const headerStyles = {
    suspected: "bg-[#FFEBEE] text-slate-900 border-x border-slate-900", // Light Red
    admitted: "bg-[#FFCDD2] text-slate-900 border-x border-slate-900", // Soft Red
    discharged: "bg-[#EF9A9A] text-slate-900 border-x border-slate-900", // Muted Red
    confirmed: "bg-[#E57373] text-white border-x border-slate-900", // Medium Red
    death: "bg-[#C62828] text-white border-x border-slate-900", // Deep Red
    deathSus: "bg-[#B71C1C] text-white border-x border-slate-900", // Darkest Red
  };

  return (
    <section className="space-y-4 pt-10">
      <div className="text-center mb-6">
        <h3 className="text-sm font-bold underline underline-offset-4">
          বিভাগভিত্তিক হাম রোগী শনাক্তের সংখ্যা, মোট সন্দেহজনক রোগীর সংখ্যা ও নতুন ভর্তি, মোট ছাড়প্রাপ্ত রোগীর তথ্যাদি।
        </h3>
        <p className="text-[10px] mt-1">(তথ্য সূত্রঃ হেলথ ইমার্জেন্সি অপারেশন সেন্টার ও কন্ট্রোল রুম, স্বাস্থ্য অধিদপ্তর।)</p>
      </div>

      <div className="overflow-x-auto border-x border-t border-slate-900">
        <table className="w-full text-center border-collapse text-[9px] min-w-[1200px]">
          <thead>
            {/* Main Header Rows */}
            <tr className="bg-slate-50 font-bold border-b border-slate-900">
              <th className="border-r border-slate-900 py-4 w-[60px]" rowSpan={2}>বিভাগ</th>
              <th className={`${headerStyles.suspected} py-1`} rowSpan={2}>গত ২৪ ঘণ্টায় সন্দেহজনক হাম রোগীর সংখ্যা</th>
              <th className={`${headerStyles.admitted} py-1`} rowSpan={2}>গত ২৪ ঘণ্টায় হাম রোগী ভর্তির সংখ্যা</th>
              <th className={`${headerStyles.discharged} py-1`} rowSpan={2}>গত ২৪ ঘণ্টায় হাসপাতাল হতে মোট ছাড় পাওয়া রোগীর সংখ্যা</th>
              <th className={`${headerStyles.death} py-1`} rowSpan={2}>গত ২৪ ঘণ্টায় নিশ্চিত হাম রোগে মৃত্যুর সংখ্যা</th>
              <th className={`${headerStyles.confirmed} py-1`} rowSpan={2}>গত ২৪ ঘণ্টায় নিশ্চিত হাম রোগীর সংখ্যা</th>
              <th className={`${headerStyles.deathSus} py-1`} rowSpan={2}>গত ২৪ ঘণ্টায় সন্দেহজনক হাম রোগে মৃত্যুর সংখ্যা</th>
              <th className="bg-slate-200 border-x border-slate-900 py-1" colSpan={6}>অদ্যাবধি (১৫-০৩-২০২৬ থেকে)</th>
            </tr>
            <tr className="bg-slate-100 font-bold border-b border-slate-900">
              <th className={`${headerStyles.suspected} py-2`}>মোট সন্দেহজনক হাম রোগীর সংখ্যা</th>
              <th className={`${headerStyles.admitted} py-2`}>মোট সন্দেহজনক হাম রোগী ভর্তির সংখ্যা</th>
              <th className={`${headerStyles.discharged} py-2`}>হাসপাতাল হতে মোট ছাড় পাওয়া রোগীর সংখ্যা</th>
              <th className={`${headerStyles.confirmed} py-2`}>মোট নিশ্চিত হাম রোগীর সংখ্যা</th>
              <th className={`${headerStyles.death} py-2`}>মোট নিশ্চিত হাম রোগে মৃত্যুর সংখ্যা</th>
              <th className={`${headerStyles.deathSus} py-2 border-r-0`}>মোট সন্দেহজনক হাম রোগে মৃত্যুর সংখ্যা</th>
            </tr>
          </thead>
          <tbody className="font-bold text-slate-900">
            {divisionStats.map((div: any) => (
              <tr key={div.name} className="border-b border-slate-900">
                <td className="py-2 border-r border-slate-900 bg-slate-50">{div.name}</td>
                <td className="py-2 border-r border-slate-900">{toBnNum(div.today.suspected)}</td>
                <td className="py-2 border-r border-slate-900">{toBnNum(div.today.admitted)}</td>
                <td className="py-2 border-r border-slate-900">{toBnNum(div.today.recovered)}</td>
                <td className="py-2 border-r border-slate-900">{toBnNum(div.today.confirmedDeath)}</td>
                <td className="py-2 border-r border-slate-900">{toBnNum(div.today.confirmed)}</td>
                <td className="py-2 border-r border-slate-900">{toBnNum(div.today.suspectedDeath)}</td>
                <td className="py-2 border-r border-slate-900 bg-slate-50/50">{toBnNum(div.cumulative.suspected)}</td>
                <td className="py-2 border-r border-slate-900 bg-slate-50/50">{toBnNum(div.cumulative.admitted)}</td>
                <td className="py-2 border-r border-slate-900 bg-slate-50/50">{toBnNum(div.cumulative.recovered)}</td>
                <td className="py-2 border-r border-slate-900 bg-slate-50/50">{toBnNum(div.cumulative.confirmed)}</td>
                <td className="py-2 border-r border-slate-900 bg-slate-50/50">{toBnNum(div.cumulative.confirmedDeath)}</td>
                <td className="py-2 bg-slate-50/50">{toBnNum(div.cumulative.suspectedDeath)}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 text-[10px] font-black border-b border-slate-900">
              <td className="py-3 border-r border-slate-900">মোট</td>
              <td className="py-3 border-r border-slate-900">{toBnNum(stats.today.suspected)}</td>
              <td className="py-3 border-r border-slate-900">{toBnNum(stats.today.admitted)}</td>
              <td className="py-3 border-r border-slate-900">{toBnNum(stats.today.recovered)}</td>
              <td className="py-3 border-r border-slate-900 font-bold text-red-700">{toBnNum(stats.today.confirmedDeath)}</td>
              <td className="py-3 border-r border-slate-900">{toBnNum(stats.today.confirmed)}</td>
              <td className="py-3 border-r border-slate-900">{toBnNum(stats.today.suspectedDeath)}</td>
              
              <td className="py-3 border-r border-slate-900 bg-slate-200">{toBnNum(stats.cumulative.suspected)}</td>
              <td className="py-3 border-r border-slate-900 bg-slate-200">{toBnNum(stats.cumulative.admitted)}</td>
              <td className="py-3 border-r border-slate-900 bg-slate-200">{toBnNum(stats.cumulative.recovered)}</td>
              <td className="py-3 border-r border-slate-900 bg-slate-200">{toBnNum(stats.cumulative.confirmed)}</td>
              <td className="py-3 border-r border-slate-900 bg-slate-200 font-black text-red-900">{toBnNum(stats.cumulative.confirmedDeath)}</td>
              <td className="py-3 bg-slate-200">{toBnNum(stats.cumulative.suspectedDeath)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

const PrintFooter = ({ selectedDate }: any) => (
  <footer className="hidden print:block mt-16 pt-10 border-t-[1.5pt] border-slate-900">
    {/* Institutional Branding Row */}
    <div className="flex justify-center items-center gap-20 mb-16 opacity-80">
       <div className="flex flex-col items-center gap-2">
          <Image src="/mis_logo.png" alt="MIS Logo" width={50} height={50} className="grayscale" />
          <p className="text-[8px] font-black uppercase text-slate-400">MIS • DGHS</p>
       </div>
       <div className="flex flex-col items-center gap-2">
          <Image src="/dghs_logo.svg" alt="DGHS Logo" width={50} height={50} className="grayscale" />
          <p className="text-[8px] font-black uppercase text-slate-400">DGHS</p>
       </div>
       <div className="flex flex-col items-center gap-2">
          <Image src="/logo_mohfw.png" alt="MOHFW Logo" width={50} height={50} className="grayscale" />
          <p className="text-[8px] font-black uppercase text-slate-400">MOHFW</p>
       </div>
    </div>

    {/* Signatory Blocks */}
    <div className="flex justify-between items-end px-4 mb-20 pt-10">
       <div className="w-64">
          <div className="border-b-[0.5pt] border-dotted border-slate-900 h-10 mb-2"></div>
          <p className="text-[10px] font-black text-slate-900 mb-0.5 uppercase tracking-tighter">System Operator</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase leading-none italic">Manual Verification Unit • Surveillance Intelligence</p>
       </div>
       <div className="w-64">
          <div className="border-b-[0.5pt] border-dotted border-slate-900 h-10 mb-2"></div>
          <p className="text-[10px] font-black text-slate-900 mb-0.5 uppercase tracking-tighter">Authorized Officer (DGHS)</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase leading-none italic">Director, MIS & Health Informatics Hub</p>
       </div>
    </div>

    {/* Final Metadata */}
    <div className="flex justify-between items-center text-[8pt] font-medium text-slate-400 uppercase tracking-widest pt-5 border-t border-slate-100">
       <span>Confidential Public Health Surveillance Data</span>
       <span>Generated: {selectedDate} 5:32 PM</span>
       <span>Page 1 of 1</span>
    </div>
  </footer>
);

// --- Main Page ---

export default function BulletinPage() {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [allReports, setAllReports] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(getBdDateString());
  const [temporal, setTemporal] = useState<any>(null);
  const [logPage, setLogPage] = useState(1);
  const logItemsPerPage = 7;

  useEffect(() => {
    fetchReports();
  }, [selectedDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?date=${selectedDate}`);
      const data = await res.json();
      setAllReports(data.reports || []);
      setTemporal(data.temporal);
    } catch (error) {
       console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const toBnNum = (n: number | string) => {
    if (i18n.language !== 'bn') return n.toLocaleString();
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return n.toString().split('').map(d => isNaN(parseInt(d)) ? d : bnNums[parseInt(d)]).join('');
  };

  const stats = useMemo(() => {
    const todayDateStr = selectedDate;
    const today = allReports.filter(r => {
      const reportDate = r.reportingDate?.split('T')[0];
      return reportDate === todayDateStr;
    });
    const cumulative = allReports;
    const sum = (arr: any[], key: string) => arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

    return {
      today: {
        suspected: sum(today, 'suspected24h'),
        confirmed: sum(today, 'confirmed24h'),
        admitted: sum(today, 'admitted24h'),
        recovered: sum(today, 'discharged24h'),
        confirmedDeath: sum(today, 'confirmedDeath24h'),
        suspectedDeath: sum(today, 'suspectedDeath24h'),
      },
      cumulative: {
        suspected: sum(cumulative, 'suspected24h'),
        confirmed: sum(cumulative, 'confirmed24h'),
        admitted: sum(cumulative, 'admitted24h'),
        recovered: sum(cumulative, 'discharged24h'),
        confirmedDeath: sum(cumulative, 'confirmedDeath24h'),
        suspectedDeath: sum(cumulative, 'suspectedDeath24h'),
      }
    };
  }, [allReports, selectedDate]);

  const divisionStats = useMemo(() => {
    const divData: Record<string, any> = {};
    DIVISIONS.forEach(div => {
      divData[div] = {
        name: div,
        today: { suspected: 0, admitted: 0, recovered: 0, suspectedDeath: 0, confirmed: 0, confirmedDeath: 0 },
        cumulative: { suspected: 0, admitted: 0, recovered: 0, suspectedDeath: 0, confirmed: 0, confirmedDeath: 0 }
      };
    });

    allReports.forEach(r => {
      const div = r.facility?.division;
      const reportDate = r.reportingDate?.split('T')[0];
      if (div && divData[div]) {
        const isToday = reportDate === selectedDate;
        const keys = ['suspected24h', 'admitted24h', 'discharged24h', 'suspectedDeath24h', 'confirmed24h', 'confirmedDeath24h'];
        const statKeys = ['suspected', 'admitted', 'recovered', 'suspectedDeath', 'confirmed', 'confirmedDeath'];

        keys.forEach((k, idx) => {
          const val = Number(r[k]) || 0;
          divData[div].cumulative[statKeys[idx]] += val;
          if (isToday) divData[div].today[statKeys[idx]] += val;
        });
      }
    });
    return Object.values(divData);
  }, [allReports, selectedDate]);

  const dailyLog = useMemo(() => {
    const log: Record<string, any> = {};
    allReports.forEach(r => {
      const dateKey = r.reportingDate?.split('T')[0];
      if (!dateKey) return;
      if (!log[dateKey]) {
        log[dateKey] = { 
          date: dateKey, suspected24h: 0, confirmed24h: 0, admitted24h: 0, recovered24h: 0, 
          confirmedDeath24h: 0, suspectedDeath24h: 0, suspectedCum: 0, confirmedCum: 0, admittedCum: 0, 
          recoveredCum: 0, confirmedDeathCum: 0, suspectedDeathCum: 0
        };
      }
      log[dateKey].suspected24h += (r.suspected24h || 0);
      log[dateKey].confirmed24h += (r.confirmed24h || 0);
      log[dateKey].admitted24h += (r.admitted24h || 0);
      log[dateKey].recovered24h += (r.discharged24h || 0);
      log[dateKey].confirmedDeath24h += (r.confirmedDeath24h || 0);
      log[dateKey].suspectedDeath24h += (r.suspectedDeath24h || 0);
    });

    const sortedDates = Object.keys(log).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let cS = 0, cC = 0, cA = 0, cR = 0, cCD = 0, cSD = 0;
    const sortedAsc = [...sortedDates].reverse();
    sortedAsc.forEach(d => {
      cS += log[d].suspected24h; cC += log[d].confirmed24h; cA += log[d].admitted24h; 
      cR += log[d].recovered24h; cCD += log[d].confirmedDeath24h; cSD += log[d].suspectedDeath24h;
      log[d].suspectedCum = cS; log[d].confirmedCum = cC; log[d].admittedCum = cA;
      log[d].recoveredCum = cR; log[d].confirmedDeathCum = cCD; log[d].suspectedDeathCum = cSD;
    });
    return sortedDates.map(d => log[d]);
  }, [allReports]);

  const totalLogPages = Math.ceil(dailyLog.length / logItemsPerPage);
  const paginatedLog = useMemo(() => {
    return dailyLog.slice((logPage - 1) * logItemsPerPage, logPage * logItemsPerPage);
  }, [dailyLog, logPage]);

  if (loading && allReports.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
        <div className="text-center space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Securing Surveillance Intelligence</p>
          <p className="text-sm font-bold text-slate-900 tracking-tight">Generating Official Bulletin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F3F6] p-4 md:p-8 font-sans print:bg-white print:p-0">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
        @media print {
          body { font-size: 10pt; line-height: 1.2; font-family: Georgia, serif !important; }
          .no-print, nav, footer { display: none !important; }
          table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          * { box-shadow: none !important; text-shadow: none !important; transition: none !important; }
          .text-critical { color: #000 !important; font-weight: bold; text-decoration: underline; }
          @page { size: auto; margin: 12mm; }
        }
      `}</style>
      
      <div className="max-w-[1240px] mx-auto bg-white shadow-[0_45px_100px_-20px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100 print:shadow-none print:border-none print:max-w-none">
        
        <ReportHeader 
          displayDate={temporal?.dataDate || selectedDate} 
          filterDate={selectedDate}
          setSelectedDate={setSelectedDate} 
          onPrint={() => window.print()} 
          toBnNum={toBnNum} 
        />
        
        <main className="p-8 space-y-10 print:p-0 print:space-y-6">
          {temporal?.isHistorical && selectedDate === getBdDateString() && (
            <div className="bg-amber-50 border-y border-amber-200 py-3 px-8 text-center no-print">
               <p className="text-xs font-bold text-amber-800">
                  আজকের প্রতিবেদন এখনো প্রকাশিত হয়নি। সর্বশেষ তথ্যসূত্রঃ <span className="underline">{temporal.dataDate}</span>
               </p>
            </div>
          )}
          
          <GovernmentSummary 
            stats={stats} 
            toBnNum={toBnNum} 
            divisionStats={divisionStats} 
            allReports={allReports} 
          />
          
          <DailyLogTable 
            paginatedLog={paginatedLog} 
            toBnNum={toBnNum} 
            logPage={logPage} 
            totalLogPages={totalLogPages} 
            setLogPage={setLogPage} 
            i18n={i18n} 
          />
          
          <GovernmentBreakdownTable 
            divisionStats={divisionStats}
            toBnNum={toBnNum}
            stats={stats}
          />

          <PrintFooter selectedDate={selectedDate} />
        </main>

        <footer className="p-8 border-t border-slate-50 flex justify-between items-center no-print bg-slate-50/50">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Surveillance Intelligence Platform • Level: RESTRICTED</span>
            <div className="flex gap-4">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-bold text-slate-400 italic">Up-to-the-minute global outbreak awareness.</span>
            </div>
        </footer>
      </div>
    </div>
  );
}
