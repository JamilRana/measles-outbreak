"use client";

import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface ReportingCardProps {
  title: string;
  icon: LucideIcon;
  gradient?: string;
  iconColor?: string;
  children: React.ReactNode;
}

export default function ReportingCard({
  title,
  icon: Icon,
  gradient = "from-slate-50 to-white",
  iconColor = "text-indigo-600",
  children
}: ReportingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden"
    >
      <div className={`px-8 py-6 border-b border-slate-100 bg-gradient-to-r ${gradient} flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl bg-white shadow-sm ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-black tracking-tight text-slate-800">{title}</h3>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
        </div>
      </div>
      <div className="p-8">
        {children}
      </div>
    </motion.div>
  );
}
