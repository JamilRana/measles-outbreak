"use client";

import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet';
import { MapPin, ArrowLeft, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import bdGeoJsonRaw from '@/data/bangladesh-districts.json';
import { normalizeDistrictName, normalizeDivisionName } from '@/lib/bd-districts';

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

export type MetricMode = 'confirmed' | 'suspected' | 'hospitalized' | 'deaths' | 'attackRate';

interface Props {
  geoData: GeoData[];
  metricMode: MetricMode;
  selectedDistrict?: string | null;
  selectedDivision?: string | null;
  onSelectDistrict?: (district: string) => void;
  onSelectDivision?: (division: string) => void;
}

// Light theme clinical color scale generator tailored for epidemiologists
export function getMetricColor(val: number, mode: MetricMode): string {
  if (val <= 0) return '#f1f5f9'; // clean slate-100 for zero reporting

  if (mode === 'confirmed') {
    if (val >= 200) return '#1e3a8a'; // deep blue 900
    if (val >= 100) return '#1d4ed8'; // blue 700
    if (val >= 40) return '#2563eb';  // blue 600
    if (val >= 15) return '#60a5fa';  // blue 400
    return '#bfdbfe';                 // blue 200
  }

  if (mode === 'suspected') {
    if (val >= 500) return '#7c2d12'; // orange 900
    if (val >= 200) return '#c2410c'; // orange 700
    if (val >= 80) return '#ea580c';  // orange 600
    if (val >= 25) return '#fb923c';  // orange 400
    return '#fed7aa';                 // orange 200
  }

  if (mode === 'hospitalized') {
    if (val >= 200) return '#064e3b'; // emerald 900
    if (val >= 100) return '#047857'; // emerald 700
    if (val >= 40) return '#059669';  // emerald 600
    if (val >= 15) return '#34d399';  // emerald 400
    return '#a7f3d0';                 // emerald 200
  }

  if (mode === 'deaths') {
    if (val >= 10) return '#881337'; // rose 900
    if (val >= 5) return '#be123c';  // rose 700
    if (val >= 2) return '#e11d48';  // rose 600
    return '#fda4af';                // rose 300
  }

  if (mode === 'attackRate') {
    // Attack rate per 100,000 population (DGHS & WHO epidemic thresholds)
    if (val >= 50) return '#7f1d1d'; // Critical (>50/100k)
    if (val >= 20) return '#dc2626'; // Severe (20-50/100k)
    if (val >= 10) return '#ea580c'; // High (10-20/100k)
    if (val >= 3) return '#f59e0b';  // Moderate (3-10/100k)
    return '#10b981';                // Low (<3/100k)
  }

  return '#93c5fd';
}

/**
 * Pure GeoJSON Lat/Lng bounding box calculator:
 * Traverses polygon coordinates to compute [[minLat, minLng], [maxLat, maxLng]]
 */
function getGeoJsonBounds(featureOrFeatures: any): [[number, number], [number, number]] | null {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  let count = 0;

  function traverse(coords: any) {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const lng = coords[0];
      const lat = coords[1];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      count++;
    } else {
      coords.forEach(traverse);
    }
  }

  const features = Array.isArray(featureOrFeatures)
    ? featureOrFeatures
    : featureOrFeatures.type === 'FeatureCollection'
      ? featureOrFeatures.features
      : [featureOrFeatures];

  features.forEach((f: any) => {
    if (f?.geometry?.coordinates) {
      traverse(f.geometry.coordinates);
    }
  });

  if (count === 0) return null;
  return [[minLat, minLng], [maxLat, maxLng]];
}

/**
 * Internal Map Controller:
 * Handles smooth animated zoom-in on Division / District selection,
 * and smooth zoom-out to all of Bangladesh on deselection.
 */
