"use client";

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Minus } from 'lucide-react';

interface TimeseriesPoint {
  date: string;
  suspected: number;
  confirmed: number;
  deaths: number;
  hospitalized: number;
}

interface EpiInsightsProps {
  apiEndpoint?: string;
}

export default function EpiInsights({ apiEndpoint = '/api/reports/timeseries' }: EpiInsightsProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<TimeseriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    const fetchTimeseries = async () => {
      try {
        const res = await fetch(`${apiEndpoint}?days=${range}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch timeseries:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeseries();
  }, [range, apiEndpoint]);

  // Compute growth rate
  const growthRateData = useMemo(() => {
    if (data.length < 2) return [];
    return data.slice(1).map((d, i) => {
      const prev = data[i].confirmed;
      const curr = d.confirmed;
      const rate = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      return { date: d.date, growthRate: Math.round(rate * 10) / 10 };
    });
  }, [data]);

  // Compute 7-day moving average
  const movingAvgData = useMemo(() => {
    if (data.length < 7) return data.map(d => ({ date: d.date, movingAvg: d.confirmed, raw: d.confirmed }));
    return data.map((d, i) => {
      if (i < 6) return { date: d.date, movingAvg: d.confirmed, raw: d.confirmed };
      const window = data.slice(i - 6, i + 1);
      const avg = window.reduce((s, p) => s + p.confirmed, 0) / 7;
      return { date: d.date, movingAvg: Math.round(avg * 10) / 10, raw: d.confirmed };
    });
  }, [data]);

  // Compute Rₜ (simplified Cori method, serial interval = 12 days for measles)
  const rtValue = useMemo(() => {
    const serialInterval = 12;
    if (data.length < serialInterval + 1) return null;
    const recent = data.slice(-1)[0]?.confirmed || 0;
    const pastWindow = data.slice(-(serialInterval + 1), -1);
    const avgPast = pastWindow.reduce((s, p) => s + p.confirmed, 0) / pastWindow.length;
    if (avgPast === 0) return null;
    return Math.round((recent / avgPast) * 100) / 100;
  }, [data]);

  const rtStatus = rtValue === null ? 'unknown' : rtValue < 0.95 ? 'declining' : rtValue > 1.05 ? 'growing' : 'stable';
  const rtColors: Record<string, string> = {
    declining: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    stable: 'bg-amber-50 text-amber-700 border-amber-200',
    growing: 'bg-rose-50 text-rose-700 border-rose-200',
    unknown: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  const rtIcons: Record<string, React.ReactNode> = {
    declining: <TrendingDown className="w-6 h-6 text-emerald-500" />,
    stable: <Minus className="w-6 h-6 text-amber-500" />,
    growing: <TrendingUp className="w-6 h-6 text-rose-500" />,
    unknown: <Activity className="w-6 h-6 text-slate-400" />,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[300px] bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const formattedData = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const formattedGrowth = growthRateData.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const formattedMA = movingAvgData.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="space-y-6">
      {/* Header with range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-50 rounded-lg">
            <Activity className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">{t('epi.title')}</h3>
        </div>
        <div className="flex gap-2">
          {[30, 60, 90].map(days => (
            <button
              key={days}
              onClick={() => setRange(days)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                range === days
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t(`epi.last${days}Days`)}
            </button>
          ))}
        </div>
      </div>

      {/* Rₜ Metric Card */}
      <div className={`p-6 rounded-2xl border-2 flex items-center gap-5 ${rtColors[rtStatus]}`}>
        <div className="p-3 bg-white/80 rounded-xl shadow-sm">
          {rtIcons[rtStatus]}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-70">{t('epi.reproductionNumber')}</p>
          <p className="text-4xl font-black mt-1 tabular-nums">{rtValue !== null ? rtValue.toFixed(2) : 'N/A'}</p>
          <p className="text-sm font-medium mt-0.5">
            {rtStatus === 'declining' && t('epi.rtDeclining')}
            {rtStatus === 'stable' && t('epi.rtStable')}
            {rtStatus === 'growing' && t('epi.rtGrowing')}
            {rtStatus === 'unknown' && 'Insufficient data'}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disease Trends */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-lg font-bold text-slate-800 mb-4">{t('epi.diseaseTrends')}</h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="suspected" stroke="#6366f1" strokeWidth={2} dot={false} name={t('epi.suspectedCases')} />
                <Line type="monotone" dataKey="confirmed" stroke="#8b5cf6" strokeWidth={2} dot={false} name={t('epi.confirmedCases')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Rate */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-lg font-bold text-slate-800 mb-4">{t('epi.growthRate')}</h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} unit="%" />
                <Tooltip formatter={(value: any) => [`${value}%`, t('epi.growthRate')]} />
                <Line type="monotone" dataKey="growthRate" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Moving Average */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <h4 className="text-lg font-bold text-slate-800 mb-4">{t('epi.movingAverage')}</h4>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedMA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="raw" stroke="#cbd5e1" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name={t('epi.dailyCases')} />
                <Line type="monotone" dataKey="movingAvg" stroke="#8b5cf6" strokeWidth={2.5} dot={false} name={t('epi.movingAverage')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
