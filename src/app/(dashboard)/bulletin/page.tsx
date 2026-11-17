"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  AlertCircle,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getBdDateString } from '@/lib/timezone';
import { DIVISIONS } from '@/lib/constants';
import Image from 'next/image';

const OUTBREAK_START_DATE = '2026-04-10';

// --- Types ---
interface StatSet {
  suspected: number;
  confirmed: number;
  admitted: number;
  recovered: number;
  confirmedDeath: number;
  suspectedDeath: number;
}

const nameTranslations: Record<string, string> = {
  // Divisions
  'Barisal': 'বরিশাল',
  'Chattogram': 'চট্টগ্রাম',
  'Dhaka': 'ঢাকা',
  'Khulna': 'খুলনা',
  'Mymensingh': 'ময়মনসিংহ',
  'Rajshahi': 'রাজশাহী',
  'Rangpur': 'রংপুর',
  'Sylhet': 'সিলেট',
  // Districts
  'Barguna': 'বরগুনা',
  'Bhola': 'ভোলা',
  'Jhalakathi': 'ঝালকাঠি',
  'Patuakhali': 'পটুয়াখালী',
  'Pirojpur': 'পিরোজপুর',
  'Bandarban': 'বান্দরবান',
  'Brahmanbaria': 'ব্রাহ্মণবাড়িয়া',
  'Chandpur': 'চাঁদপুর',
  "Cox's Bazar": 'কক্সবাজার',
  'Cumilla': 'কুমিল্লা',
  'Khagrachhari': 'খাগড়াছড়ি',
  'Lakshmipur': 'লক্ষ্মীপুর',
  'Noakhali': 'নোয়াখালী',
  'Rangamati': 'রাঙ্গামাটি',
  'Feni': 'ফেনী',
  'Faridpur': 'ফরিদপুর',
  'Gazipur': 'গাজীপুর',
  'Gopalganj': 'গোপালগঞ্জ',
  'Kishoreganj': 'কিশোরগঞ্জ',
  'Madaripur': 'মাদারীপুর',
  'Manikganj': 'মানিকগঞ্জ',
  'Munshiganj': 'মুন্সীগঞ্জ',
  'Narayanganj': 'নারায়ণগঞ্জ',
  'Narsingdi': 'নরসিংদী',
  'Rajbari': 'রাজবাড়ী',
  'Shariatpur': 'শরীয়তপুর',
  'Tangail': 'টাঙ্গাইল',
  'Bagerhat': 'বাগেরহাট',
  'Chuadanga': 'চুয়াডাঙ্গা',
  'Jashore': 'যশোর',
  'Jhenaidah': 'ঝিনাইদহ',
  'Kushtia': 'কুষ্টিয়া',
  'Magura': 'মাগুরা',
  'Meherpur': 'মেহেরপুর',
  'Narail': 'নড়াইল',
  'Satkhira': 'সাতক্ষীরা',
  'Jamalpur': 'জামালপুর',
  'Netrokona': 'নেত্রকোনা',
  'Sherpur': 'শেরপুর',
  'Bogura': 'বগুড়া',
  'Chapainawabganj': 'চাঁপাইনবাবগঞ্জ',
  'Joypurhat': 'জয়পুরহাট',
  'Naogaon': 'নওগাঁ',
  'Natore': 'নাটোর',
  'Pabna': 'পাবনা',
  'Sirajganj': 'সিরাজগঞ্জ',
  'Dinajpur': 'দিনাজপুর',
  'Gaibandha': 'গাইবান্ধা',
  'Kurigram': 'কুড়িগ্রাম',
  'Lalmonirhat': 'লালমনিরহাট',
  'Nilphamari': 'নীলফামারী',
  'Panchagarh': 'পঞ্চগড়',
  'Thakurgaon': 'ঠাকুরগাঁও',
  'Habiganj': 'হবিগঞ্জ',
  'Moulvibazar': 'মৌলভীবাজার',
  'Sunamganj': 'সুনামগঞ্জ',
};

