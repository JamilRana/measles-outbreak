"use client";

import React, { useState, useEffect } from 'react';
import { Activity, BarChart3, Globe, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import Image from 'next/image';

export default function SimpleHeader() {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'bn' ? 'en' : 'bn');

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 py-4">
      <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
<div className="w-16 h-16 relative bg-white rounded-full p-2 flex items-center justify-center shadow-md">
  <Image 
    src="/logo_mohfw.png" 
    alt="MOHFW Logo" 
    width={40} 
    height={40} 
    className="object-contain" 
  />
</div>
          <div>
            <h1 className="text-base font-black text-slate-800 leading-tight tracking-tight uppercase italic">
              <span className="text-indigo-600">Management Information System (MIS)</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">National Surveillance Network</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 hidden px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all hover:shadow-lg hover:shadow-slate-200 active:scale-95"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Surveillance Hub
          </Link>
          
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 hidden text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{i18n.language === 'en' ? 'ENGLISH' : 'বাংলা'}</span>
          </button>

          {mounted && (
            <div className="flex flex-col items-end text-right border-l border-slate-200 pl-6 h-10 justify-center">
              <span className="text-xs font-black text-slate-800 tabular-nums tracking-tighter">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                {time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
