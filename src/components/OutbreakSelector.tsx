"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";

import { Outbreak } from '@/types/outbreak';
import { SearchableSelect } from "./SearchableSelect";

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

  if (isLoading) {
    return (
      <div className="h-10 w-full animate-pulse bg-white/5 rounded-lg" />
    );
  }

  if (outbreaks.length === 0) return null;

  return (
    <div className="relative group">
        <SearchableSelect 
                label="Outbreak (প্রাদুর্ভাব)"
                placeholder="Select Outbreak Context"
                options={outbreaks.map(o => ({ value: o.id, label: o.name }))}
                value={selectedId}
                onChange={setSelectedId}
                icon={Activity}
              />
    </div>
  );
}
