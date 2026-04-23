"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck,
  History,
  Filter,
  Building2,
  Globe,
  MapPin,
  Layers,
  Target,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { SearchableSelect } from '@/components/SearchableSelect';
import { format } from 'date-fns';
import { DIVISIONS, DISTRICTS } from '@/lib/constants';

interface FacilityTypeOption {
  id: string;
  name: string;
  slug: string;
  tier: string | null;
}

// ── Multi-Select Chip Component ──────────────────────────────────────
function MultiSelect({ 
  label, options, selected, onChange, groupBy 
}: { 
  label: string; 
  options: { value: string; label: string; group?: string }[];
  selected: string[];
  onChange: (val: string[]) => void;
  groupBy?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  const grouped = groupBy 
    ? options.reduce<Record<string, typeof options>>((acc, o) => { 
        const g = o.group || 'Other'; 
        (acc[g] = acc[g] || []).push(o); 
        return acc; 
      }, {})
    : { 'All': options };

  return (
    <div className="relative">
      <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-2">{label}</label>
      <button 
        type="button"
        onClick={() => setOpen(!open)} 
        className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm font-bold text-white outline-none text-left flex items-center justify-between gap-2"
      >
        <span className="truncate">
          {selected.length === 0 ? 'All (no filter)' : `${selected.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map(v => {
            const opt = options.find(o => o.value === v);
            return (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 text-white rounded-lg text-[10px] font-bold">
                {opt?.label || v}
                <button type="button" onClick={() => toggle(v)} className="hover:text-red-300"><X className="w-3 h-3" /></button>
              </span>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 mt-2 w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-2"
          >
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                {Object.keys(grouped).length > 1 && (
                  <p className="px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest sticky top-0 bg-slate-900">{group}</p>
                )}
                {items.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      selected.includes(opt.value) 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function SubmissionWindowsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const initialOutbreakId = searchParams.get('outbreakId') || '';

  const [activeTab, setActiveTab] = useState<'REGULAR' | 'BACKLOG'>('REGULAR');
  const [outbreaks, setOutbreaks] = useState<any[]>([]);
  const [facilityTypes, setFacilityTypes] = useState<FacilityTypeOption[]>([]);
  const [windows, setWindows] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [filters, setFilters] = useState({ outbreakId: initialOutbreakId });

  // ── Regular Window Form ──
  const [windowForm, setWindowForm] = useState({
    name: 'Daily Standard Window',
    outbreakId: initialOutbreakId,
    periodStart: format(new Date(), 'yyyy-MM-dd'),
    periodEnd: format(new Date(), 'yyyy-MM-dd'),
    opensAt: format(new Date(), "yyyy-MM-dd'T'00:00"),
    closesAt: format(new Date(), "yyyy-MM-dd'T'23:59"),
    isActive: true,
    targetDivisions: [] as string[],
    targetDistricts: [] as string[],
    targetFacilityTypeIds: [] as string[],
  });

  // ── Backlog Slot Form ──
  const [slotForm, setSlotForm] = useState({
    outbreakId: initialOutbreakId,
    periodStart: format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd'),
    periodEnd: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'),
    opensAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    closesAt: format(new Date(Date.now() + 48 * 3600000), "yyyy-MM-dd'T'HH:mm"),
    reason: 'Backlog recovery',
    targetDivisions: [] as string[],
    targetDistricts: [] as string[],
    targetFacilityTypeIds: [] as string[],
  });

  useEffect(() => { fetchMeta(); fetchData(); }, [filters.outbreakId]);

  const fetchMeta = async () => {
    try {
      const [oRes, ftRes] = await Promise.all([
        fetch('/api/outbreaks?active=true'),
        fetch('/api/admin/facility-types')
      ]);
      setOutbreaks(await oRes.json());
      const ftData = await ftRes.json();
      setFacilityTypes(Array.isArray(ftData) ? ftData : []);
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = filters.outbreakId ? `?outbreakId=${filters.outbreakId}` : '';
      const [wRes, sRes] = await Promise.all([
        fetch(`/api/admin/submission-windows${q}`),
        fetch(`/api/admin/backlog-slots${q}`)
      ]);
      setWindows(await wRes.json());
      setSlots(await sRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const endpoint = activeTab === 'REGULAR' ? '/api/admin/submission-windows' : '/api/admin/backlog-slots';
      const payload = activeTab === 'REGULAR' ? windowForm : slotForm;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSuccess('Created successfully');
        setShowCreate(false);
        fetchData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to create');
      }
    } catch (e) { setError('Network error'); }
    finally { setSaving(false); }
  };

  // ── Computed: available districts filtered by selected divisions ──
  const availableDistricts = (() => {
    const form = activeTab === 'REGULAR' ? windowForm : slotForm;
    if (form.targetDivisions.length === 0) {
      return Object.entries(DISTRICTS).flatMap(([div, dists]) => 
        dists.map(d => ({ value: d, label: d, group: div }))
      );
    }
    return form.targetDivisions.flatMap(div => 
      (DISTRICTS[div] || []).map(d => ({ value: d, label: d, group: div }))
    );
  })();

  const facilityTypeOptions = facilityTypes.map(ft => ({
    value: ft.id,
    label: ft.name,
    group: ft.tier ? ft.tier.charAt(0).toUpperCase() + ft.tier.slice(1) : 'Other'
  }));

  const divisionOptions = DIVISIONS.map(d => ({ value: d, label: d }));

  // ── Helpers to render targeting badges ──
  const renderTargetingBadges = (item: any) => {
    const hasDivisions = item.targetDivisions?.length > 0;
    const hasDistricts = item.targetDistricts?.length > 0;
    const hasTypes = item.targetFacilityTypeIds?.length > 0;
    const isGlobal = !hasDivisions && !hasDistricts && !hasTypes && !item.facilityId;

    return (
      <div className="flex flex-wrap gap-1.5 mt-4">
        {isGlobal && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
            <Globe className="w-3 h-3" /> All facilities
          </span>
        )}
        {hasDivisions && item.targetDivisions.map((d: string) => (
          <span key={d} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
            <MapPin className="w-3 h-3" /> {d}
          </span>
        ))}
        {hasDistricts && item.targetDistricts.map((d: string) => (
          <span key={d} className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
            <MapPin className="w-3 h-3" /> {d}
          </span>
        ))}
        {hasTypes && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-widest">
            <Layers className="w-3 h-3" /> {item.targetFacilityTypeIds.length} facility types
          </span>
        )}
        {item.facilityId && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
            <Building2 className="w-3 h-3" /> {item.facility?.facilityName || 'Specific'}
          </span>
        )}
      </div>
    );
  };

  if (session?.user?.role !== 'ADMIN') {
    return <div className="p-20 text-center font-bold text-slate-400">ADMIN ACCESS REQUIRED</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <Breadcrumbs />
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
             <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Surveillance Gatekeeper</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Submission Windows</h1>
          <p className="text-slate-500 font-medium">Define reporting schedules with geographic and facility-type targeting</p>
        </div>

        <div className="flex items-center gap-3">
           <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex items-center gap-1 shadow-sm">
             {(['REGULAR', 'BACKLOG'] as const).map(tab => (
               <button
                 key={tab}
                 onClick={() => { setActiveTab(tab); setShowCreate(false); }}
                 className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 {tab === 'REGULAR' ? 'Regular Schedule' : 'Backlog Slots'}
               </button>
             ))}
           </div>
           <button 
             onClick={() => setShowCreate(true)}
             className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95"
           >
             <Plus className="w-4 h-4" /> New
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6 sticky top-8">
             <div className="flex items-center justify-between mb-2">
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Filter</h3>
               <Filter className="w-4 h-4 text-slate-300" />
             </div>
<div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Outbreak</label>
                 <SearchableSelect 
                   label=""
                   placeholder="All Outbreaks"
                   options={outbreaks.map(o => ({ value: o.id, label: o.name }))}
                   value={filters.outbreakId || ""}
                   onChange={value => setFilters({ outbreakId: value })}
                 />
              </div>

             <div className="border-t border-slate-100 pt-4">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3">Facility Type Legend</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {facilityTypes.map(ft => (
                    <div key={ft.id} className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${
                         ft.tier === 'specialized' ? 'bg-rose-400' :
                         ft.tier === 'district' ? 'bg-blue-400' :
                         ft.tier === 'upazila' ? 'bg-emerald-400' :
                         ft.tier === 'office' ? 'bg-slate-400' :
                         'bg-amber-400'
                       }`}/>
                       <span className="text-[10px] font-bold text-slate-500 truncate">{ft.name}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5" /> <p className="text-sm font-bold">{error}</p>
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" /> <p className="text-sm font-bold">{success}</p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {showCreate && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200"
              >
                 <div className="flex items-center justify-between mb-10">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{activeTab === 'REGULAR' ? 'Configure Standard Window' : 'Open Backlog Slot'}</h2>
                      <p className="text-indigo-200 text-sm font-medium mt-1">Define who can report, when, and for what period</p>
                    </div>
                    <button onClick={() => setShowCreate(false)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all"><X className="w-5 h-5" /></button>
                 </div>

                 <form onSubmit={handleCreateSubmit} className="space-y-8">
                    {/* Row 1: Outbreak + Name/Reason */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                       <div>
                          <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-2">Target Outbreak</label>
                          <select 
                            required
                            value={activeTab === 'REGULAR' ? windowForm.outbreakId : slotForm.outbreakId}
                            onChange={e => activeTab === 'REGULAR' ? setWindowForm({...windowForm, outbreakId: e.target.value}) : setSlotForm({...slotForm, outbreakId: e.target.value})}
                            className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm font-bold text-white outline-none"
                          >
                             <option value="" className="text-slate-900">Select Outbreak</option>
                             {outbreaks.map((o: any) => <option key={o.id} value={o.id} className="text-slate-900">{o.name}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-2">
                            {activeTab === 'REGULAR' ? 'Window Name' : 'Reason'}
                          </label>
                          <input 
                            type="text" 
                            value={activeTab === 'REGULAR' ? windowForm.name : slotForm.reason}
                            onChange={e => activeTab === 'REGULAR' ? setWindowForm({...windowForm, name: e.target.value}) : setSlotForm({...slotForm, reason: e.target.value})}
                            className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm font-bold text-white outline-none"
                          />
                       </div>
                    </div>

                    {/* Row 2: Period + Access Timing */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <div>
                         <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-2">Period From</label>
                         <input type="date" 
                           value={activeTab === 'REGULAR' ? windowForm.periodStart : slotForm.periodStart}
                           onChange={e => activeTab === 'REGULAR' ? setWindowForm({...windowForm, periodStart: e.target.value}) : setSlotForm({...slotForm, periodStart: e.target.value})}
                           className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm font-bold text-white" required />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-2">Period To</label>
                         <input type="date" 
                           value={activeTab === 'REGULAR' ? windowForm.periodEnd : slotForm.periodEnd}
                           onChange={e => activeTab === 'REGULAR' ? setWindowForm({...windowForm, periodEnd: e.target.value}) : setSlotForm({...slotForm, periodEnd: e.target.value})}
                           className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm font-bold text-white" required />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-2">Opens At</label>
                         <input type="datetime-local" 
                           value={activeTab === 'REGULAR' ? windowForm.opensAt : slotForm.opensAt}
                           onChange={e => activeTab === 'REGULAR' ? setWindowForm({...windowForm, opensAt: e.target.value}) : setSlotForm({...slotForm, opensAt: e.target.value})}
                           className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-bold text-white" required />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block mb-2">Closes At</label>
                         <input type="datetime-local" 
                           value={activeTab === 'REGULAR' ? windowForm.closesAt : slotForm.closesAt}
                           onChange={e => activeTab === 'REGULAR' ? setWindowForm({...windowForm, closesAt: e.target.value}) : setSlotForm({...slotForm, closesAt: e.target.value})}
                           className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-xs font-bold text-white" required />
                       </div>
                    </div>

                    {/* Row 3: Targeting Section */}
                    <div className="border-t border-white/10 pt-8">
                       <div className="flex items-center gap-2 mb-6">
                          <Target className="w-5 h-5 text-indigo-200" />
                          <h3 className="text-sm font-black uppercase tracking-widest">Targeting Rules</h3>
                          <span className="text-[10px] font-medium text-indigo-300 ml-2">(leave empty = applies to all)</span>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <MultiSelect
                            label="Divisions"
                            options={divisionOptions}
                            selected={activeTab === 'REGULAR' ? windowForm.targetDivisions : slotForm.targetDivisions}
                            onChange={val => activeTab === 'REGULAR' 
                              ? setWindowForm({...windowForm, targetDivisions: val, targetDistricts: []})
                              : setSlotForm({...slotForm, targetDivisions: val, targetDistricts: []})
                            }
                          />
                          <MultiSelect
                            label="Districts"
                            options={availableDistricts}
                            selected={activeTab === 'REGULAR' ? windowForm.targetDistricts : slotForm.targetDistricts}
                            onChange={val => activeTab === 'REGULAR' 
                              ? setWindowForm({...windowForm, targetDistricts: val})
                              : setSlotForm({...slotForm, targetDistricts: val})
                            }
                            groupBy
                          />
                          <MultiSelect
                            label="Facility Types"
                            options={facilityTypeOptions}
                            selected={activeTab === 'REGULAR' ? windowForm.targetFacilityTypeIds : slotForm.targetFacilityTypeIds}
                            onChange={val => activeTab === 'REGULAR' 
                              ? setWindowForm({...windowForm, targetFacilityTypeIds: val})
                              : setSlotForm({...slotForm, targetFacilityTypeIds: val})
                            }
                            groupBy
                          />
                       </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                       <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                       <button 
                         disabled={saving}
                         type="submit" 
                         className="px-8 py-3 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 disabled:opacity-50"
                       >
                          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                          Deploy Policy
                       </button>
                    </div>
                 </form>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="flex items-center justify-center p-32"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
          ) : activeTab === 'REGULAR' ? (
            <div className="space-y-4">
              {windows.length === 0 && (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100">
                  <Clock className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="font-black text-slate-400 text-sm uppercase tracking-widest">No windows configured</p>
                  <p className="text-slate-300 text-xs mt-1">Using global fallback settings</p>
                </div>
              )}
              {windows.map((win: any) => (
                <motion.div layout key={win.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:scale-110 transition-transform"><Clock className="w-40 h-40" /></div>
                  <div className="flex items-start justify-between relative z-10 mb-4">
                     <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${win.isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'} rounded-2xl flex items-center justify-center`}>
                           <Clock className="w-6 h-6" />
                        </div>
                        <div>
                           <h4 className="font-black text-slate-800 text-lg tracking-tight leading-none mb-1">{win.name || 'Unnamed Window'}</h4>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{win.outbreak?.name}</p>
                        </div>
                     </div>
                     <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${win.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                        {win.isActive ? 'Live' : 'Disabled'}
                     </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-8 relative z-10 mb-2">
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Reporting Period</span>
                        <span className="text-sm font-black text-slate-900 tabular-nums">{format(new Date(win.periodStart), 'dd MMM')} — {format(new Date(win.periodEnd), 'dd MMM yyyy')}</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Access Window</span>
                        <span className="text-xs font-bold text-slate-600">{format(new Date(win.opensAt), 'HH:mm dd/MM')} → {format(new Date(win.closesAt), 'HH:mm dd/MM')}</span>
                     </div>
                  </div>
                  
                  {renderTargetingBadges(win)}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {slots.length === 0 && (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100">
                  <History className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="font-black text-slate-400 text-sm uppercase tracking-widest">No backlog slots</p>
                </div>
              )}
              {slots.map((slot: any) => (
                <motion.div layout key={slot.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 border-l-4 border-l-amber-400 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
                  <div className="flex items-start justify-between mb-4 relative z-10">
                     <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                           <History className="w-6 h-6" />
                        </div>
                        <div>
                           <h4 className="font-black text-slate-800 text-lg tracking-tight leading-none mb-1">{slot.reason}</h4>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{slot.outbreak?.name}</p>
                        </div>
                     </div>
                     <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest">Override</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-8 relative z-10 p-4 bg-slate-50 rounded-2xl mb-2">
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Period</span>
                        <span className="text-sm font-black text-slate-900">{format(new Date(slot.periodStart), 'dd MMM')} → {format(new Date(slot.periodEnd), 'dd MMM yyyy')}</span>
                     </div>
                     <div className="w-px h-8 bg-slate-200" />
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Access Window</span>
                        <span className="text-xs font-bold text-slate-600">{format(new Date(slot.opensAt), 'HH:mm dd/MM')} to {format(new Date(slot.closesAt), 'HH:mm dd/MM')}</span>
                     </div>
                  </div>

                  {renderTargetingBadges(slot)}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
