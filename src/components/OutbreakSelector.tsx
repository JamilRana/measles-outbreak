"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, ChevronDown } from "lucide-react";

interface Outbreak {
  id: string;
  name: string;
  disease: {
    name: string;
    code: string;
  };
}

interface OutbreakSelectorProps {
  onSelect: (outbreakId: string) => void;
  defaultValue?: string;
}

export default function OutbreakSelector({ onSelect, defaultValue }: OutbreakSelectorProps) {
  const { t } = useTranslation();
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [selectedId, setSelectedId] = useState(defaultValue || "");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOutbreaks() {
      try {
        const res = await fetch("/api/public/outbreaks");
        if (res.ok) {
          const data = await res.json();
          setOutbreaks(data);
          
          // If no default value but we have outbreaks, pick the first one
          if (!selectedId && data.length > 0) {
            setSelectedId(data[0].id);
            onSelect(data[0].id);
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

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    onSelect(id);
  };

  if (isLoading) {
    return (
      <div className="h-10 w-full animate-pulse bg-white/5 rounded-lg" />
    );
  }

  if (outbreaks.length === 0) return null;

  return (
    <div className="relative group">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
        <Activity className="w-4 h-4" />
      </div>
      <select
        value={selectedId}
        onChange={handleChange}
        className="w-full pl-9 pr-10 py-2.5 bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
      >
        {outbreaks.map((ob) => (
          <option key={ob.id} value={ob.id} className="text-gray-900 bg-white">
            {ob.name} ({ob.disease.name})
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none transition-transform group-focus-within:rotate-180">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
}
