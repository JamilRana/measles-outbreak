"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar,
  User as UserIcon,
  Activity,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  RefreshCcw,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import Breadcrumbs from '@/components/Breadcrumbs';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  createdAt: string;
  user: {
    name: string;
    role: string;
  };
}

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } finally {
      setLoading(false);
    }
  };

  if (session?.user?.role !== 'ADMIN') return <p>Access Denied</p>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <Breadcrumbs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase">Audit Infrastructure</h1>
          <p className="text-slate-500 font-medium tracking-tight">Immutable log of all administrative and reporting actions</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
        >
          <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Entity</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-slate-600">
                       <Clock className="w-3.5 h-3.5 text-slate-300" />
                       <span className="text-xs font-bold tabular-nums">
                         {new Date(log.createdAt).toLocaleString()}
                       </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                         {log.user?.name?.charAt(0) || 'U'}
                       </div>
                       <div>
                         <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{log.user?.name}</p>
                         <p className="text-[10px] font-bold text-indigo-500 uppercase">{log.user?.role}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black tracking-widest uppercase ${
                      log.action.includes('DELETE') ? 'bg-rose-50 text-rose-600' :
                      log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-slate-500 capitalize">{log.entityType}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <p className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-widest">{log.entityId}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {logs.length === 0 && !loading && (
          <div className="py-24 text-center">
             <ShieldCheck className="w-16 h-16 text-slate-100 mx-auto mb-4" />
             <p className="text-slate-400 font-medium">No audit events recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
