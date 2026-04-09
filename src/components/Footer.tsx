"use client";

import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-slate-800 to-slate-900 border-t border-slate-700/50 pt-10 pb-6">
      <div className="max-w-7xl mx-auto px-6">
        {/* Logo Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 mb-8">
          {/* MIS DGHS */}
          <div className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 relative bg-white rounded-xl p-1.5 shadow-lg shadow-black/10 group-hover:shadow-xl transition-shadow">
              <Image src="/mis_logo.png" alt="MIS DGHS Logo" fill sizes="64px" className="object-contain p-1" />
            </div>
            <span className="text-xs text-slate-400 font-medium text-center max-w-[140px] leading-tight">
              {t('footer.misDghs')}
            </span>
          </div>

          {/* DGHS */}
          <div className="flex flex-col items-center gap-2 group">
            <div className="w-20 h-20 relative bg-white rounded-xl p-1.5 shadow-lg shadow-black/10 group-hover:shadow-xl transition-shadow">
              <Image src="/dghs_logo.svg" alt="DGHS Logo" fill className="object-contain p-1" />
            </div>
            <span className="text-xs text-slate-400 font-medium text-center max-w-[180px] leading-tight">
              {t('footer.dghs')}
            </span>
          </div>

          {/* MOHFW */}
          <div className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 relative bg-white rounded-xl p-1.5 shadow-lg shadow-black/10 group-hover:shadow-xl transition-shadow">
              <Image src="/logo_mohfw.png" alt="MOHFW Logo" fill sizes="64px" className="object-contain p-1" />
            </div>
            <span className="text-xs text-slate-400 font-medium text-center max-w-[180px] leading-tight">
              {t('footer.mohfw')}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent mb-6" />

        {/* Copyright */}
        <div className="text-center">
          <p className="text-slate-500 text-xs font-medium">
            {t('footer.govBd')}
          </p>
          <p className="text-slate-600 text-[11px] mt-1">
            {t('footer.copyright', { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
