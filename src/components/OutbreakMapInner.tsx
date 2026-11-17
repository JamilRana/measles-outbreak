"use client";

import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';

export interface GeoData {
  district: string;
  division: string;
  confirmed: number;
  suspected: number;
  deaths: number;
  hospitalized: number;
  population?: number;
  attackRatePer100k?: number;
  suspectedCfr?: number;
  lat: number;
  lng: number;
}

interface Props {
  geoData: GeoData[];
  metricMode: 'attackRate' | 'totalCases' | 'deaths' | 'hospitalized';
  selectedDistrict?: string | null;
  onSelectDistrict?: (district: string) => void;
}

function getMetricColor(rate: number, mode: string): string {
  if (mode === 'deaths') {
    if (rate >= 10) return '#7f1d1d';
    if (rate >= 5) return '#b91c1c';
    if (rate >= 2) return '#ef4444';
    if (rate >= 1) return '#f87171';
    return '#fca5a5';
  }

  if (mode === 'attackRate') {
    if (rate >= 50) return '#7f1d1d'; // Critical (>50 per 100k)
    if (rate >= 20) return '#b91c1c'; // Severe (20-50 per 100k)
    if (rate >= 10) return '#ea580c'; // High (10-20 per 100k)
    if (rate >= 3) return '#f59e0b';  // Moderate (3-10 per 100k)
    return '#10b981';                 // Low (<3 per 100k)
  }

  // totalCases or hospitalized
  if (rate >= 500) return '#581c87';
  if (rate >= 200) return '#7e22ce';
  if (rate >= 50) return '#9333ea';
  if (rate >= 10) return '#c084fc';
  return '#3b82f6';
}

function getMarkerRadius(val: number, mode: string): number {
  if (mode === 'attackRate') {
    return Math.max(8, Math.min(36, Math.sqrt(val) * 4.5));
  }
  if (mode === 'deaths') {
    return Math.max(8, Math.min(32, Math.sqrt(val) * 6));
  }
  return Math.max(8, Math.min(38, Math.sqrt(val) * 2.8));
}

export default function OutbreakMapInner({
  geoData,
  metricMode,
  selectedDistrict,
  onSelectDistrict,
}: Props) {
  const bangladeshBounds: [[number, number], [number, number]] = [
    [20.3, 88.0],
    [26.7, 92.7],
  ];

  return (
    <MapContainer
      center={[23.685, 90.3563]}
      zoom={7}
      minZoom={7}
      maxBounds={bangladeshBounds}
      maxBoundsViscosity={1.0}
      style={{ height: '650px', width: '100%', borderRadius: '1.5rem' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {geoData.map((item) => {
        const totalCases = (item.confirmed || 0) + (item.suspected || 0);
        const attackRate = item.attackRatePer100k ?? (item.population ? Number(((totalCases / item.population) * 100000).toFixed(2)) : 0);
        
        let displayVal = attackRate;
        if (metricMode === 'totalCases') displayVal = totalCases;
        else if (metricMode === 'deaths') displayVal = item.deaths || 0;
        else if (metricMode === 'hospitalized') displayVal = item.hospitalized || 0;

        if (displayVal <= 0 && metricMode !== 'attackRate') return null;

        const color = getMetricColor(displayVal, metricMode);
        const radius = getMarkerRadius(displayVal, metricMode);
        const isSelected = selectedDistrict?.toLowerCase() === item.district.toLowerCase();

        return (
          <CircleMarker
            key={item.district}
            center={[item.lat, item.lng]}
            radius={isSelected ? radius + 4 : radius}
            pathOptions={{
              fillColor: color,
              color: isSelected ? '#1e1b4b' : '#ffffff',
              weight: isSelected ? 4 : 1.5,
              opacity: 1,
              fillOpacity: isSelected ? 0.9 : 0.65,
            }}
            eventHandlers={{
              click: () => {
                if (onSelectDistrict) {
                  onSelectDistrict(item.district);
                }
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <div className="font-sans text-xs">
                <span className="font-bold">{item.district}</span>: {displayVal.toLocaleString()}{' '}
                {metricMode === 'attackRate' ? '/ 100k' : ''}
              </div>
            </Tooltip>

            <Popup>
              <div className="text-sm font-sans p-1 min-w-[200px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <div>
                    <h4 className="font-black text-slate-900 text-base leading-tight">{item.district}</h4>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{item.division} Division</span>
                  </div>
                  {item.population && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {(item.population / 1000000).toFixed(2)}M Pop
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 my-3 text-xs">
                  <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-slate-50 font-semibold">
                    <span className="text-slate-600">Attack Rate (/ 100k):</span>
                    <span className="font-black" style={{ color }}>{attackRate}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 px-2">
                    <span className="text-slate-500">Suspected Cases:</span>
                    <span className="font-bold text-blue-600">{item.suspected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 px-2">
                    <span className="text-slate-500">Confirmed Cases:</span>
                    <span className="font-bold text-purple-600">{item.confirmed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 px-2">
                    <span className="text-slate-500">Inpatients Admitted:</span>
                    <span className="font-bold text-orange-600">{item.hospitalized.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 px-2">
                    <span className="text-slate-500">Reported Deaths:</span>
                    <span className="font-bold text-red-600">{item.deaths.toLocaleString()}</span>
                  </div>
                </div>

                {onSelectDistrict && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDistrict(item.district);
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                      isSelected
                        ? 'bg-slate-800 text-white hover:bg-slate-900'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {isSelected ? '✕ Clear District Filter' : '🎯 Filter Dashboard to District'}
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
