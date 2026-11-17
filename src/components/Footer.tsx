"use client";

import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-slate-800 to-slate-900 border-t border-slate-700/50 pt-6 pb-4">
      <div className="max-w-7xl mx-auto px-4">
        {/* Logo Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-10 mb-5">

          {/* MIS DGHS */}
          <div className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 relative bg-white rounded-lg p-1 shadow-md">
              <Image
                src="/mis_logo.png"
                alt="MIS DGHS Logo"
                fill
                sizes="48px"
                className="object-contain p-1"
              />
            </div>

            <span className="text-[11px] text-slate-400 font-medium text-center max-w-[120px] leading-tight">
              {t('footer.misDghs')}
            </span>
          </div>

          {/* DGHS */}
          <div className="flex flex-col items-center gap-1.5 group">
            <div className="w-14 h-14 relative bg-white rounded-lg p-1 shadow-md">
              <Image
                src="/dghs_logo.svg"
                alt="DGHS Logo"
                fill
                className="object-contain p-1"
              />
            </div>

            <span className="text-[11px] text-slate-400 font-medium text-center max-w-[150px] leading-tight">
              {t('footer.dghs')}
            </span>
          </div>

          {/* MOHFW */}
          <div className="flex flex-col items-center gap-1.5 group">
            <div className="w-12 h-12 relative bg-white rounded-lg p-1 shadow-md">
              <Image
                src="/logo_mohfw.png"
                alt="MOHFW Logo"
                fill
                sizes="48px"
                className="object-contain p-1"
              />
            </div>

            <span className="text-[11px] text-slate-400 font-medium text-center max-w-[150px] leading-tight">
              {t('footer.mohfw')}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent mb-4" />

        {/* Copyright */}
        <div className="text-center">
          <p className="text-slate-500 text-[11px] font-medium">
            {t('footer.govBd')}
          </p>

          <p className="text-slate-600 text-[10px] mt-0.5">
            {t('footer.copyright', { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}