"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2, Timer } from 'lucide-react';

interface DeadlineCardProps {
  cutoffHour: number;
  cutoffMinute: number;
  editDeadlineHour: number;
  editDeadlineMinute: number;
  mode: 'CREATE' | 'EDIT' | 'VIEW';
  isPastEditDeadline: boolean;
  isPastCutoff: boolean;
  allowBacklog?: boolean;
  backlogStartDate?: string | null;
  backlogEndDate?: string | null;
  selectedDate?: string;
  isToday?: boolean;
}

const CountdownTimer = ({ targetTime, label, urgency }: { targetTime: Date; label: string; urgency: 'low' | 'medium' | 'high' | 'expired' }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetTime.getTime() - now.getTime();
      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }
      setTimeLeft({
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false
      });
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest leading-none">{label}</p>
      <div className="bg-red-100/50 px-5 py-1.5 rounded-lg border border-red-200">
        <p className="text-sm font-black text-red-600 tabular-nums leading-none">
          {timeLeft.isExpired ? 'EXPIRED' : 
            `${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`}
        </p>
      </div>
    </div>
  );
};

export default function DeadlineCard({
  cutoffHour,
  cutoffMinute,
  editDeadlineHour,
  editDeadlineMinute,
  mode,
  isPastEditDeadline,
  isPastCutoff,
  allowBacklog,
  backlogStartDate,
  backlogEndDate,
  selectedDate,
  isToday
}: DeadlineCardProps) {
  const targetTime = new Date();
  targetTime.setHours(cutoffHour, cutoffMinute, 0, 0);

  const timeUntilCutoff = targetTime.getTime() - Date.now();
  let urgency: 'low' | 'medium' | 'high' | 'expired' = 'low';
  
  if (isPastCutoff) urgency = 'expired';
  else if (timeUntilCutoff < 30 * 60 * 1000) urgency = 'high';
  else if (timeUntilCutoff < 2 * 60 * 60 * 1000) urgency = 'medium';

  const getStatus = () => {
    if (!isToday) {
       const dateToCheck = new Date(selectedDate || '');
       const start = backlogStartDate ? new Date(backlogStartDate) : null;
       const end = backlogEndDate ? new Date(backlogEndDate) : null;
       const isInBacklog = allowBacklog && (!start || dateToCheck >= start) && (!end || dateToCheck <= end);
       
       if (isInBacklog) return {
         title: 'Backlog Window Open',
         message: 'This is a past date, but backlog reporting is currently permitted for this period.',
         color: 'indigo',
         icon: CheckCircle2
       };
       return {
         title: 'Reporting Locked',
         message: 'This date is outside the allowed reporting window. Please contact support to request changes.',
         color: 'slate',
         icon: Clock
       };
    }

    if (mode === 'VIEW' && isPastEditDeadline) return { 
      title: 'Reporting Window Closed', 
      message: 'The deadline for editing this report has passed. Data is locked for analysis.',
      color: 'slate',
      icon: Clock
    };
    if (isPastCutoff && !allowBacklog) return {
      title: 'Standard Window Closed',
      message: `Daily submission closed at ${String(cutoffHour).padStart(2, '0')}:${String(cutoffMinute).padStart(2, '0')}. Contact admin for late reporting.`,
      color: 'amber',
      icon: AlertTriangle
    };
    if (urgency === 'high') return {
      title: 'Deadline Approaching',
      message: 'Please complete your submission quickly. The window is closing soon.',
      color: 'red',
      icon: AlertCircle
    };
    return {
      title: 'Reporting Window Open',
      message: `Submit your daily surveillance data by ${String(cutoffHour).padStart(2, '0')}:${String(cutoffMinute).padStart(2, '0')} BST.`,
      color: 'emerald',
      icon: CheckCircle2
    };
  };

  const status = getStatus();
  const theme: Record<string, any> = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', title: 'text-emerald-900' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', title: 'text-amber-900' },
    red: { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-100', iconColor: 'text-red-600', title: 'text-red-900' },
    slate: { bg: 'bg-slate-50', border: 'border-slate-100', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', title: 'text-slate-900' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', title: 'text-indigo-900' }
  };
  const currentTheme = theme[status.color];

  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${currentTheme.bg} ${currentTheme.border} border rounded-xl p-6 shadow-sm text-center relative overflow-hidden`}
    >
      <div className="absolute top-0 left-0 p-4 opacity-10">
        <StatusIcon className="w-8 h-8 text-current" />
      </div>
      
      <div className="flex flex-col items-center gap-3">
        <div className={`p-2.5 ${currentTheme.iconBg} rounded-lg ${currentTheme.iconColor}`}>
           <StatusIcon className="w-5 h-5" />
        </div>
        
        <div className="space-y-1">
          <h3 className={`text-base font-black tracking-tight ${currentTheme.title} leading-tight`}>
            {status.title}
          </h3>
          <p className="text-slate-500 text-[11px] font-medium leading-relaxed max-w-sm mx-auto">
            {status.message}
          </p>
        </div>

        {!isPastCutoff && isToday && (
          <div className="mt-2">
            <CountdownTimer targetTime={targetTime} label="Time until cutoff:" urgency={urgency} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
