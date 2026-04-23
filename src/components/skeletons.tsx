"use client";

import React from 'react';

export function KPICardSkeleton() {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-8">
        <div className="w-14 h-14 rounded-2xl bg-slate-100" />
      </div>
      <div className="space-y-3">
        <div className="h-2.5 w-20 bg-slate-100 rounded-full" />
        <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        <div className="h-2 w-16 bg-slate-100 rounded-full" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-2xl animate-pulse">
      <div className="h-24 bg-slate-800 rounded-t-[3.5rem]" />
      <div className="p-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-50 rounded-xl" style={{ opacity: 1 - (i * 0.08) }} />
        ))}
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <div className="h-6 w-48 bg-slate-200 rounded-lg mb-4" />
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-slate-100 rounded-full" />
          <div className="h-8 w-28 bg-slate-100 rounded-full" />
          <div className="h-8 w-32 bg-slate-100 rounded-full" />
        </div>
      </div>
      <div className="p-4">
        <div className="h-[650px] w-full bg-gradient-to-b from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-300 rounded-full animate-spin mx-auto" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Loading Map Data</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-50 rounded-lg" />
          <div className="h-6 w-40 bg-slate-200 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-slate-100 rounded-full" />
          <div className="h-8 w-16 bg-slate-100 rounded-full" />
          <div className="h-8 w-16 bg-slate-100 rounded-full" />
        </div>
      </div>
      {/* Rt card skeleton */}
      <div className="h-24 bg-slate-50 rounded-2xl border-2 border-slate-100" />
      {/* Chart grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-[340px] bg-white rounded-2xl border border-slate-200 p-6 ${i === 3 ? 'lg:col-span-2' : ''}`}>
            <div className="h-5 w-32 bg-slate-100 rounded-lg mb-6" />
            <div className="h-full w-full bg-slate-50 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
