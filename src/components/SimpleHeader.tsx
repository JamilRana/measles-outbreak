"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { Globe, Clock as ClockIcon, Timer, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { getBdTime } from '@/lib/timezone';

interface SimpleHeaderProps {
  settings?: any;
  deadlineInfo?: any;
  windowStatus?: any;
  selectedDate?: string;
}

export default function SimpleHeader({ settings, deadlineInfo, windowStatus, selectedDate }: SimpleHeaderProps) {
  const { t, i18n } = useTranslation();
  const [time, setTime] = useState(getBdTime());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(getBdTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'bn' ? 'en' : 'bn';
    i18n.changeLanguage(newLang);
  };

  const getStatus = () => {
    if (!deadlineInfo || !settings) return null;
    
    if (windowStatus?.open) {
      return {
        label: windowStatus.type === 'BACKLOG' ? 'Backlog window open' : 'Reporting window open',
        message: `Submit daily data by ${String(settings.cutoffHour).padStart(2, '0')}:${String(settings.cutoffMinute).padStart(2, '0')} BST`,
        color: 'bg-[#EBF5EA] text-[#3E7B3A]',
        dot: 'bg-[#3E7B3A]',
        icon: CheckCircle2
      };
    }

    if (deadlineInfo.isPastCutoff && deadlineInfo.isToday) {
      return {
        label: 'Standard window closed',
        message: `Daily submission ended at ${String(settings.cutoffHour).padStart(2, '0')}:${String(settings.cutoffMinute).padStart(2, '0')}`,
        color: 'bg-[#FFF9E6] text-[#856404]',
        dot: 'bg-[#FFC107]',
        icon: AlertTriangle
      };
    }

    return {
      label: 'Reporting window open',
      message: `Submit daily data by ${String(settings.cutoffHour).padStart(2, '0')}:${String(settings.cutoffMinute).padStart(2, '0')} BST · Measles 2026`,
      color: 'bg-[#EBF5EA] text-[#3E7B3A]',
      dot: 'bg-[#3E7B3A]',
      icon: CheckCircle2
    };
  };

  const status = getStatus();

  return (
    <header className="bg-white border-b border-slate-200">
      {/* Top Row */}
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 relative bg-indigo-50 rounded-full flex items-center justify-center p-2.5">
            <Image src="/logo_mohfw.png" alt="Logo" width={44} height={44} className="object-contain" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 leading-tight uppercase tracking-tight">
              Management Information System <span className="text-indigo-600 font-extrabold">(MIS)</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">National Surveillance Network · DGHS Bangladesh</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right hidden sm:block min-w-[100px]">
            <p className="text-sm font-black text-slate-800 tabular-nums">
              {mounted ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '--:--:-- --'}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {mounted ? time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--- --, ----'}
            </p>
          </div>

          {/* <button
            onClick={toggleLanguage}
            className="px-6 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-black text-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            {i18n.language === 'bn' ? 'English' : 'বাংলা'}
          </button> */}
        </div>
      </div>

      {/* Bottom Row: Status Bar */}
      {status && (
        <div className={`${status.color} border-t border-slate-100`}>
          <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-black uppercase tracking-tight">{status.label}</span>
                <span className="text-[11px] font-medium opacity-80">{status.message}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-tighter">
              {!deadlineInfo.isPastCutoff && (
                 <div className="flex items-center gap-2">
                   <span className="opacity-60">Closes in</span>
                   <Countdown targetHour={settings.cutoffHour} targetMinute={settings.cutoffMinute} />
                 </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Countdown({ targetHour, targetMinute }: { targetHour: number; targetMinute: number }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const calculate = () => {
      const now = getBdTime();
      const target = new Date(now);
      target.setHours(targetHour, targetMinute, 0, 0);
      
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) return setTimeLeft('00:00:00');

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [targetHour, targetMinute]);

  return <span className="tabular-nums">{mounted ? timeLeft : '--:--:--'}</span>;
}
