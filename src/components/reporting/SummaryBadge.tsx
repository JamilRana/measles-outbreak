"use client";

import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface SummaryBadgeProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue';
  trend?: 'up' | 'down' | 'neutral';
}

export default function SummaryBadge({
  label,
  value,
  icon: Icon,
  color,
  trend
}: SummaryBadgeProps) {
  const colors = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700 icon-bg-indigo-500',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700 icon-bg-emerald-500',
    rose: 'bg-rose-50 border-rose-100 text-rose-700 icon-bg-rose-500',
    amber: 'bg-amber-50 border-amber-100 text-amber-700 icon-bg-amber-500',
    blue: 'bg-blue-50 border-blue-100 text-blue-700 icon-bg-blue-500'
  };

  const iconColors = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`${colors[color]} border rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${iconColors[color]} text-white shadow-lg shadow-black/10`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5">{label}</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tabular-nums tracking-tight">
              {value.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      {trend && (
        <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
          trend === 'up' ? 'bg-rose-100 text-rose-700' : 
          trend === 'down' ? 'bg-emerald-100 text-emerald-700' : 
          'bg-slate-100 text-slate-600'
        }`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'}
        </div>
      )}
    </motion.div>
  );
}
