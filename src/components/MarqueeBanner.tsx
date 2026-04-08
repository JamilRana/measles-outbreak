"use client";

import { useTranslation, Trans } from 'react-i18next';

export default function MarqueeBanner() {
  const { t } = useTranslation();

  const content = (
    <Trans i18nKey="marquee.message">
      ⚕️ If you notice symptoms of measles or similar diseases, call <a href="tel:16263" className="underline hover:text-white/90 underline-offset-4 decoration-2">16263</a> for medical assistance or visit your nearest hospital for treatment. ⚕️
    </Trans>
  );

  return (
    <div className="marquee-container bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white py-2.5 overflow-hidden relative border-b border-red-800 shadow-sm">
      <div className="marquee-track">
        <span className="marquee-content text-md font-semibold tracking-wide">
          {content}
        </span>
        <span className="marquee-content text-md font-semibold tracking-wide" aria-hidden="true">
          {content}
        </span>
      </div>
    </div>
  );
}
