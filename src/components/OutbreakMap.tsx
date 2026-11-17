"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';
import { MapPin, Activity, Flame, ShieldAlert, Crosshair, X } from 'lucide-react';
import type { GeoData } from '@/components/OutbreakMapInner';

// Dynamically import the map to avoid SSR issues with Leaflet
const MapInner = dynamic(() => import('@/components/OutbreakMapInner').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="h-[650px] w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center">
      <span className="text-slate-400 font-medium">Loading interactive surveillance map...</span>
    </div>
  ),
});

interface OutbreakMapProps {
  apiEndpoint?: string;
  selectedDistrict?: string | null;
  onSelectDistrict?: (district: string) => void;
}

export default function OutbreakMap({
  apiEndpoint = '/api/reports/geo',
  selectedDistrict,
  onSelectDistrict,
}: OutbreakMapProps) {
  const { t } = useTranslation();
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricMode, setMetricMode] = useState<'attackRate' | 'totalCases' | 'deaths' | 'hospitalized'>('attackRate');

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

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Geographic Surveillance & Attack Rate</h3>
          </div>
          <p className="text-xs text-slate-500">
            Click any district to filter all dashboard KPIs, Epi-curves, and facility tables.
          </p>
        </div>

        {/* Metric Selector Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedDistrict && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-xl text-xs font-bold animate-in fade-in">
              <span>Filtered: {selectedDistrict}</span>
              {onSelectDistrict && (
                <button
                  type="button"
                  onClick={() => onSelectDistrict(selectedDistrict)}
                  className="p-0.5 hover:bg-indigo-100 rounded text-indigo-600"
                  title="Clear district filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMetricMode('attackRate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                metricMode === 'attackRate'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Attack Rate / 100k
            </button>

            <button
              type="button"
              onClick={() => setMetricMode('totalCases')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                metricMode === 'totalCases'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Total Cases
            </button>

            <button
              type="button"
              onClick={() => setMetricMode('deaths')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                metricMode === 'deaths'
                  ? 'bg-white text-red-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Deaths
            </button>

            <button
              type="button"
              onClick={() => setMetricMode('hospitalized')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                metricMode === 'hospitalized'
                  ? 'bg-white text-orange-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              Hospitalized
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="h-[650px] w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center">
            <span className="text-slate-400 font-medium">Aggregating district surveillance data...</span>
          </div>
        ) : (
          <MapInner
            geoData={geoData}
            metricMode={metricMode}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={onSelectDistrict}
          />
        )}
      </div>
    </div>
  );
}
