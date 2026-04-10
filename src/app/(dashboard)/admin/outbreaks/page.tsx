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
  ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Breadcrumbs from '@/components/Breadcrumbs';

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
}

interface Disease {
  id: string;
  name: string;
  code: string;
}

const STATUSES = ['DRAFT', 'ACTIVE', 'CONTAINED', 'CLOSED'];

export default function OutbreaksPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
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
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [outbreaksRes, diseasesRes, settingsRes] = await Promise.all([
        fetch('/api/outbreaks'),
        fetch('/api/diseases'),
        fetch('/api/admin/settings')
      ]);
      const outbreaksData = await outbreaksRes.json();
      const diseasesData = await diseasesRes.json();
      const settingsData = await settingsRes.json();
      
      if (Array.isArray(outbreaksData)) {
        setOutbreaks(outbreaksData.map((o: any) => ({
          ...o,
          startDate: o.startDate ? new Date(o.startDate).toISOString().split('T')[0] : '',
          endDate: o.endDate ? new Date(o.endDate).toISOString().split('T')[0] : null,
          backlogStartDate: o.backlogStartDate ? new Date(o.backlogStartDate).toISOString().split('T')[0] : null,
          backlogEndDate: o.backlogEndDate ? new Date(o.backlogEndDate).toISOString().split('T')[0] : null,
        })));
      } else if (outbreaksData.error) {
        setError(outbreaksData.error);
      }

      if (Array.isArray(diseasesData)) {
        setDiseases(diseasesData);
      }
      
      if (settingsData && settingsData.defaultOutbreakId) {
        setDefaultOutbreakId(settingsData.defaultOutbreakId);
      }
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
    });
  };

  const handleCreate = () => {
    resetForm();
    setForm(p => ({ ...p, diseaseId: diseases[0]?.id || '' }));
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
        name: form.name,
        diseaseId: form.diseaseId,
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate || null,
        isActive: form.isActive,
        allowBacklogReporting: form.allowBacklogReporting,
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
    if (!confirm('Are you sure you want to delete this outbreak?')) return;
    
    try {
      const res = await fetch(`/api/outbreaks/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setSuccess('Outbreak deleted successfully');
        fetchData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to delete outbreak');
      }
    } catch (err) {
      setError('Failed to delete outbreak');
    }
  };

  const handleToggleBacklog = async (id: string, enabled: boolean) => {
    setSaving(true);
    try {
      const outbreak = outbreaks.find(o => o.id === id);
      await fetch(`/api/outbreaks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowBacklogReporting: enabled,
          backlogStartDate: enabled ? (outbreak?.backlogStartDate || new Date().toISOString().split('T')[0]) : null,
          backlogEndDate: enabled ? (outbreak?.backlogEndDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]) : null,
        })
      });
      fetchData();
    } finally {
      setSaving(false);
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
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Breadcrumbs />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Outbreak Management</h1>
          <p className="text-slate-500 mt-1">Create and manage outbreak events with backlog settings</p>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-3"
        >
          <CheckCircle2 className="w-5 h-5" />
          <p>{success}</p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {(isCreating || editingId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-slate-200 rounded-xl p-6"
          >
            <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Outbreak' : 'Create New Outbreak'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Outbreak Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                    placeholder="e.g., Measles Outbreak 2026"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Disease *</label>
                  <select
                    value={form.diseaseId}
                    onChange={(e) => setForm({ ...form, diseaseId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                    required
                  >
                    <option value="">Select Disease</option>
                    {diseases.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active</label>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <RotateCcw className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-800">Backlog Reporting</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, allowBacklogReporting: !form.allowBacklogReporting })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                        form.allowBacklogReporting 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {form.allowBacklogReporting ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      {form.allowBacklogReporting ? 'Enabled' : 'Disabled'}
                    </button>
                    <span className="text-sm text-slate-500">Allow previous date submissions</span>
                  </div>
                  {form.allowBacklogReporting && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Backlog Start Date</label>
                        <input
                          type="date"
                          value={form.backlogStartDate}
                          onChange={(e) => setForm({ ...form, backlogStartDate: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Backlog End Date</label>
                        <input
                          type="date"
                          value={form.backlogEndDate}
                          onChange={(e) => setForm({ ...form, backlogEndDate: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Save className="w-4 h-4" />
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!isCreating && !editingId && (
        <button
          onClick={handleCreate}
          className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Outbreak
        </button>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : outbreaks.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Activity className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>No outbreaks found</p>
          <p className="text-sm">Create a new outbreak to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {outbreaks.map(outbreak => (
            <div key={outbreak.id} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-800 text-lg">{outbreak.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      outbreak.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                      outbreak.status === 'CONTAINED' ? 'bg-amber-100 text-amber-700' :
                      outbreak.status === 'CLOSED' ? 'bg-slate-100 text-slate-600' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {outbreak.status}
                    </span>
                    {!outbreak.isActive && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Inactive
                      </span>
                    )}
                    {defaultOutbreakId === outbreak.id && (
                      <span className="px-2 py-1 rounded-full text-xs font-black bg-indigo-600 text-white flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {outbreak.disease?.name} • Started: {outbreak.startDate}
                    {outbreak.endDate && ` • Ended: ${outbreak.endDate}`}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={() => handleToggleBacklog(outbreak.id, !outbreak.allowBacklogReporting)}
                      disabled={saving}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        outbreak.allowBacklogReporting 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-500'
                      } disabled:opacity-50`}
                    >
                      <RotateCcw className="w-4 h-4" />
                      {outbreak.allowBacklogReporting ? 'Backlog On' : 'Backlog Off'}
                    </button>
                    {outbreak.allowBacklogReporting && outbreak.backlogStartDate && outbreak.backlogEndDate && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {outbreak.backlogStartDate} to {outbreak.backlogEndDate}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {defaultOutbreakId !== outbreak.id && (
                      <button
                        onClick={() => setAsDefault(outbreak.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-all"
                        title="Set as Default"
                      >
                        <RotateCcw className="w-3 h-3 rotate-45" />
                        Make Default
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(outbreak)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(outbreak.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}