function MapViewController({
  selectedDivision,
  selectedDistrict,
  geoJsonData,
}: {
  selectedDivision?: string | null;
  selectedDistrict?: string | null;
  geoJsonData: any;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const normDist = selectedDistrict ? normalizeDistrictName(selectedDistrict).toLowerCase() : '';
    const normDiv = selectedDivision ? normalizeDivisionName(selectedDivision).toLowerCase() : '';

    // 1. Zoom in to selected District (e.g. Barguna)
    if (normDist) {
      const feature = geoJsonData.features?.find((f: any) => {
        const d = normalizeDistrictName(f.properties?.district || f.properties?.ADM2_EN).toLowerCase();
        return d === normDist;
      });

      if (feature) {
        const bounds = getGeoJsonBounds(feature);
        if (bounds) {
          map.fitBounds(bounds, {
            padding: [60, 60],
            maxZoom: 9,
            animate: true,
            duration: 0.8,
          });
          return;
        }
      }
    }

    // 2. Zoom in to selected Division (e.g. Barisal / Barishal)
    if (normDiv) {
      const divisionFeatures = geoJsonData.features?.filter((f: any) => {
        const div = normalizeDivisionName(f.properties?.division || f.properties?.ADM1_EN).toLowerCase();
        return div === normDiv;
      });

      if (divisionFeatures && divisionFeatures.length > 0) {
        const bounds = getGeoJsonBounds(divisionFeatures);
        if (bounds) {
          map.fitBounds(bounds, {
            padding: [45, 45],
            maxZoom: 8,
            animate: true,
            duration: 0.8,
          });
          return;
        }
      }
    }

    // 3. Deselected -> Zoom out to show all of Bangladesh
    map.flyTo([23.8, 90.3], 7, {
      animate: true,
      duration: 0.8,
    });
  }, [selectedDivision, selectedDistrict, geoJsonData, map]);

  return null;
}

