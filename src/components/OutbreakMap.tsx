"use client";

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  AlertTriangle,
  Bed,
  Heart,
  Compass,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import type { GeoData, MetricMode } from '@/components/OutbreakMapInner';
import { normalizeDistrictName, normalizeDivisionName, BD_DISTRICT_TO_DIVISION } from '@/lib/bd-districts';
import { getBdTime } from '@/lib/timezone';

// Dynamically import the map to avoid SSR issues with Leaflet
const MapInner = dynamic(() => import('@/components/OutbreakMapInner').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="h-[620px] w-full bg-slate-50 animate-pulse rounded-2xl flex flex-col items-center justify-center gap-3 border border-slate-200/80">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-500 text-sm font-semibold tracking-wide">
        Rendering clinical surveillance choropleth...
      </span>
    </div>
  ),
});

interface OutbreakMapProps {
  apiEndpoint?: string;
  selectedDistrict?: string | null;
  selectedDivision?: string | null;
  onSelectDistrict?: (district: string) => void;
  onSelectDivision?: (division: string) => void;
}

export default function OutbreakMap({
  apiEndpoint = '/api/reports/geo',
  selectedDistrict,
  selectedDivision: externalSelectedDivision,
  onSelectDistrict,
  onSelectDivision: externalOnSelectDivision,
}: OutbreakMapProps) {
  const { i18n } = useTranslation();
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricMode, setMetricMode] = useState<MetricMode>('confirmed');

  const toBnNum = (n: number | string | null | undefined) => {
    if (n == null || n === '') return '0';
    if (i18n.language !== 'bn') return Number(n).toLocaleString('en-US');
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return Number(n)
      .toLocaleString('en-US')
      .toString()
      .split('')
      .map(char => {
        const digit = parseInt(char, 10);
        return !isNaN(digit) ? bnNums[digit] : char;
      })
      .join('');
  };

  // Local division state if not externally controlled
  const [internalDivision, setInternalDivision] = useState<string | null>(null);
  const activeDivision =
    externalSelectedDivision !== undefined ? externalSelectedDivision : internalDivision;

  const handleDivisionChange = (div: string | null) => {
    if (externalOnSelectDivision) {
      externalOnSelectDivision(div || '');
    } else {
      setInternalDivision(div);
    }
  };

  const handleDistrictChange = (dist: string) => {
    if (onSelectDistrict) {
      onSelectDistrict(dist);
    }
    if (dist) {
      const norm = normalizeDistrictName(dist);
      const parentDiv = BD_DISTRICT_TO_DIVISION[norm];
      if (parentDiv && parentDiv !== activeDivision) {
        handleDivisionChange(parentDiv);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        const res = await fetch(apiEndpoint);
        const data = await res.json();
        if (isMounted) {
          setGeoData(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch geo data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchGeoData();
    return () => {
      isMounted = false;
    };
  }, [apiEndpoint]);

  // Aggregate stats based on active geographic region (National vs Division vs District)
  const activeStats = useMemo(() => {
    if (!geoData.length) {
      return { confirmed: 0, suspected: 0, hospitalized: 0, deaths: 0 };
    }

    if (selectedDistrict) {
      const normDist = normalizeDistrictName(selectedDistrict).toLowerCase();
      const match = geoData.find(
        (g) => normalizeDistrictName(g.district).toLowerCase() === normDist
      );
      if (match) {
        return {
          confirmed: match.confirmed || 0,
          suspected: match.suspected || 0,
          hospitalized: match.hospitalized || 0,
          deaths: match.deaths || 0,
        };
      }
    }

    if (activeDivision) {
      const normDiv = normalizeDivisionName(activeDivision).toLowerCase();
      const divisionItems = geoData.filter(
        (g) => normalizeDivisionName(g.division).toLowerCase() === normDiv
      );
      return divisionItems.reduce(
        (acc, item) => ({
          confirmed: acc.confirmed + (item.confirmed || 0),
          suspected: acc.suspected + (item.suspected || 0),
          hospitalized: acc.hospitalized + (item.hospitalized || 0),
          deaths: acc.deaths + (item.deaths || 0),
        }),
        { confirmed: 0, suspected: 0, hospitalized: 0, deaths: 0 }
      );
    }

    // National scope
    return geoData.reduce(
      (acc, item) => ({
        confirmed: acc.confirmed + (item.confirmed || 0),
        suspected: acc.suspected + (item.suspected || 0),
        hospitalized: acc.hospitalized + (item.hospitalized || 0),
        deaths: acc.deaths + (item.deaths || 0),
      }),
      { confirmed: 0, suspected: 0, hospitalized: 0, deaths: 0 }
    );
  }, [geoData, selectedDistrict, activeDivision]);

  // High-Burden Ranked Leaderboard (Image 2 pattern)
  const highBurdenRanking = useMemo(() => {
    if (!geoData.length) return [];

    // Helper to extract value based on metricMode
    const getVal = (g: GeoData) => {
      if (metricMode === 'confirmed') return g.confirmed || 0;
      if (metricMode === 'suspected') return g.suspected || 0;
      if (metricMode === 'deaths') return g.deaths || 0;
      if (metricMode === 'hospitalized') return g.hospitalized || 0;
      return g.attackRatePer100k || 0;
    };

    // If a division is active (or district inside a division), rank districts within that division
    if (activeDivision) {
      const normDiv = normalizeDivisionName(activeDivision).toLowerCase();
      const dists = geoData.filter(
        (g) => normalizeDivisionName(g.division).toLowerCase() === normDiv
      );
      const sorted = [...dists]
        .map((d) => ({ name: d.district, val: getVal(d), isDistrict: true }))
        .sort((a, b) => b.val - a.val);

      const maxVal = sorted[0]?.val || 1;
      return sorted.slice(0, 5).map((item) => ({
        ...item,
        pct: Math.min(100, Math.max(8, Math.round((item.val / maxVal) * 100))),
      }));
    }

    // Otherwise, rank all 8 divisions in Bangladesh
    const divMap = new Map<string, number>();
    for (const item of geoData) {
      const divName = normalizeDivisionName(item.division);
      const cur = divMap.get(divName) || 0;
      divMap.set(divName, cur + getVal(item));
    }

    const sorted = Array.from(divMap.entries())
      .map(([name, val]) => ({ name, val, isDistrict: false }))
      .sort((a, b) => b.val - a.val);

    const maxVal = sorted[0]?.val || 1;
    return sorted.slice(0, 5).map((item) => ({
      ...item,
      pct: Math.min(100, Math.max(8, Math.round((item.val / maxVal) * 100))),
    }));
  }, [geoData, activeDivision, metricMode]);

  // Current BST Date String for header & footer
  const bdDateStr = useMemo(() => {
    try {
      const now = getBdTime();
      return now.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '18 Nov 2026';
    }
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden text-slate-800">
      {/* 1. Surveillance Geo-Intel Header & Metric Filter Tabs (Image 2 pattern) */}
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
            {i18n.language === 'bn' ? 'ভৌগোলিক নজরদারি' : 'Surveillance geo-intel'}
          </span>
          <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {i18n.language === 'bn' ? 'প্রাদুর্ভাব মানচিত্র — আক্রান্ত এলাকা' : 'Outbreak map — affected areas'}
          </h3>
        </div>

        {/* Metric Mode Filter Tabs (Pills with colored dots matching Image 2) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMetricMode('confirmed')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              metricMode === 'confirmed'
                ? 'bg-blue-50 border-2 border-blue-600 text-blue-900 shadow-sm font-bold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            {i18n.language === 'bn' ? 'নিশ্চিত কেস' : 'Confirmed cases'}
          </button>

          <button
            type="button"
            onClick={() => setMetricMode('suspected')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              metricMode === 'suspected'
                ? 'bg-amber-50 border-2 border-amber-600 text-amber-900 shadow-sm font-bold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            {i18n.language === 'bn' ? 'সন্দেহভাজন কেস' : 'Suspected cases'}
          </button>

          <button
            type="button"
            onClick={() => setMetricMode('hospitalized')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              metricMode === 'hospitalized'
                ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-900 shadow-sm font-bold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            {i18n.language === 'bn' ? 'ভর্তি' : 'Hospitalised'}
          </button>

          <button
            type="button"
            onClick={() => setMetricMode('deaths')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              metricMode === 'deaths'
                ? 'bg-rose-50 border-2 border-rose-600 text-rose-900 shadow-sm font-bold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            {i18n.language === 'bn' ? 'মৃত্যু' : 'Deaths'}
          </button>

          <button
            type="button"
            onClick={() => setMetricMode('attackRate')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              metricMode === 'attackRate'
                ? 'bg-indigo-50 border-2 border-indigo-600 text-indigo-900 shadow-sm font-bold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            {i18n.language === 'bn' ? 'আক্রমণের হার / প্রতি ১ লাখ' : 'Attack Rate / 100k'}
          </button>
        </div>
      </div>

      {/* 2. Split Screen: Map on Left, Intelligence Panel on Right (Image 2 pattern) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Column: Interactive Vector Map */}
        <div className="lg:col-span-8 p-4 bg-slate-50/40 relative">
          {loading ? (
            <div className="h-[620px] w-full bg-slate-100/70 animate-pulse rounded-2xl flex flex-col items-center justify-center gap-3 border border-slate-200/80">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-500 font-medium">
                {i18n.language === 'bn' ? 'জেলা ভিত্তিক নজরদারি তথ্য একত্রিত করা হচ্ছে...' : 'Aggregating district surveillance data...'}
              </span>
            </div>
          ) : (
            <MapInner
              geoData={geoData}
              metricMode={metricMode}
              selectedDistrict={selectedDistrict}
              selectedDivision={activeDivision}
              onSelectDistrict={handleDistrictChange}
              onSelectDivision={handleDivisionChange}
            />
          )}
        </div>

        {/* Right Column: Contextual Geo-Intelligence Panel (Image 2 pattern) */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200/80 bg-slate-50/50 p-6 flex flex-col justify-between">
          <div>
            {/* Active Region Header */}
            <div className="mb-5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>{i18n.language === 'bn' ? 'সক্রিয় অঞ্চল' : 'Active region'}</span>
              </div>
              <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                {selectedDistrict
                  ? (i18n.language === 'bn' ? `${selectedDistrict} জেলা` : `${selectedDistrict} District`)
                  : activeDivision
                  ? (i18n.language === 'bn' ? `${activeDivision} বিভাগ` : `${activeDivision} Division`)
                  : (i18n.language === 'bn' ? 'জাতীয় সারাংশ' : 'National summary')}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedDistrict
                  ? `${activeDivision || (i18n.language === 'bn' ? 'বিভাগ' : 'Division')} · ${bdDateStr}`
                  : activeDivision
                  ? (i18n.language === 'bn' ? `রিপোর্টিং জেলাসমূহ · ${bdDateStr}` : `Reporting districts · ${bdDateStr}`)
                  : (i18n.language === 'bn' ? `সকল বিভাগ · ${bdDateStr}` : `All divisions · ${bdDateStr}`)}
              </p>
            </div>

            {/* 4 Summary Metric Cards (Stacked layout matching Image 2) */}
            <div className="space-y-2.5 mb-5">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-100 rounded-lg text-blue-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">
                    {i18n.language === 'bn' ? 'নিশ্চিত' : 'Confirmed'}
                  </span>
                </div>
                <span className="text-xl font-black text-blue-900">
                  {toBnNum(activeStats.confirmed)}
                </span>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">
                    {i18n.language === 'bn' ? 'সন্দেহভাজন' : 'Suspected'}
                  </span>
                </div>
                <span className="text-xl font-black text-amber-900">
                  {toBnNum(activeStats.suspected)}
                </span>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                    <Bed className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">
                    {i18n.language === 'bn' ? 'ভর্তি' : 'Hospitalised'}
                  </span>
                </div>
                <span className="text-xl font-black text-emerald-900">
                  {toBnNum(activeStats.hospitalized)}
                </span>
              </div>

              <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-rose-100 rounded-lg text-rose-700">
                    <Heart className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">
                    {i18n.language === 'bn' ? 'মৃত্যু' : 'Deaths'}
                  </span>
                </div>
                <span className="text-xl font-black text-rose-900">
                  {toBnNum(activeStats.deaths)}
                </span>
              </div>
            </div>

            {/* Interactive Guidance Banner (Image 2 pattern) */}
            <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-blue-800 flex items-center gap-2 mb-6">
              <span>👆</span>
              <span>
                {selectedDistrict || activeDivision
                  ? (i18n.language === 'bn' ? 'জাতীয় সারাংশে ফিরতে পেছনে বা বাংলাদেশে ক্লিক করুন' : 'Click Back or Bangladesh to return to national summary')
                  : (i18n.language === 'bn' ? 'এই প্যানেল ফিল্টার করতে মানচিত্রে কোনো বিভাগে ক্লিক করুন' : 'Click a division on the map to filter this panel')}
              </span>
            </div>

            {/* High-Burden Ranked Leaderboard (Image 2 pattern) */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                <span>
                  {i18n.language === 'bn' 
                    ? `উচ্চ ঝুঁকিপূর্ণ ${activeDivision ? 'জেলাসমূহ' : 'বিভাগসমূহ'}` 
                    : `High-burden ${activeDivision ? 'districts' : 'divisions'}`}
                </span>
              </div>

              <div className="space-y-2.5">
                {highBurdenRanking.map((item, idx) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      if (item.isDistrict) {
                        handleDistrictChange(item.name);
                      } else {
                        handleDivisionChange(item.name);
                      }
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/80 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-[100px]">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {toBnNum(idx + 1)}
                      </span>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                        {item.name}
                      </span>
                    </div>

                    {/* Proportional micro-progress bar */}
                    <div className="flex-1 mx-3 h-2 bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-700/80 rounded-full group-hover:bg-rose-600 transition-all"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>

                    <span className="text-xs font-black text-slate-900 min-w-[40px] text-right font-mono">
                      {toBnNum(item.val)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Provenance & Timestamp Footer (Image 2 pattern) */}
          <div className="pt-6 mt-6 border-t border-slate-200/70 text-[11px] text-slate-400 font-medium text-center">
            {i18n.language === 'bn' ? 'উৎস: সিভিল সার্জন কার্যালয় · হালনাগাদ ০৭:০০ BST' : 'Source: Civil Surgeon Office · Updated 07:00 BST'}
          </div>
        </div>
      </div>
    </div>
  );
}
