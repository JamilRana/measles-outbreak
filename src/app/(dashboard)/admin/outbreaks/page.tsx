"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  RotateCcw,
  Activity,
  ToggleLeft,
  ToggleRight,
  Clock,
  Settings2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Breadcrumbs from '@/components/Breadcrumbs';
import Link from 'next/link';

interface Outbreak {
  id: string;
  name: string;
  diseaseId: string;
  disease?: { name: string; code: string };
  status: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  allowBacklogReporting: boolean;
  backlogStartDate: string | null;
  backlogEndDate: string | null;
  reportingFrequency: string;
  cutoffHour: number;
  cutoffMinute: number;
  editDeadlineHour: number;
  editDeadlineMinute: number;
  publishTimeHour: number;
  publishTimeMinute: number;
  targetDivisions: string[];
  targetDistricts: string[];
  targetFacilityTypeIds: string[];
}

interface Disease {
  id: string;
  name: string;
  code: string;
}

const STATUSES = ['DRAFT', 'ACTIVE', 'CONTAINED', 'CLOSED'];
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'];
const DIVISIONS = ['Barisal', 'Chattogram', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet'];

export default function OutbreaksPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [facilityTypes, setFacilityTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [defaultOutbreakId, setDefaultOutbreakId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    diseaseId: '',
    status: 'DRAFT',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isActive: true,
    allowBacklogReporting: false,
    backlogStartDate: '',
    backlogEndDate: '',
    reportingFrequency: 'DAILY',
    submissionCutoff: '14:00',
    editDeadline: '10:00',
    publishTime: '09:00',
    targetDivisions: [] as string[],
    targetDistricts: [] as string[],
    targetFacilityTypeIds: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [outbreaksRes, diseasesRes, typesRes, settingsRes] = await Promise.all([
        fetch('/api/outbreaks'),
        fetch('/api/diseases'),
        fetch('/api/admin/facility-types'),
        fetch('/api/admin/settings')
      ]);
      const outbreaksData = await outbreaksRes.json();
      const diseasesData = await diseasesRes.json();
      const typesData = await typesRes.json();
      const settingsData = await settingsRes.json();
      
      if (Array.isArray(outbreaksData)) {
        setOutbreaks(outbreaksData.map((o: any) => ({
          ...o,
          startDate: o.startDate ? new Date(o.startDate).toISOString().split('T')[0] : '',
          endDate: o.endDate ? new Date(o.endDate).toISOString().split('T')[0] : null,
          backlogStartDate: o.backlogStartDate ? new Date(o.backlogStartDate).toISOString().split('T')[0] : null,
          backlogEndDate: o.backlogEndDate ? new Date(o.backlogEndDate).toISOString().split('T')[0] : null,
        })));
      }

      if (Array.isArray(diseasesData)) setDiseases(diseasesData);
      if (Array.isArray(typesData)) setFacilityTypes(typesData);
      if (settingsData && settingsData.defaultOutbreakId) setDefaultOutbreakId(settingsData.defaultOutbreakId);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load outbreaks data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      diseaseId: diseases[0]?.id || '',
      status: 'DRAFT',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isActive: true,
      allowBacklogReporting: false,
      backlogStartDate: '',
      backlogEndDate: '',
      reportingFrequency: 'DAILY',
      submissionCutoff: '14:00',
      editDeadline: '10:00',
      publishTime: '09:00',
      targetDivisions: [],
      targetDistricts: [],
      targetFacilityTypeIds: [],
    });
  };

  const handleCreate = () => {
    resetForm();
    if (diseases.length > 0) {
      setForm(p => ({ ...p, diseaseId: diseases[0]?.id }));
    }
    setIsCreating(true);
    setEditingId(null);
  };

  const handleEdit = (outbreak: Outbreak) => {
    setForm({
      name: outbreak.name,
      diseaseId: outbreak.diseaseId,
      status: outbreak.status,
      startDate: outbreak.startDate,
      endDate: outbreak.endDate || '',
      isActive: outbreak.isActive,
      allowBacklogReporting: outbreak.allowBacklogReporting,
      backlogStartDate: outbreak.backlogStartDate || '',
      backlogEndDate: outbreak.backlogEndDate || '',
      reportingFrequency: outbreak.reportingFrequency || 'DAILY',
      submissionCutoff: `${outbreak.cutoffHour?.toString().padStart(2, '0')}:${outbreak.cutoffMinute?.toString().padStart(2, '0')}`,
      editDeadline: `${outbreak.editDeadlineHour?.toString().padStart(2, '0')}:${outbreak.editDeadlineMinute?.toString().padStart(2, '0')}`,
      publishTime: `${outbreak.publishTimeHour?.toString().padStart(2, '0')}:${outbreak.publishTimeMinute?.toString().padStart(2, '0')}`,
      targetDivisions: outbreak.targetDivisions || [],
      targetDistricts: outbreak.targetDistricts || [],
      targetFacilityTypeIds: outbreak.targetFacilityTypeIds || [],
    });
    setEditingId(outbreak.id);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.diseaseId) {
      setError('Name and Disease are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        endDate: form.endDate || null,
        backlogStartDate: form.allowBacklogReporting && form.backlogStartDate ? form.backlogStartDate : null,
        backlogEndDate: form.allowBacklogReporting && form.backlogEndDate ? form.backlogEndDate : null,
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/outbreaks/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/outbreaks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setSuccess(editingId ? 'Outbreak updated successfully' : 'Outbreak created successfully');
        fetchData();
        handleCancel();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save outbreak');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this outbreak? This will fail if reports exist.')) return;
    
    try {
      const res = await fetch(`/api/outbreaks/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setSuccess('Outbreak deleted successfully');
        fetchData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to delete outbreak');
      }
    } catch (err) {
      setError('Failed to delete outbreak');
    }
  };

  const setAsDefault = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultOutbreakId: id })
      });
      if (res.ok) {
        setDefaultOutbreakId(id);
        setSuccess('Default outbreak updated');
        setTimeout(() => setSuccess(null), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (item: string, field: 'targetDivisions' | 'targetDistricts' | 'targetFacilityTypeIds') => {
    const current = [...form[field]];
    if (current.includes(item)) {
      setForm({ ...form, [field]: current.filter(i => i !== item) });
    } else {
      setForm({ ...form, [field]: [...current, item] });
    }
  };

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
        <p className="text-slate-500 mt-2">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 pb-20">
      <Breadcrumbs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Outbreak Orchestration</h1>
          <p className="text-slate-500 mt-1 font-medium">Configure outbreak lifecycles, frequency, and submission windows</p>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-bold text-sm tracking-tight">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="font-bold text-sm tracking-tight">{success}</p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {(isCreating || editingId) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Settings2 className="w-5 h-5" />
               </div>
               <h2 className="text-xl font-black text-slate-800 tracking-tight">{editingId ? 'Modify Outbreak Logic' : 'Initiate New Outbreak'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Outbreak Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder-slate-300"
                    placeholder="e.g., Seasonal Measles Spike 2026"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Disease Profile</label>
                  <select
                    value={form.diseaseId}
                    onChange={(e) => setForm({ ...form, diseaseId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    required
                  >
                    <option value="">Select Target Disease</option>
                    {diseases.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Reporting Freq.</label>
                      <select
                        value={form.reportingFrequency}
                        onChange={(e) => setForm({ ...form, reportingFrequency: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none"
                      >
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Current Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none"
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Est. End Date</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                   <Settings2 className="w-4 h-4 text-slate-400" />
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Reporting Scope / Targeting</h3>
                </div>
                <p className="text-xs text-slate-400">If no selections are made, the outbreak will apply to all facilities nationwide.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Divisions</label>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                         {DIVISIONS.map(d => (
                            <button
                               key={d}
                               type="button"
                               onClick={() => toggleArrayItem(d, 'targetDivisions')}
                               className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                  form.targetDivisions.includes(d) 
                                  ? 'bg-indigo-600 text-white shadow-md' 
                                  : 'bg-slate-50 text-slate-500 border border-slate-200'
                               }`}
                            >
                               {d}
                            </button>
                         ))}
                      </div>
                   </div>

                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Facility Types</label>
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                         {facilityTypes.map(t => (
                            <button
                               key={t.id}
                               type="button"
                               onClick={() => toggleArrayItem(t.id, 'targetFacilityTypeIds')}
                               className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                  form.targetFacilityTypeIds.includes(t.id) 
                                  ? 'bg-indigo-600 text-white shadow-md' 
                                  : 'bg-slate-50 text-slate-500 border border-slate-200'
                               }`}
                            >
                               {t.name}
                            </button>
                         ))}
                      </div>
                   </div>

                   <div className="flex flex-col gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Active Targets</label>
                         <div className="space-y-1">
                            {form.targetDivisions.length > 0 && <p className="text-[10px] font-bold text-indigo-600">{form.targetDivisions.length} Divisions Selected</p>}
                            {form.targetFacilityTypeIds.length > 0 && <p className="text-[10px] font-bold text-indigo-600">{form.targetFacilityTypeIds.length} Types Selected</p>}
                            {form.targetDivisions.length === 0 && form.targetFacilityTypeIds.length === 0 && <p className="text-[10px] font-bold text-slate-400 italic">No restrictions (Global)</p>}
                         </div>
                      </div>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Submission Cutoff
                    </label>
                    <input
                      type="time"
                      value={form.submissionCutoff}
                      onChange={(e) => setForm({ ...form, submissionCutoff: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Edit Deadline
                    </label>
                    <input
                      type="time"
                      value={form.editDeadline}
                      onChange={(e) => setForm({ ...form, editDeadline: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Auto-Publish Time
                    </label>
                    <input
                      type="time"
                      value={form.publishTime}
                      onChange={(e) => setForm({ ...form, publishTime: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none"
                    />
                 </div>
              </div>

              <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
                <div className="flex items-center gap-2 mb-6">
                  <RotateCcw className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Default Backlog Policy</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                   <div className="flex flex-col gap-2">
                       <button
                        type="button"
                        onClick={() => setForm({ ...form, allowBacklogReporting: !form.allowBacklogReporting })}
                        className={`flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                          form.allowBacklogReporting 
                            ? 'bg-indigo-600 text-white shadow-lg' 
                            : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                      >
                        {form.allowBacklogReporting ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        {form.allowBacklogReporting ? 'Backlog Enabled' : 'Backlog Disabled'}
                      </button>
                   </div>
                   <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Effective From</label>
                        <input
                          type="date"
                          disabled={!form.allowBacklogReporting}
                          value={form.backlogStartDate}
                          onChange={(e) => setForm({ ...form, backlogStartDate: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none disabled:opacity-40"
                        />
                   </div>
                   <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Expires On</label>
                        <input
                          type="date"
                          disabled={!form.allowBacklogReporting}
                          value={form.backlogEndDate}
                          onChange={(e) => setForm({ ...form, backlogEndDate: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none disabled:opacity-40"
                        />
                   </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={handleCancel} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-10 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Save className="w-4 h-4" />
                  {editingId ? 'Push Updates' : 'Commit Outbreak'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!isCreating && !editingId && (
        <button
          onClick={handleCreate}
          className="w-full py-8 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:border-indigo-500 hover:text-indigo-600 flex flex-col items-center justify-center gap-3 transition-all group hover:bg-indigo-50/30"
        >
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
             <Plus className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Initiate New Outbreak Logic</span>
        </button>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
      ) : outbreaks.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-[2.5rem]">
          <Activity className="w-16 h-16 mx-auto mb-6 text-slate-200" />
          <h4 className="text-lg font-black text-slate-800">No active environments</h4>
          <p className="text-slate-400 font-medium">Create an outbreak record to begin surveillance</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {outbreaks.map(outbreak => (
            <motion.div 
              layout 
              key={outbreak.id} 
              className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden"
            >
               <div className={`absolute top-0 right-0 p-10 opacity-[0.03] -rotate-12 group-hover:scale-110 transition-transform`}>
                  <Activity className="w-48 h-48" />
               </div>

              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="font-black text-slate-900 text-xl tracking-tight leading-none">{outbreak.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      outbreak.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                      outbreak.status === 'CONTAINED' ? 'bg-amber-100 text-amber-700' :
                      outbreak.status === 'CLOSED' ? 'bg-slate-100 text-slate-600' :
                      'bg-indigo-100 text-indigo-700'
                    }`}>
                      {outbreak.status}
                    </span>
                    {defaultOutbreakId === outbreak.id && (
                      <span className="px-3 py-1 rounded-full text-[9px] font-black bg-slate-900 text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> DEFAULT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-tight mb-6">
                     <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {outbreak.startDate}</span>
                     <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                     <span className="flex items-center gap-1.5 text-indigo-600">{outbreak.disease?.name}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pb-6 border-b border-slate-50 mb-6 font-bold text-xs uppercase tracking-tight">
                    <div className="flex flex-col gap-1">
                       <span className="text-[9px] text-slate-300 font-black tracking-widest leading-none">Frequency</span>
                       <span className="text-slate-700">{outbreak.reportingFrequency}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                       <span className="text-[9px] text-slate-300 font-black tracking-widest leading-none">Cutoff</span>
                       <span className="text-slate-700">{outbreak.cutoffHour?.toString().padStart(2, '0')}:{outbreak.cutoffMinute?.toString().padStart(2, '0')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${outbreak.allowBacklogReporting ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-300'} text-[10px] font-black uppercase tracking-widest`}>
                       <RotateCcw className="w-3.5 h-3.5" />
                       Policy: {outbreak.allowBacklogReporting ? 'Backlog' : 'Strict'}
                    </div>
                    {(outbreak.targetDivisions?.length > 0 || outbreak.targetFacilityTypeIds?.length > 0) ? (
                       <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase tracking-widest">
                          <Settings2 className="w-3.5 h-3.5" />
                          Targeted
                       </div>
                    ) : (
                       <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 text-[10px] font-black uppercase tracking-widest">
                          <Globe className="w-3.5 h-3.5" />
                          Global
                       </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 ml-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(outbreak)}
                      className="w-10 h-10 bg-white border border-slate-100 hover:border-indigo-600 hover:text-indigo-600 rounded-xl flex items-center justify-center transition-all shadow-sm group/btn"
                    >
                      <Pencil className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => handleDelete(outbreak.id)}
                      className="w-10 h-10 bg-white border border-slate-100 hover:border-red-600 hover:text-red-600 rounded-xl flex items-center justify-center transition-all shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {defaultOutbreakId !== outbreak.id && (
                    <button
                      onClick={() => setAsDefault(outbreak.id)}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all mt-2"
                    >
                      Set Default
                    </button>
                  )}
                   <Link 
                      href={`/admin/submission-windows?outbreakId=${outbreak.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all mt-2"
                    >
                      Windows <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Globe(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>;
}