export default function OutbreakMapInner({
  geoData,
  metricMode,
  selectedDistrict,
  selectedDivision,
  onSelectDistrict,
  onSelectDivision,
}: Props) {
  const { i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const toBnDigits = (str: string | number | null | undefined) => {
    if (str == null || str === "") return "";
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(str).replace(/[0-9]/g, (d) => bnNums[parseInt(d, 10)]);
  };

  const toBnNum = (n: number | string | null | undefined) => {
    if (n == null || n === '') return '0';
    const num = typeof n === 'number' ? n : Number(n);
    if (isNaN(num)) return i18n.language === 'bn' ? toBnDigits(n) : String(n);
    if (i18n.language !== 'bn') return num.toLocaleString('en-US');
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num
      .toLocaleString('en-US')
      .toString()
      .split('')
      .map(char => {
        const digit = parseInt(char, 10);
        return !isNaN(digit) ? bnNums[digit] : char;
      })
      .join('');
  };

  // Single React-managed state for hovered polygon card (avoids multi-card leakage)
  const [hovered, setHovered] = useState<{
    name: string;
    division: string;
    data?: GeoData;
    x: number;
    y: number;
  } | null>(null);

  // Bounding box for Bangladesh coordinates
  const bangladeshBounds: [[number, number], [number, number]] = [
    [20.4, 88.0],
    [26.7, 92.7],
  ];

  // Fast dictionary lookup for district data
  const dataMap = useMemo(() => {
    const map = new Map<string, GeoData>();
    for (const item of geoData) {
      const canonical = normalizeDistrictName(item.district).toLowerCase();
      map.set(canonical, item);
    }
    return map;
  }, [geoData]);

  // Compute metric value for a given district
  const getDistrictMetric = useCallback(
    (districtName: string): { val: number; data?: GeoData } => {
      const canonical = normalizeDistrictName(districtName).toLowerCase();
      const item = dataMap.get(canonical);
      if (!item) return { val: 0 };

      const totalCases = (item.confirmed || 0) + (item.suspected || 0);
      const attackRate =
        item.attackRatePer100k ??
        (item.population && item.population > 0
          ? Number(((totalCases / item.population) * 100000).toFixed(2))
          : 0);

      let val = item.confirmed || 0;
      if (metricMode === 'suspected') val = item.suspected || 0;
      else if (metricMode === 'deaths') val = item.deaths || 0;
      else if (metricMode === 'hospitalized') val = item.hospitalized || 0;
      else if (metricMode === 'attackRate') val = attackRate;

      return { val, data: item };
    },
    [dataMap, metricMode]
  );

  // Polygon style definition with visual hierarchy in light theme
  const styleFeature = useCallback(
    (feature: any): PathOptions => {
      const districtName = feature?.properties?.district || feature?.properties?.ADM2_EN || '';
      const divisionName = feature?.properties?.division || feature?.properties?.ADM1_EN || '';
      const canonical = normalizeDistrictName(districtName);

      const { val } = getDistrictMetric(districtName);

      const normSelectedDist = selectedDistrict ? normalizeDistrictName(selectedDistrict).toLowerCase() : '';
      const normSelectedDiv = selectedDivision ? normalizeDivisionName(selectedDivision).toLowerCase() : '';
      const normFeatureDist = canonical.toLowerCase();
      const normFeatureDiv = normalizeDivisionName(divisionName).toLowerCase();

      const isDistrictSelected = normSelectedDist ? normSelectedDist === normFeatureDist : false;
      const isDivisionMatched = normSelectedDiv ? normSelectedDiv === normFeatureDiv : true;

      const baseColor = getMetricColor(val, metricMode);

      // Case 1: Exact District Selected -> Bold cobalt border, rich fill
      if (isDistrictSelected) {
        return {
          fillColor: val > 0 ? baseColor : '#3b82f6',
          fillOpacity: 0.95,
          color: '#1d4ed8',
          weight: 3.5,
          dashArray: '',
          opacity: 1,
        };
      }

      // Case 2: A specific district is selected elsewhere -> Dim non-selected districts
      if (normSelectedDist) {
        return {
          fillColor: isDivisionMatched ? baseColor : '#f8fafc',
          fillOpacity: isDivisionMatched ? 0.45 : 0.2,
          color: isDivisionMatched ? '#94a3b8' : '#e2e8f0',
          weight: isDivisionMatched ? 1 : 0.6,
          opacity: isDivisionMatched ? 0.8 : 0.4,
        };
      }

      // Case 3: Division Selected (without single district) -> Highlight division, dim outer
      if (normSelectedDiv) {
        if (isDivisionMatched) {
          return {
            fillColor: val > 0 ? baseColor : '#e0f2fe',
            fillOpacity: val > 0 ? 0.88 : 0.5,
            color: '#2563eb', // crisp clinical blue boundary
            weight: 1.8,
            opacity: 1,
          };
        } else {
          return {
            fillColor: '#f8fafc',
            fillOpacity: 0.25,
            color: '#e2e8f0',
            weight: 0.6,
            opacity: 0.5,
          };
        }
      }

      // Case 4: Deselected (All Bangladesh) -> Full national light choropleth view
      return {
        fillColor: val > 0 ? baseColor : '#f8fafc',
        fillOpacity: val > 0 ? 0.85 : 0.45,
        color: '#cbd5e1',
        weight: 1.1,
        opacity: 0.9,
      };
    },
    [getDistrictMetric, metricMode, selectedDistrict, selectedDivision]
  );

  // Feature interactions (mouse hover, mouse move, click)
  const onEachFeature = useCallback(
    (feature: any, layer: Layer) => {
      const districtName = feature?.properties?.district || feature?.properties?.ADM2_EN || '';
      const divisionName = feature?.properties?.division || feature?.properties?.ADM1_EN || '';
      const canonical = normalizeDistrictName(districtName);
      const { data } = getDistrictMetric(districtName);

      layer.on({
        mouseover: (e: LeafletMouseEvent) => {
          const target = e.target;
          target.setStyle({
            weight: 2.8,
            color: '#1d4ed8',
            fillOpacity: 0.95,
          });
          if (typeof target.bringToFront === 'function') {
            target.bringToFront();
          }

          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setHovered({
              name: canonical,
              division: normalizeDivisionName(divisionName),
              data,
              x: e.originalEvent.clientX - rect.left,
              y: e.originalEvent.clientY - rect.top,
            });
          }
        },
        mousemove: (e: LeafletMouseEvent) => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setHovered((prev) =>
              prev
                ? {
                    ...prev,
                    x: e.originalEvent.clientX - rect.left,
                    y: e.originalEvent.clientY - rect.top,
                  }
                : null
            );
          }
        },
        mouseout: (e: LeafletMouseEvent) => {
          const target = e.target;
          target.setStyle(styleFeature(feature));
          setHovered(null);
        },
        click: () => {
          const isSelected =
            selectedDistrict &&
            normalizeDistrictName(selectedDistrict).toLowerCase() === canonical.toLowerCase();

          if (isSelected) {
            // Deselecting district
            if (onSelectDistrict) onSelectDistrict('');
          } else {
            // Selecting district
            if (onSelectDistrict) onSelectDistrict(canonical);
          }
        },
      });
    },
    [getDistrictMetric, onSelectDistrict, selectedDistrict, styleFeature]
  );

  // Handle clicking Back button
  const handleBackClick = () => {
    if (selectedDistrict) {
      if (onSelectDistrict) onSelectDistrict('');
    } else if (selectedDivision) {
      if (onSelectDivision) onSelectDivision('');
    }
  };

  // Safe floating card coordinates calculation (clamped inside viewport)
  const cardPos = useMemo(() => {
    if (!hovered) return null;
    const cardW = 240;
    const cardH = 220;
    const containerW = containerRef.current?.clientWidth || 700;
    const containerH = containerRef.current?.clientHeight || 620;

    const posX =
      hovered.x + 20 + cardW > containerW
        ? Math.max(12, hovered.x - cardW - 15)
        : hovered.x + 20;

    const posY = Math.max(
      12,
      Math.min(hovered.y - 40, containerH - cardH - 12)
    );

    return { x: posX, y: posY };
  }, [hovered]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[620px] bg-slate-50/60 rounded-2xl overflow-hidden border border-slate-200/90 select-none"
    >
      {/* 1. In-Map Breadcrumb & Back Navigation (Image 2 pattern) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {(selectedDistrict || selectedDivision) && (
          <button
            type="button"
            onClick={handleBackClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{i18n.language === 'bn' ? 'পেছনে' : 'Back'}</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl text-xs text-slate-600 shadow-sm">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <button
            type="button"
            onClick={() => {
              if (onSelectDistrict) onSelectDistrict('');
              if (onSelectDivision) onSelectDivision('');
            }}
            className={`font-medium transition-colors hover:text-blue-600 cursor-pointer ${
              !selectedDivision && !selectedDistrict ? 'text-slate-900 font-bold' : ''
            }`}
          >
            {i18n.language === 'bn' ? 'বাংলাদেশ' : 'Bangladesh'}
          </button>
          {selectedDivision && (
            <>
              <span className="text-slate-300">/</span>
              <button
                type="button"
                onClick={() => {
                  if (onSelectDistrict) onSelectDistrict('');
                }}
                className={`font-medium transition-colors hover:text-blue-600 cursor-pointer ${
                  selectedDivision && !selectedDistrict ? 'text-slate-900 font-bold' : ''
                }`}
              >
                {selectedDivision}
              </button>
            </>
          )}
          {selectedDistrict && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-blue-700 font-bold">{selectedDistrict}</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Self-contained Vector Choropleth (Zero external tile dependencies) */}
      <MapContainer
        center={[23.8, 90.3]}
        zoom={7}
        minZoom={6}
        maxZoom={10}
        maxBounds={bangladeshBounds}
        maxBoundsViscosity={0.9}
        style={{ height: '100%', width: '100%', background: '#f8fafc' }}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <MapViewController
          selectedDivision={selectedDivision}
          selectedDistrict={selectedDistrict}
          geoJsonData={bdGeoJsonRaw}
        />
        <GeoJSON
          key={`bd-districts-${metricMode}-${selectedDistrict}-${selectedDivision}`}
          data={bdGeoJsonRaw as any}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* 3. Single React-Managed Floating Hover Card (Image 2 pattern) */}
      {hovered && cardPos && (
        <div
          className="absolute z-30 pointer-events-none transition-all duration-75 ease-out"
          style={{
            left: `${cardPos.x}px`,
            top: `${cardPos.y}px`,
          }}
        >
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-2xl p-4 w-60 text-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{i18n.language === 'bn' ? 'জেলা' : 'District'}</span>
            </div>
            <div className="text-base font-black text-slate-900 tracking-tight mb-2.5">
              {hovered.name}
              <span className="ml-1.5 text-xs font-semibold text-slate-400 font-normal">
                {i18n.language === 'bn' ? `(${hovered.division} বিভাগ)` : `(${hovered.division} Div.)`}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {i18n.language === 'bn' ? 'সন্দেহভাজন' : 'Suspected'}
                </span>
                <span className="font-bold text-slate-900">
                  {toBnNum(hovered.data?.suspected || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  {i18n.language === 'bn' ? 'নিশ্চিত' : 'Confirmed'}
                </span>
                <span className="font-bold text-blue-700">
                  {toBnNum(hovered.data?.confirmed || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  {i18n.language === 'bn' ? 'ভর্তি' : 'Hospitalised'}
                </span>
                <span className="font-bold text-slate-900">
                  {toBnNum(hovered.data?.hospitalized || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  {i18n.language === 'bn' ? 'মৃত্যু' : 'Deaths'}
                </span>
                <span
                  className={`font-bold ${
                    (hovered.data?.deaths || 0) > 0 ? 'text-rose-600 font-black' : 'text-slate-400'
                  }`}
                >
                  {toBnNum(hovered.data?.deaths || 0)}
                </span>
              </div>

              {hovered.data?.attackRatePer100k !== undefined && (
                <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    {i18n.language === 'bn' ? 'আক্রমণ হার (/১০০ হাজার):' : 'Attack Rate (/100k):'}
                  </span>
                  <span className="font-mono font-bold text-indigo-700">
                    {toBnNum(hovered.data.attackRatePer100k)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Bottom-Left Context Guidance Pill (Image 2 pattern) */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full text-[11px] font-semibold text-slate-600 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>
            {selectedDistrict
              ? (i18n.language === 'bn' ? 'জুম আউট করতে অন্য জেলা বা পেছনে ক্লিক করুন' : 'Click another district or Back to zoom out')
              : selectedDivision
              ? (i18n.language === 'bn' ? 'ফোকাস করতে একটি জেলা ক্লিক করুন' : 'Click a district to focus')
              : (i18n.language === 'bn' ? 'জুম ইন করতে একটি বিভাগ বা জেলা ক্লিক করুন' : 'Click a division or district to zoom in')}
          </span>
        </div>
      </div>

      {/* 5. Bottom-Right Compact Legend (Image 2 pattern) */}
      <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-2xl p-3 text-xs text-slate-700 min-w-[170px]">
        <div className="font-bold text-[11px] text-slate-700 mb-1.5 capitalize">
          {metricMode === 'attackRate'
            ? (i18n.language === 'bn' ? 'আক্রমণ হার (/১০০ হাজার)' : 'Attack Rate (/100k)')
            : metricMode === 'hospitalized'
            ? (i18n.language === 'bn' ? 'ভর্তিকৃত কেস' : 'Hospitalised Cases')
            : metricMode === 'deaths'
            ? (i18n.language === 'bn' ? 'মৃত্যু' : 'Deaths')
            : metricMode === 'suspected'
            ? (i18n.language === 'bn' ? 'সন্দেহভাজন কেস' : 'Suspected Cases')
            : (i18n.language === 'bn' ? 'নিশ্চিত কেস' : 'Confirmed Cases')}
        </div>
        <div
          className={`h-2 w-full rounded-full mb-1 ${
            metricMode === 'deaths'
              ? 'bg-gradient-to-r from-rose-200 via-rose-500 to-rose-900'
              : metricMode === 'suspected'
              ? 'bg-gradient-to-r from-amber-200 via-amber-500 to-amber-900'
              : metricMode === 'hospitalized'
              ? 'bg-gradient-to-r from-emerald-200 via-emerald-500 to-emerald-900'
              : metricMode === 'attackRate'
              ? 'bg-gradient-to-r from-emerald-400 via-amber-500 to-rose-700'
              : 'bg-gradient-to-r from-blue-200 via-blue-500 to-blue-900'
          }`}
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-1.5">
          <span>{i18n.language === 'bn' ? 'কম' : 'Low'}</span>
          <span>{i18n.language === 'bn' ? 'বেশি' : 'High'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 border-t border-slate-100 pt-1">
          <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-300" />
          <span>{i18n.language === 'bn' ? 'কোন তথ্য নেই / স্বাস্থ্য প্রতিষ্ঠান অপ্রকাশিত' : 'No data / reporting facility'}</span>
        </div>
      </div>
    </div>
  );
}
