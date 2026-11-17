"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2, Timer } from 'lucide-react';

interface DeadlineCardProps {
  submissionOpenHour?: number;
  submissionOpenMinute?: number;
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
  windowStatus?: { open: boolean; type: string | null; details: any } | null;
  variant?: 'default' | 'slim';
}

const CountdownTimer = ({ targetTime, label, urgency, variant = 'default' }: { targetTime: Date; label: string; urgency: 'low' | 'medium' | 'high' | 'expired'; variant?: 'default' | 'slim' }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, isExpired: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  if (variant === 'slim') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-black text-red-600 tabular-nums">
          {!mounted ? '--:--:--' : timeLeft.isExpired ? 'EXPIRED' : 
            `${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest leading-none">{label}</p>
      <div className="bg-red-100/50 px-5 py-1.5 rounded-lg border border-red-200">
        <p className="text-sm font-black text-red-600 tabular-nums leading-none">
          {!mounted ? '--:--:--' : timeLeft.isExpired ? 'EXPIRED' : 
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
  isToday,
  windowStatus,
  variant = 'default'
}: DeadlineCardProps) {
  const targetTime = new Date();
  targetTime.setHours(cutoffHour, cutoffMinute, 0, 0);

  const timeUntilCutoff = targetTime.getTime() - Date.now();
  let urgency: 'low' | 'medium' | 'high' | 'expired' = 'low';
  
  if (isPastCutoff) urgency = 'expired';
  else if (timeUntilCutoff < 30 * 60 * 1000) urgency = 'high';
  else if (timeUntilCutoff < 2 * 60 * 60 * 1000) urgency = 'medium';

  const getStatus = () => {
    // Phase 4: Prioritize verified window overrides from gatekeeper
    if (windowStatus?.open) {
      if (windowStatus.type === 'BACKLOG') {
        return {
          title: 'Backlog Window Open',
          message: 'Special backlog reporting window is currently active for your location.',
          color: 'indigo',
          icon: CheckCircle2
        };
      }
      if (windowStatus.type === 'WINDOW') {
        const detail = windowStatus.details?.name || 'Administrative';
        return {
          title: `${detail} Window Open`,
          message: 'An extended reporting window has been authorized for this session.',
          color: 'emerald',
          icon: CheckCircle2
        };
      }
      return {
        title: 'Reporting Window Open',
        message: `Accepting data for ${new Date(selectedDate || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`,
        color: 'emerald',
        icon: CheckCircle2
      };
    }

    if (windowStatus?.type === 'DAILY_NOT_YET_OPEN') {
      return {
        title: 'Reporting Not Yet Open',
        message: `Today's window opens at ${windowStatus.details?.opensAt} BST.`,
        color: 'slate',
        icon: Clock
      };
    }

    if (!isToday) {
       const dateToCheck = new Date(selectedDate || '');
       const start = backlogStartDate ? new Date(backlogStartDate) : null;
       const end = backlogEndDate ? new Date(backlogEndDate) : null;
       const isInBacklog = allowBacklog && (!start || dateToCheck >= start) && (!end || dateToCheck <= end);
       
       if (isInBacklog) return {
         title: 'Backlog Window Available',
         message: 'Backlog reporting is currently permitted for this period.',
         color: 'indigo',
         icon: CheckCircle2
       };
       return {
         title: 'Reporting Locked',
         message: 'This date is outside the allowed reporting window.',
         color: 'slate',
         icon: Clock
       };
    }

    if (mode === 'VIEW' && isPastEditDeadline) return { 
      title: 'Reporting Window Closed', 
      message: 'Deadline for editing has passed. Data is locked.',
      color: 'slate',
      icon: Clock
    };

    if (isPastCutoff) return {
      title: 'Standard Window Closed',
      message: `Daily submission closed at ${String(cutoffHour).padStart(2, '0')}:${String(cutoffMinute).padStart(2, '0')}.`,
      color: 'amber',
      icon: AlertTriangle
    };

    if (urgency === 'high') return {
      title: 'Deadline Approaching',
      message: 'Please complete your submission quickly.',
      color: 'red',
      icon: AlertCircle
    };

    return {
      title: 'Reporting Window Open',
      message: `Submit your daily data by ${String(cutoffHour).padStart(2, '0')}:${String(cutoffMinute).padStart(2, '0')} BST.`,
      color: 'emerald',
      icon: CheckCircle2
    };
  };

  const status = getStatus();
  const theme: Record<string, any> = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', title: 'text-emerald-900' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', title: 'text-amber-900' },
    red: { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100', iconColor: 'text-red-600', title: 'text-red-900' },
    slate: { bg: 'bg-slate-50', border: 'border-slate-200', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', title: 'text-slate-900' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', title: 'text-indigo-900' }
  };
  const currentTheme = theme[status.color];
  const StatusIcon = status.icon;

  if (variant === 'slim') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${currentTheme.bg} ${currentTheme.border} border-b px-6 py-3 shadow-sm sticky top-0 z-[60] flex items-center justify-between gap-4 backdrop-blur-md bg-opacity-90`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 ${currentTheme.iconBg} rounded-md ${currentTheme.iconColor}`}>
             <StatusIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className={`text-xs font-black tracking-tight ${currentTheme.title}`}>
              {status.title}
            </h3>
            <p className="text-slate-500 text-[10px] font-bold opacity-80 hidden md:block">
              {status.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isPastCutoff && isToday && (
            <CountdownTimer targetTime={targetTime} label="Closing In:" urgency={urgency} variant="slim" />
          )}
          {status.color === 'red' && (
            <div className="animate-pulse flex items-center gap-1 text-[10px] font-black text-red-600 uppercase">
              <Timer className="w-3 h-3" />
              Action Required
            </div>
          )}
        </div>
      </motion.div>
    );
  }

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
          <p className="text-slate-600 text-[11px] font-medium leading-relaxed max-w-sm mx-auto">
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