const nameTranslationsNormalized = Object.keys(nameTranslations).reduce((acc, key) => {
  acc[key.toLowerCase()] = nameTranslations[key];
  return acc;
}, {} as Record<string, string>);

const translateName = (name: string, lang: string) => {
  if (!name) return '';
  if (lang && lang.startsWith('bn')) {
    const key = name.toLowerCase().trim();
    return nameTranslationsNormalized[key] || name;
  }
  return name;
};

// --- Components ---

const ReportHeader = ({ displayDate, filterDate, setSelectedDate, onPrint, toBnNum }: any) => {
  const { t, i18n } = useTranslation();
  const dateObj = new Date(displayDate);
  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const formattedDate = i18n.language.startsWith('bn')
    ? `${toBnNum(dateObj.getDate(), true)} ${t(`bulletin.months.${monthKeys[dateObj.getMonth()]}`)} ${toBnNum(dateObj.getFullYear(), true)}`
    : dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  // Previous day for the range
  const prevDate = new Date(dateObj);
  prevDate.setDate(prevDate.getDate() - 1);

  const formattedPrevDate = i18n.language.startsWith('bn')
    ? `${toBnNum(prevDate.getDate(), true)} ${t(`bulletin.months.${monthKeys[prevDate.getMonth()]}`)}`
    : prevDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });

  return (
    <header className="flex flex-col items-center pt-8 pb-4 print:pt-1 print:pb-0 text-center bg-white border-b border-slate-100 relative">
      <div className="absolute top-8 left-8 no-print flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          min="2026-04-10"
          max={new Date().toISOString().split('T')[0]}
          className="bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
        />
      </div>

      <div className="mb-4 print:mb-1">
        <Image src="/logo_mohfw.png" alt="Bangladesh Govt Logo" width={60} height={60} className="mx-auto print:w-8 print:h-8" />
      </div>
      <div className="space-y-0.5 mb-6 print:mb-1">
        <h2 className="text-sm print:text-[10px] font-bold">{t('bulletin.governmentTitle')}</h2>
        <h2 className="text-sm print:text-[10px] font-bold">{t('bulletin.ministryTitle')}</h2>
        <h3 className="text-xs print:text-[9px] font-semibold text-slate-700">{t('bulletin.divisionTitle')}</h3>
        <h3 className="text-xs print:text-[9px] font-semibold text-slate-700">{t('bulletin.centerTitle')}</h3>
        <p className="text-[10px] text-slate-600">{t('bulletin.dghsAddress')}</p>
        <p className="text-[10px] text-slate-600">
          {t('bulletin.emailLabel')} <span className="text-blue-600 underline">bdcoronasaver@gmail.com</span>
        </p>
      </div>

      <div className="mb-6 print:mb-1 space-y-1">
        <h1 className="text-lg print:text-base font-bold">{t('bulletin.situationReport')}</h1>
        <p className="text-sm font-bold">{toBnNum(formattedDate)}</p>
        <h2 className="text-sm print:text-xs font-bold border-b-2 border-slate-900 inline-block px-4 pb-1 print:pb-0">
          {t('bulletin.dailyBulletinTitle')}
        </h2>
      </div>

      <div className="max-w-[800px] mx-auto text-[11px] print:text-[10px] font-bold space-y-2 print:space-y-0 mt-4 print:mt-0">
        <p className="underline underline-offset-4">{t('bulletin.otherInfoTitle')}</p>
        <p className="bg-slate-50 py-1.5 px-4 rounded-full border border-slate-200">
          {t('bulletin.timeRangeText', { prevDate: formattedPrevDate, currentDate: formattedDate })}
        </p>
      </div>

      <div className="flex justify-end w-full px-8 gap-3 no-print mt-2">
        <button
          onClick={onPrint}
          className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Printer className="w-3.5 h-3.5" />
          {t('bulletin.printButton')}
        </button>
      </div>
    </header>
  );
};

