"use client";

import React, { useMemo } from 'react';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';

interface StatSet {
  suspected: number;
  confirmed: number;
  admitted: number;
  recovered: number;
  confirmedDeath: number;
  suspectedDeath: number;
  serumSent: number;
  icuAdmitted: number;
  referral: number;
}

interface BreakdownTableProps {
  reports: any[];
  toBnNum: (num: number | string) => string;
  selectedDivision?: string | null;
  selectedDistrict?: string | null;
  onDivisionChange?: (div: string | null) => void;
  onDistrictChange?: (dist: string | null) => void;
  showFilters?: boolean;
  mode?: '24h' | 'cumulative' | 'both';
  dateKey?: string;
}

export default function BreakdownTable({
  reports,
  toBnNum,
  selectedDivision,
  selectedDistrict,
  onDivisionChange,
  onDistrictChange,
  showFilters = false,
  mode = 'both',
  dateKey
}: BreakdownTableProps) {
  const processedData = useMemo(() => {
    const data: Record<string, StatSet> = {};
    
    const targetLocations = selectedDivision 
      ? (DISTRICTS[selectedDivision] || []).map(d => ({ name: d, type: 'district' }))
      : DIVISIONS.map(d => ({ name: d, type: 'division' }));
    
    targetLocations.forEach(loc => {
      data[loc.name] = {
        suspected: 0, confirmed: 0, admitted: 0, recovered: 0,
        confirmedDeath: 0, suspectedDeath: 0, serumSent: 0, icuAdmitted: 0, referral: 0
      };
    });

    reports.forEach(r => {
      const loc = selectedDivision ? r.facility?.district : r.facility?.division;
      if (!loc || !data[loc]) return;
      
      const rDate = r.reportingDate?.split('T')[0];
      const isTargetDate = !dateKey || rDate === dateKey;
      if (dateKey && !isTargetDate) return;

      const add = (key: string, val: number) => {
        if (key === 'suspected') data[loc].suspected += val;
        else if (key === 'confirmed') data[loc].confirmed += val;
        else if (key === 'admitted') data[loc].admitted += val;
        else if (key === 'recovered') data[loc].recovered += val;
        else if (key === 'confirmedDeath') data[loc].confirmedDeath += val;
        else if (key === 'suspectedDeath') data[loc].suspectedDeath += val;
        else if (key === 'serumSent') data[loc].serumSent += val;
        else if (key === 'icuAdmitted') data[loc].icuAdmitted += val;
        else if (key === 'referral') data[loc].referral += val;
      };

      add('suspected', Number(r.suspected24h) || 0);
      add('confirmed', Number(r.confirmed24h) || 0);
      add('admitted', Number(r.admitted24h) || 0);
      add('recovered', Number(r.discharged24h) || 0);
      add('confirmedDeath', Number(r.confirmedDeath24h) || 0);
      add('suspectedDeath', Number(r.suspectedDeath24h) || 0);
      add('serumSent', Number(r.serumSent24h) || 0);
      add('icuAdmitted', Number(r.icuAdmitted24h) || 0);
      add('referral', Number(r.referral24h) || 0);
    });

    const totals: StatSet = { suspected: 0, confirmed: 0, admitted: 0, recovered: 0, confirmedDeath: 0, suspectedDeath: 0, serumSent: 0, icuAdmitted: 0, referral: 0 };
    Object.values(data).forEach(d => {
      totals.suspected += d.suspected;
      totals.confirmed += d.confirmed;
      totals.admitted += d.admitted;
      totals.recovered += d.recovered;
      totals.confirmedDeath += d.confirmedDeath;
      totals.suspectedDeath += d.suspectedDeath;
      totals.serumSent += d.serumSent;
      totals.icuAdmitted += d.icuAdmitted;
      totals.referral += d.referral;
    });

    const entries = Object.entries(data).filter(([_, v]) => 
      v.suspected > 0 || v.confirmed > 0 || v.admitted > 0 || v.recovered > 0 || v.confirmedDeath > 0 || v.suspectedDeath > 0
    );
    
    return { data, totals, entries, locationType: selectedDivision ? 'district' : 'division' };
  }, [reports, selectedDivision, selectedDistrict, dateKey]);

  const cellStyle = (val: number, isCritical = false) => {
    if (val === 0) return 'text-slate-200 font-medium';
    if (isCritical && val > 0) return 'text-rose-600 font-black';
    return 'text-slate-900 font-black';
  };

  const colSpan24h = mode === 'cumulative' ? 0 : (mode === 'both' ? 7 : 7);
  const colSpanCum = mode === '24h' ? 0 : (mode === 'both' ? 6 : 6);

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex items-center gap-3">
          <select
            value={selectedDivision || ''}
            onChange={(e) => { onDivisionChange?.(e.target.value || null); onDistrictChange?.(null); }}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Divisions (National)</option>
            {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          
          {selectedDivision && DISTRICTS[selectedDivision] && (
            <select
              value={selectedDistrict || ''}
              onChange={(e) => onDistrictChange?.(e.target.value || null)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Districts</option>
              {DISTRICTS[selectedDivision]?.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>
      )}

      <div className="overflow-hidden border border-slate-200 rounded-xl">
        <table className="w-full text-center border-collapse text-[10px] min-w-[1000px]">
          <thead className="bg-slate-900 text-white font-black uppercase tracking-wider">
            {mode === 'both' && (
              <tr className="bg-slate-800 text-slate-400 border-b border-slate-700">
                <th className="py-3" colSpan={7}>LAST 24 HOUR SURVEILLANCE</th>
                <th className="py-3 bg-slate-700" colSpan={6}>TOTAL OUTBREAK VOLUME (CUMULATIVE)</th>
              </tr>
            )}
            <tr className="border-t border-slate-800">
              <th className="py-4 px-4 border-r border-slate-800 text-left w-[12%]" rowSpan={2}>
                {processedData.locationType === 'division' ? 'Division' : 'District'}
              </th>
              {mode !== 'cumulative' && (
                <>
                  <th className="py-2 border-r border-slate-800 bg-slate-800/20" colSpan={2}>Suspected</th>
                  <th className="py-2 border-r border-slate-800 bg-slate-800/20" colSpan={2}>Confirmed</th>
                  <th className="py-2 border-r border-slate-800">Adm.</th>
                  <th className="py-2 border-r border-slate-800">Dis.</th>
                  <th className="py-2 border-r border-slate-800">Ref.</th>
                  <th className="py-2 border-r border-slate-800">S.Lab</th>
                </>
              )}
              {mode !== '24h' && (
                <>
                  <th className="py-2 bg-slate-800/40 border-r border-slate-700" colSpan={2}>Suspected</th>
                  <th className="py-2 bg-slate-800/40 border-r border-slate-700" colSpan={2}>Confirmed</th>
                  <th className="py-2 bg-slate-800/40 border-r border-slate-700">Adm.</th>
                  <th className="py-2 bg-slate-800/40 border-r border-slate-700">Dis.</th>
                  <th className="py-2 bg-slate-800/40 border-r border-slate-700">Ref.</th>
                  <th className="py-2 bg-slate-800/40">S.Lab</th>
                </>
              )}
            </tr>
            <tr className="bg-slate-800 text-[8px] border-t border-slate-700">
              {mode !== 'cumulative' && (
                <>
                  <th className="py-2 border-r border-slate-800">Cases</th>
                  <th className="py-2 border-r border-slate-800">Deaths</th>
                  <th className="py-2 border-r border-slate-800">Cases</th>
                  <th className="py-2 border-r border-slate-800 font-bold">Deaths</th>
                  <th className="py-2 border-r border-slate-800">Vol.</th>
                  <th className="py-2 border-r border-slate-800">Vol.</th>
                  <th className="py-2 border-r border-slate-800">Vol.</th>
                  <th className="py-2 border-r border-slate-800">Vol.</th>
                </>
              )}
              {mode !== '24h' && (
                <>
                  <th className="py-2 border-r border-slate-700">Total</th>
                  <th className="py-2 border-r border-slate-700">Total</th>
                  <th className="py-2 border-r border-slate-700">Total</th>
                  <th className="py-2 border-r border-slate-700 font-bold">Total</th>
                  <th className="py-2 border-r border-slate-700">Total</th>
                  <th className="py-2 border-r border-slate-700">Total</th>
                  <th className="py-2 border-r border-slate-700">Total</th>
                  <th className="py-2">Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-bold tabular-nums text-slate-800 bg-white">
            {processedData.entries.length === 0 ? (
              <tr>
                <td colSpan={17} className="py-12 text-slate-400 font-medium">
                  No data available for selected filters
                </td>
              </tr>
            ) : (
              processedData.entries.map(([name, stats]: [string, StatSet]) => (
                <tr key={name} className="hover:bg-slate-50 transition-colors border-b border-slate-50">
                  <td className="py-3 px-4 text-left font-black text-slate-900 bg-slate-50/50 border-r border-slate-100">
                    {name}
                  </td>
                  
                  {mode !== 'cumulative' && (
                    <>
                      <td className={`py-3 ${cellStyle(stats.suspected)}`}>{toBnNum(stats.suspected)}</td>
                      <td className={`py-3 ${cellStyle(stats.suspectedDeath)}`}>{toBnNum(stats.suspectedDeath)}</td>
                      <td className={`py-3 ${cellStyle(stats.confirmed)}`}>{toBnNum(stats.confirmed)}</td>
                      <td className={`py-3 ${cellStyle(stats.confirmedDeath, true)}`}>{toBnNum(stats.confirmedDeath)}</td>
                      <td className={`py-3 ${cellStyle(stats.admitted)}`}>{toBnNum(stats.admitted)}</td>
                      <td className={`py-3 border-r border-slate-100 ${cellStyle(stats.recovered)}`}>{toBnNum(stats.recovered)}</td>
                      <td className={`py-3 ${cellStyle(stats.referral)}`}>{toBnNum(stats.referral)}</td>
                      <td className={`py-3 ${cellStyle(stats.serumSent)}`}>{toBnNum(stats.serumSent)}</td>
                    </>
                  )}
                  
                  {mode !== '24h' && (
                    <>
                      <td className="py-3 bg-slate-50/30">{toBnNum(stats.suspected)}</td>
                      <td className="py-3 bg-slate-50/30 text-slate-400">{toBnNum(stats.suspectedDeath)}</td>
                      <td className="py-3 bg-slate-50/30 font-black">{toBnNum(stats.confirmed)}</td>
                      <td className="py-3 bg-slate-50/30 text-rose-700 font-black">{toBnNum(stats.confirmedDeath)}</td>
                      <td className="py-3 bg-slate-50/30">{toBnNum(stats.admitted)}</td>
                      <td className="py-3 bg-slate-50/30">{toBnNum(stats.recovered)}</td>
                      <td className="py-3 bg-slate-50/30">{toBnNum(stats.referral)}</td>
                      <td className="py-3 bg-slate-50/30">{toBnNum(stats.serumSent)}</td>
                    </>
                  )}
                </tr>
              ))
            )}
            
            <tr className="bg-slate-900 text-white font-black text-xs">
              <td className="py-5 px-4 text-left border-r border-slate-800">
                {selectedDivision ? 'DIVISION TOTAL' : 'NATIONAL AGGREGATE'}
              </td>
              {mode !== 'cumulative' && (
                <>
                  <td className="py-5">{toBnNum(processedData.totals.suspected)}</td>
                  <td className="py-5">{toBnNum(processedData.totals.suspectedDeath)}</td>
                  <td className="py-5">{toBnNum(processedData.totals.confirmed)}</td>
                  <td className="py-5 text-rose-400">{toBnNum(processedData.totals.confirmedDeath)}</td>
                  <td className="py-5">{toBnNum(processedData.totals.admitted)}</td>
                  <td className="py-5 border-r border-slate-800">{toBnNum(processedData.totals.recovered)}</td>
                  <td className="py-5">{toBnNum(processedData.totals.referral)}</td>
                  <td className="py-5">{toBnNum(processedData.totals.serumSent)}</td>
                </>
              )}
              {mode !== '24h' && (
                <>
                  <td className="py-5 bg-slate-800">{toBnNum(processedData.totals.suspected)}</td>
                  <td className="py-5 bg-slate-800">{toBnNum(processedData.totals.suspectedDeath)}</td>
                  <td className="py-5 bg-slate-800">{toBnNum(processedData.totals.confirmed)}</td>
                  <td className="py-5 bg-slate-800 text-rose-500">{toBnNum(processedData.totals.confirmedDeath)}</td>
                  <td className="py-5 bg-slate-800">{toBnNum(processedData.totals.admitted)}</td>
                  <td className="py-5 bg-slate-800">{toBnNum(processedData.totals.recovered)}</td>
                  <td className="py-5 bg-slate-800">{toBnNum(processedData.totals.referral)}</td>
                  <td className="py-5 bg-slate-800">{toBnNum(processedData.totals.serumSent)}</td>
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}