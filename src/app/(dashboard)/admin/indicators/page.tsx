"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Settings as SettingsIcon,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Breadcrumbs from '@/components/Breadcrumbs';

interface Indicator {
  id: string;
  name: string;
  description: string;
  numerator: string;
  denominator: string;
  multiplier: number;
  unit: string;
  isActive: boolean;
}

export default function IndicatorsPage() {
  const { data: session } = useSession();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    numerator: '',
    denominator: '',
    multiplier: 100,
    unit: '%',
    isActive: true
  });

  useEffect(() => {
    fetchIndicators();
  }, []);

  const fetchIndicators = async () => {
    try {
      const res = await fetch('/api/admin/indicators');
      const data = await res.json();
      if (Array.isArray(data)) {
        setIndicators(data);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('Failed to fetch indicators');
      setError('Failed to load indicators');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (indicator: Indicator) => {
    setForm({
      name: indicator.name,
      description: indicator.description || '',
      numerator: indicator.numerator,
      denominator: indicator.denominator || '',
      multiplier: indicator.multiplier,
      unit: indicator.unit || '',
      isActive: indicator.isActive
    });
    setEditingId(indicator.id);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    setForm({
      name: '',
      description: '',
      numerator: '',
      denominator: '',
      multiplier: 100,
      unit: '%',
      isActive: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/indicators/${editingId}` : '/api/admin/indicators';
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setSuccess('Indicator saved successfully');
        fetchIndicators();
        handleCancel();
        setTimeout(() => setSuccess(null), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this indicator?')) return;
    try {
      const res = await fetch(`/api/admin/indicators/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSuccess('Indicator deleted successfully');
        fetchIndicators();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to delete indicator');
    }
  };

  if (session?.user?.role !== 'ADMIN') return <p>Access Denied</p>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <Breadcrumbs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase">Indicator Engine</h1>
          <p className="text-slate-500 font-medium">Define and manage public health metrics</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/10 hover:bg-indigo-500 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Indicator
        </button>
      </div>

      <AnimatePresence>
        {(isCreating || editingId) && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl"
          >
            <h2 className="text-xl font-black text-slate-800 uppercase mb-6">{editingId ? 'Edit' : 'Create'} Indicator</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Indicator Name</label>
                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Numerator (Field Key)</label>
                    <input value={form.numerator} onChange={e => setForm({...form, numerator: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Denominator (Optional)</label>
                    <input value={form.denominator} onChange={e => setForm({...form, denominator: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                  </div>
               </div>
               <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Multiplier</label>
                    <input type="number" value={form.multiplier} onChange={e => setForm({...form, multiplier: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Unit</label>
                    <input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                  </div>
                  <div className="flex justify-end gap-3 pt-6">
                      <button type="button" onClick={handleCancel} className="px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600">Cancel</button>
                      <button type="submit" disabled={saving} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Indicator
                      </button>
                  </div>
               </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {indicators.map(indicator => (
          <div key={indicator.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start justify-between group">
            <div className="flex gap-4">
               <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Calculator className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-bold text-slate-800">{indicator.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">({indicator.numerator} / {indicator.denominator || '1'}) * {indicator.multiplier}{indicator.unit}</p>
                  <p className="text-xs text-slate-500 mt-2">{indicator.description}</p>
               </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => handleEdit(indicator)} className="p-2 text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
               <button onClick={() => handleDelete(indicator.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
