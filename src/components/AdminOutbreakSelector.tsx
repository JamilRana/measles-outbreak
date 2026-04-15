"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, ChevronDown, Loader2 } from "lucide-react";

interface Outbreak {
  id: string;
  name: string;
  status: string;
  disease: {
    name: string;
    code: string;
  };
}

interface AdminOutbreakSelectorProps {
  onSelect: (outbreakId: string) => void;
  defaultValue?: string;
}

export default function AdminOutbreakSelector({ onSelect, defaultValue }: AdminOutbreakSelectorProps) {
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [selectedId, setSelectedId] = useState(defaultValue || "");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOutbreaks() {
      try {
        const res = await fetch("/api/outbreaks"); // Admin route
        if (res.ok) {
          const data = await res.json();
          setOutbreaks(data);
          
          if (!selectedId && data.length > 0) {
            const firstId = data[0].id;
            setSelectedId(firstId);
            onSelect(firstId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch outbreaks:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOutbreaks();
  }, []);

  const handleChange = (id: string) => {
    setSelectedId(id);
    onSelect(id);
  };

  if (isLoading) {
    return (
      <div className="h-12 w-full animate-pulse bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
        <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
      </div>
    );
  }

  const selectedOutbreak = outbreaks.find(o => o.id === selectedId);

  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none z-10">
        <Activity className="w-4 h-4" />
      </div>
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 appearance-none focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-xs font-black uppercase tracking-tight"
        >
          <option value="">Global / Select Outbreak</option>
          {outbreaks.map((ob) => (
            <option key={ob.id} value={ob.id}>
              {ob.name} ({ob.status})
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform group-focus-within:rotate-180">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
