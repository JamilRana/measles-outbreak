"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import dynamic from 'next/dynamic';

// Dynamically import the map to avoid SSR issues with Leaflet
const MapInner = dynamic(() => import('@/components/OutbreakMapInner') as any, {
  ssr: false,
  loading: () => (
    <div className="h-[650px] w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center">
      <span className="text-slate-400 font-medium">Loading map...</span>
    </div>
  ),
}) as any;

interface GeoData {
  district: string;
  division: string;
  confirmed: number;
  deaths: number;
  hospitalized: number;
  lat: number;
  lng: number;
}

export default function OutbreakMap() {
  const { t } = useTranslation();
  const [geoData, setGeoData] = useState<GeoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeaths, setShowDeaths] = useState(true);
  const [showConfirmed, setShowConfirmed] = useState(true);
  const [showHospitalized, setShowHospitalized] = useState(true);

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        const res = await fetch('/api/reports/geo');
        const data = await res.json();
        setGeoData(data);
      } catch (err) {
        console.error('Failed to fetch geo data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGeoData();
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-xl font-bold text-slate-800 mb-4">{t('map.title')}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowDeaths(!showDeaths)}
            className={`map-toggle-btn ${showDeaths ? 'active' : 'inactive'}`}
            style={{
              borderColor: '#ef4444',
              backgroundColor: showDeaths ? '#ef4444' : 'white',
              color: showDeaths ? 'white' : '#ef4444',
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: showDeaths ? 'white' : '#ef4444' }} />
            {t('map.deaths')}
          </button>
          <button
            onClick={() => setShowConfirmed(!showConfirmed)}
            className={`map-toggle-btn ${showConfirmed ? 'active' : 'inactive'}`}
            style={{
              borderColor: '#8b5cf6',
              backgroundColor: showConfirmed ? '#8b5cf6' : 'white',
              color: showConfirmed ? 'white' : '#8b5cf6',
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: showConfirmed ? 'white' : '#8b5cf6' }} />
            {t('map.confirmedCases')}
          </button>
          <button
            onClick={() => setShowHospitalized(!showHospitalized)}
            className={`map-toggle-btn ${showHospitalized ? 'active' : 'inactive'}`}
            style={{
              borderColor: '#f97316',
              backgroundColor: showHospitalized ? '#f97316' : 'white',
              color: showHospitalized ? 'white' : '#f97316',
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: showHospitalized ? 'white' : '#f97316' }} />
            {t('map.hospitalizations')}
          </button>
        </div>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="h-[650px] w-full bg-slate-100 animate-pulse rounded-2xl" />
        ) : (
          <MapInner
            geoData={geoData}
            showDeaths={showDeaths}
            showConfirmed={showConfirmed}
            showHospitalized={showHospitalized}
          />
        )}
      </div>
    </div>
  );
}