const GovernmentSummary = ({ stats, toBnNum, leaders }: any) => {
  const { t, i18n } = useTranslation();
  const tdClass = "border border-slate-900 py-2 print:py-1 px-2 text-xs print:text-[10px] font-bold";
  const headerClass = "border border-slate-900 py-1 bg-slate-50 text-[11px] print:text-[9px] font-bold";

  return (
    <div className="space-y-6 print:space-y-1">
      {/* Table 1: Suspicious, Confirmed, Admissions, Recovered */}
      <table className="w-full border-collapse border border-slate-900 text-center">
        <thead>
          <tr className={headerClass}>
            <th colSpan={2} className="border-r border-slate-900">{t('bulletin.suspectedDetection')}</th>
            <th colSpan={2} className="border-r border-slate-900">{t('bulletin.confirmedDetection')}</th>
            <th className="border-r border-slate-900">{t('bulletin.hospitalAdmissions')}</th>
            <th>{t('bulletin.recoveredLabel')}</th>
          </tr>
          <tr className="text-[9px] print:text-[8px] font-bold bg-white">
            <th className="border border-slate-900 py-2 print:py-1 w-[16%]">{t('bulletin.suspected24hDesc')}</th>
            <th className="border border-slate-900 py-2 print:py-1 w-[16%]">{t('bulletin.suspectedTotalDesc')}</th>
            <th className="border border-slate-900 py-2 print:py-1 w-[16%]">{t('bulletin.confirmed24hDesc')}</th>
            <th className="border border-slate-900 py-2 print:py-1 w-[16%]">{t('bulletin.confirmedTotalDesc')}</th>
            <th className="border border-slate-900 py-2 print:py-1 w-[18%]">{t('bulletin.admittedTotalDesc')}</th>
            <th className="border border-slate-900 py-2 print:py-1 w-[18%]">{t('bulletin.dischargedTotalDesc')}</th>
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
            <th className="border-r border-slate-900">{t('bulletin.highestDeathDivision')}</th>
            <th className="border-r border-slate-900">{t('bulletin.highestDeathDistrict')}</th>
            <th colSpan={2} className="border-r border-slate-900">{t('bulletin.confirmedDeaths')}</th>
            <th colSpan={2}>{t('bulletin.suspectedDeaths')}</th>
          </tr>
          <tr className="text-[9px] print:text-[8px] font-bold bg-white">
            <th className="border border-slate-900 py-2 print:py-1 w-[16%]">
              {t('bulletin.suspectedDeathIn')} <strong>{translateName(leaders.division, i18n.language)}</strong>
            </th>
            <th className="border border-slate-900 py-2 print:py-1 w-[16%]">
              {t('bulletin.suspectedDeathIn')} <strong>{translateName(leaders.district, i18n.language)}</strong>
            </th>
            <th className="border border-slate-900 py-2 print:py-1 w-[16%]">{t('bulletin.confirmedDeaths24h')}</th>
            <th className="border border-slate-900 py-2 print:py-1 w-[16%]">{t('bulletin.confirmedDeathsTotal')}</th>
            <th className="border border-slate-900 py-2 print:py-1 w-[16%]">{t('bulletin.suspectedDeaths24h')}</th>
            <th className="border border-slate-900 py-2 print:py-1 w-[16%]">{t('bulletin.suspectedDeathsTotal')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={tdClass}>{toBnNum(leaders.divisionDeaths)}</td>
            <td className={tdClass}>{toBnNum(leaders.districtDeaths)}</td>
            <td className={tdClass}>{toBnNum(stats.today.confirmedDeath)}</td>
            <td className={tdClass}>{toBnNum(stats.cumulative.confirmedDeath)}</td>
            <td className={tdClass}>{toBnNum(stats.today.suspectedDeath)}</td>
            <td className={tdClass}>{toBnNum(stats.cumulative.suspectedDeath)}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end pr-2 print:pr-0 mt-2 print:mt-0">
        <p className="text-[10px] print:text-[8px] font-bold">{t('bulletin.basedOnUpdates')}</p>
      </div>
    </div>
  );
};

const DailyLogTable = ({ paginatedLog, toBnNum, logPage, totalLogPages, setLogPage }: any) => {
  const { t, i18n } = useTranslation();

  const formatDateBn = (dateStr: string) => {
    const date = new Date(dateStr);
    if (!i18n.language.startsWith('bn')) {
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }
    const months = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
    return `${toBnNum(date.getDate(), true)} ${months[date.getMonth()]}`;
  };

  return (
    <section className="space-y-4 no-print">
      <div className="flex items-center justify-between border-b pb-3 border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full ring-4 ring-indigo-50"></div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">
            {t('bulletin.temporalProgression')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLogPage((p: number) => Math.max(1, p - 1))} disabled={logPage === 1} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-20"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mx-2">
            {t('bulletin.pageInfo', { page: toBnNum(logPage), totalPages: toBnNum(totalLogPages) })}
          </span>
          <button onClick={() => setLogPage((p: number) => Math.min(totalLogPages, p + 1))} disabled={logPage === totalLogPages} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-center border-collapse text-[11px]">
          <thead className="bg-slate-900 text-white font-black uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 border-r border-slate-800" rowSpan={2}>{t('bulletin.reportingDate')}</th>
              <th className="py-2 border-r border-slate-800" colSpan={2}>{t('bulletin.suspectedCases')}</th>
              <th className="py-2 border-r border-slate-800" colSpan={2}>{t('bulletin.confirmedCases')}</th>
              <th className="py-2 border-r border-slate-800" colSpan={2}>{t('bulletin.totalDeaths')}</th>
              <th className="py-2 border-r border-slate-800">{t('bulletin.admission')}</th>
              <th className="py-2">{t('bulletin.recovery')}</th>
            </tr>
            <tr className="bg-slate-800 text-[9px] border-t border-slate-700">
              <th className="py-2 border-r border-slate-700">{t('bulletin.24h')}</th>
              <th className="py-2 border-r border-slate-700">{t('bulletin.total')}</th>
              <th className="py-2 border-r border-slate-700">{t('bulletin.24h')}</th>
              <th className="py-2 border-r border-slate-700">{t('bulletin.total')}</th>
              <th className="py-2 border-r border-slate-700">{t('bulletin.24h')}</th>
              <th className="py-2 border-r border-slate-700">{t('bulletin.total')}</th>
              <th className="py-2 border-r border-slate-700">{t('bulletin.cum')}</th>
              <th className="py-2">{t('bulletin.cum')}</th>
            </tr>
          </thead>
          <tbody className="bg-white font-bold tabular-nums text-slate-700 divide-y divide-slate-100">
            {paginatedLog.map((log: any, idx: number) => (
              <tr key={log.date} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}>
                <td className="py-3 border-r border-slate-50 font-black text-slate-900 bg-slate-50/30">{formatDateBn(log.date)}</td>
                <td className="py-3">{toBnNum(log.suspected24h)}</td>
                <td className="py-3 text-slate-400 bg-slate-50/30">{toBnNum(log.suspectedCum)}</td>
                <td className="py-3 text-indigo-600">{toBnNum(log.confirmed24h)}</td>
                <td className="py-3 text-indigo-900 bg-slate-50/30">{toBnNum(log.confirmedCum)}</td>
                <td className="py-3 text-rose-600">{toBnNum((log.confirmedDeath24h || 0) + (log.suspectedDeath24h || 0))}</td>
                <td className="py-3 text-rose-900 bg-slate-50/30">{toBnNum((log.confirmedDeathCum || 0) + (log.suspectedDeathCum || 0))}</td>
                <td className="py-3">{toBnNum(log.admittedCum)}</td>
                <td className="py-3 bg-slate-50/30">{toBnNum(log.recoveredCum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const GovernmentBreakdownTable = ({ divisionStats, toBnNum, stats }: any) => {
  const { t, i18n } = useTranslation();
  const headerStyles = {
    suspected: "bg-[#FFEBEE] text-slate-900 border-x border-slate-900",
    admitted: "bg-[#FFCDD2] text-slate-900 border-x border-slate-900",
    discharged: "bg-[#EF9A9A] text-slate-900 border-x border-slate-900",
    confirmed: "bg-[#E57373] text-white border-x border-slate-900",
    death: "bg-[#C62828] text-white border-x border-slate-900",
    deathSus: "bg-[#B71C1C] text-white border-x border-slate-900",
  };

  return (
    <section className="space-y-4 print:space-y-1 pt-10 print:pt-1">
      <div className="text-center mb-6 print:mb-1">
        <h3 className="text-sm print:text-xs font-bold underline underline-offset-4">
          {t('bulletin.divisionBreakdownTitle')}
        </h3>
        <p className="text-[10px] print:text-[8px] mt-1 print:mt-0">
          ({i18n.language.startsWith('bn') ? 'তথ্য সূত্রঃ হেলথ ইমার্জেন্সি অপারেশন সেন্টার ও কন্ট্রোল রুম, স্বাস্থ্য অধিদপ্তর।' : 'Data Source: Health Emergency Operations Center & Control Room, DGHS.'})
        </p>
      </div>

      <div className="overflow-x-auto print:overflow-visible border-x border-t border-slate-900">
        <table className="w-full text-center border-collapse text-[9px] min-w-[1100px] print:min-w-0 print:text-[8px]">
          <thead>
            {/* Main Header Rows */}
            <tr className="bg-slate-50 font-bold border-b border-slate-900">
              <th className="border-r border-slate-900 py-4 print:py-1 w-[60px]" rowSpan={2}>{t('bulletin.divisionHeader')}</th>
              <th className={`${headerStyles.suspected} py-1 print:py-0.5`} rowSpan={2}>{t('bulletin.todaySuspected')}</th>
              <th className={`${headerStyles.admitted} py-1 print:py-0.5`} rowSpan={2}>{t('bulletin.todayAdmitted')}</th>
              <th className={`${headerStyles.discharged} py-1 print:py-0.5`} rowSpan={2}>{t('bulletin.todayRecovered')}</th>
              <th className={`${headerStyles.death} py-1 print:py-0.5`} rowSpan={2}>{t('bulletin.todayConfirmedDeath')}</th>
              <th className={`${headerStyles.confirmed} py-1 print:py-0.5`} rowSpan={2}>{t('bulletin.todayConfirmed')}</th>
              <th className={`${headerStyles.deathSus} py-1 print:py-0.5`} rowSpan={2}>{t('bulletin.todaySuspectedDeath')}</th>
              <th className="bg-slate-200 border-x border-slate-900 py-1 print:py-0.5" colSpan={6}>{t('bulletin.cumulativeSince')}</th>
            </tr>
            <tr className="bg-slate-100 font-bold border-b border-slate-900">
              <th className={`${headerStyles.suspected} py-2 print:py-0.5`}>{t('bulletin.cumSuspected')}</th>
              <th className={`${headerStyles.admitted} py-2 print:py-0.5`}>{t('bulletin.cumAdmitted')}</th>
              <th className={`${headerStyles.discharged} py-2 print:py-0.5`}>{t('bulletin.cumRecovered')}</th>
              <th className={`${headerStyles.confirmed} py-2 print:py-0.5`}>{t('bulletin.cumConfirmed')}</th>
              <th className={`${headerStyles.death} py-2 print:py-0.5`}>{t('bulletin.cumConfirmedDeath')}</th>
              <th className={`${headerStyles.deathSus} py-2 print:py-0.5 border-r-0`}>{t('bulletin.cumSuspectedDeath')}</th>
            </tr>
          </thead>
          <tbody className="font-bold text-slate-900">
            {divisionStats.map((div: any) => (
              <tr key={div.name} className="border-b border-slate-900">
                <td className="py-2 print:py-1 border-r border-slate-900 bg-slate-50">{translateName(div.name, i18n.language)}</td>
                <td className="py-2 print:py-1 border-r border-slate-900">{toBnNum(div.today.suspected)}</td>
                <td className="py-2 print:py-1 border-r border-slate-900">{toBnNum(div.today.admitted)}</td>
                <td className="py-2 print:py-1 border-r border-slate-900">{toBnNum(div.today.recovered)}</td>
                <td className="py-2 print:py-1 border-r border-slate-900">{toBnNum(div.today.confirmedDeath)}</td>
                <td className="py-2 print:py-1 border-r border-slate-900">{toBnNum(div.today.confirmed)}</td>
                <td className="py-2 print:py-1 border-r border-slate-900">{toBnNum(div.today.suspectedDeath)}</td>
                <td className="py-2 print:py-1 border-r border-slate-900 bg-slate-50/50">{toBnNum(div.cumulative.suspected)}</td>
                <td className="py-2 print:py-1 border-r border-slate-900 bg-slate-50/50">{toBnNum(div.cumulative.admitted)}</td>
                <td className="py-2 print:py-1 border-r border-slate-900 bg-slate-50/50">{toBnNum(div.cumulative.recovered)}</td>
                <td className="py-2 print:py-1 border-r border-slate-900 bg-slate-50/50">{toBnNum(div.cumulative.confirmed)}</td>
                <td className="py-2 print:py-1 border-r border-slate-900 bg-slate-50/50">{toBnNum(div.cumulative.confirmedDeath)}</td>
                <td className="py-2 print:py-1 bg-slate-50/50">{toBnNum(div.cumulative.suspectedDeath)}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 text-[10px] font-black border-b border-slate-900">
              <td className="py-3 border-r border-slate-900">{t('bulletin.grandTotal')}</td>
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

const PrintFooter = ({ selectedDate, toBnNum }: any) => {
  const { t } = useTranslation();
  return (
    <footer className="hidden print:block mt-16 print:mt-2 pt-10 print:pt-1 border-t-[1.5pt] border-slate-900">
      {/* Institutional Branding Row */}
      <div className="flex justify-center items-center gap-20 mb-16 print:mb-2 opacity-80">
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
      <div className="flex justify-between items-end px-4 mb-20 print:mb-4 pt-10 print:pt-2">
        <div className="w-64">
          <div className="border-b-[0.5pt] border-dotted border-slate-900 h-10 print:h-6 mb-2"></div>
          <p className="text-[10px] font-black text-slate-900 mb-0.5 uppercase tracking-tighter">{t('bulletin.systemOperator')}</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase leading-none italic">{t('bulletin.signatureUnit')}</p>
        </div>
        <div className="w-64">
          <div className="border-b-[0.5pt] border-dotted border-slate-900 h-10 print:h-6 mb-2"></div>
          <p className="text-[10px] font-black text-slate-900 mb-0.5 uppercase tracking-tighter">{t('bulletin.authorizedOfficer')}</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase leading-none italic">{t('bulletin.signatureOfficer')}</p>
        </div>
      </div>

      {/* Final Metadata */}
      <div className="flex justify-between items-center text-[7pt] font-medium text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-100">
        <span>{t('bulletin.generatedMetadata', { date: toBnNum(selectedDate, true), time: toBnNum('5:32', true) })}</span>
        <span>{t('bulletin.pageMetadata', { page: toBnNum(1, true), totalPages: toBnNum(1, true) })}</span>
      </div>
    </footer>
  );
};

// --- Main Page ---

export default function BulletinPage() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summaryTotals, setSummaryTotals] = useState<any>(null);
  const [cumulativeTotals, setCumulativeTotals] = useState<any>(null);
  const [summaryBreakdown, setSummaryBreakdown] = useState<any>(null);
  const [cumSummaryBreakdown, setCumSummaryBreakdown] = useState<any>(null);
  const [districtBreakdown, setDistrictBreakdown] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(getBdDateString());
  const [temporal, setTemporal] = useState<any>(null);
  const [logPage, setLogPage] = useState(1);
  const [dailyLogHistory, setDailyLogHistory] = useState<any[]>([]);
  const logItemsPerPage = 7;

  useEffect(() => {
    fetchReports();
  }, [selectedDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const outbreakId = 'measles-2026';
      const [temporalRes, todaySummaryRes, cumSummaryRes, districtData] = await Promise.all([
        fetch(`/api/reports/bulletin-temporal?outbreakId=${outbreakId}&to=${selectedDate}`),
        fetch(`/api/reports/summary?outbreakId=${outbreakId}&date=${selectedDate}`),
        fetch(`/api/reports/summary?outbreakId=${outbreakId}&to=${selectedDate}`),
        fetch(`/api/reports/summary?outbreakId=${outbreakId}&date=${selectedDate}&groupBy=district`)
      ]);

      const [temporalData, todaySumData, cumSumData, districtDataJson] = await Promise.all([
        temporalRes.json(),
        todaySummaryRes.json(),
        cumSummaryRes.json(),
        districtData.json()
      ]);

      setDailyLogHistory(temporalData.history || []);
      setSummaryTotals(todaySumData.totals);
      setSummaryBreakdown(todaySumData.breakdown);
      setCumulativeTotals(cumSumData.totals);
      setCumSummaryBreakdown(cumSumData.breakdown);
      setDistrictBreakdown(districtDataJson.breakdown);

      setTemporal({
        dataDate: temporalData.history?.[0]?.date || selectedDate,
        isHistorical: temporalData.history?.[0]?.date !== selectedDate
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const toBnNum = (n: number | string, forceBn = false) => {
    const isBn = forceBn || i18n.language.startsWith('bn');
    if (!isBn) return n.toLocaleString();
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return n.toString().replace(/,/g, '').split('').map(d => {
      const p = parseInt(d);
      return isNaN(p) ? d : bnNums[p];
    }).join('');
  };

  const stats = useMemo(() => {
    return {
      today: {
        suspected: summaryTotals?.suspected24h || 0,
        confirmed: summaryTotals?.confirmed24h || 0,
        admitted: summaryTotals?.admitted24h || 0,
        recovered: summaryTotals?.discharged24h || 0,
        confirmedDeath: summaryTotals?.confirmedDeath24h || 0,
        suspectedDeath: summaryTotals?.suspectedDeath24h || 0,
      },
      cumulative: {
        suspected: cumulativeTotals?.suspected24h || 0,
        confirmed: cumulativeTotals?.confirmed24h || 0,
        admitted: cumulativeTotals?.admitted24h || 0,
        recovered: cumulativeTotals?.discharged24h || 0,
        confirmedDeath: cumulativeTotals?.confirmedDeath24h || 0,
        suspectedDeath: cumulativeTotals?.suspectedDeath24h || 0,
      }
    };
  }, [summaryTotals, cumulativeTotals]);

  const divisionStats = useMemo(() => {
    return DIVISIONS.map(div => {
      const todayDiv = summaryBreakdown?.[div] || {};
      const cumDiv = cumSummaryBreakdown?.[div] || {};
      return {
        name: div,
        today: {
          suspected: todayDiv.suspected24h || 0,
          admitted: todayDiv.admitted24h || 0,
          recovered: todayDiv.discharged24h || 0,
          suspectedDeath: todayDiv.suspectedDeath24h || 0,
          confirmed: todayDiv.confirmed24h || 0,
          confirmedDeath: todayDiv.confirmedDeath24h || 0
        },
        cumulative: {
          suspected: cumDiv.suspected24h || 0,
          admitted: cumDiv.admitted24h || 0,
          recovered: cumDiv.discharged24h || 0,
          suspectedDeath: cumDiv.suspectedDeath24h || 0,
          confirmed: cumDiv.confirmed24h || 0,
          confirmedDeath: cumDiv.confirmedDeath24h || 0
        }
      };
    });
  }, [summaryBreakdown, cumSummaryBreakdown]);

  const leaders = useMemo(() => {
    const divLeaderArr = [...divisionStats].sort((a, b) => b.today.suspectedDeath - a.today.suspectedDeath);
    const divLeader = divLeaderArr[0];

    let districtName = 'Dhaka';
    let districtDeaths = 0;
    if (districtBreakdown) {
      const sortedDistricts = Object.entries(districtBreakdown)
        .map(([name, data]: [string, any]) => ({
          name,
          deaths: (Number(data.suspectedDeath24h) || 0)
        }))
        .sort((a, b) => b.deaths - a.deaths);

      if (sortedDistricts.length > 0) {
        districtName = sortedDistricts[0].name;
        districtDeaths = sortedDistricts[0].deaths;
      }
    }

    return {
      division: divLeader?.today.suspectedDeath > 0 ? divLeader.name : 'Dhaka',
      divisionDeaths: divLeader?.today.suspectedDeath || 0,
      district: districtName,
      districtDeaths: districtDeaths
    };
  }, [divisionStats, districtBreakdown]);

  const dailyLog = useMemo(() => {
    return dailyLogHistory;
  }, [dailyLogHistory]);

  const totalLogPages = Math.ceil(dailyLog.length / logItemsPerPage);
  const paginatedLog = useMemo(() => {
    return dailyLog.slice((logPage - 1) * logItemsPerPage, logPage * logItemsPerPage);
  }, [dailyLog, logPage]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-slate-50 border-b-rose-500 rounded-full animate-spin-reverse" />
          </div>
        </div>
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">
            {t('bulletin.nationalSurveillance')}
          </p>
          <div className="space-y-1">
            <p className="text-lg font-black text-slate-900 tracking-tight">
              {t('bulletin.generatingBulletin')}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">
              {t('bulletin.authenticating')}
            </p>
          </div>
        </div>
        <style jsx>{`
          .animate-spin-reverse {
            animation: spin-reverse 1.5s linear infinite;
          }
          @keyframes spin-reverse {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F3F6] p-4 md:p-8 font-sans print:bg-white print:p-0">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { font-family: var(--font-nikosh), 'Inter', sans-serif; }
        @media print {
          @page { size: auto; margin: 2mm 5mm !important; }
          body { font-size: 10pt; line-height: 1.1; font-family: 'Times New Roman', Times, serif !important; background-color: white !important; }
          .no-print, nav, footer, button, .pagination-controls { display: none !important; }
          .max-w-[1240px] { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; word-break: break-word !important; }
          th, td { border: 1px solid black !important; padding: 4px !important; white-space: normal !important; overflow: visible !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          .print-break-before { page-break-before: always; }
          .print-header { position: fixed; top: 0; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
          h1, h2, h3, h4 { color: black !important; }
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

        <main className="p-8 space-y-10 print:p-0 print:space-y-1">
          {temporal?.isHistorical && selectedDate === getBdDateString() && (
            <div className="bg-amber-50 border-y border-amber-200 py-3 px-8 text-center no-print">
              <p className="text-xs font-bold text-amber-800">
                {t('bulletin.todayReportNotPublished', { date: toBnNum(temporal.dataDate) })}
              </p>
            </div>
          )}

          <GovernmentSummary
            stats={stats}
            toBnNum={toBnNum}
            divisionStats={divisionStats}
            leaders={leaders}
          />

          <DailyLogTable
            paginatedLog={paginatedLog}
            toBnNum={toBnNum}
            logPage={logPage}
            totalLogPages={totalLogPages}
            setLogPage={setLogPage}
          />

          <GovernmentBreakdownTable
            divisionStats={divisionStats}
            toBnNum={toBnNum}
            stats={stats}
          />

          <PrintFooter selectedDate={selectedDate} toBnNum={toBnNum} />
        </main>
      </div>
    </div>
  );
}
