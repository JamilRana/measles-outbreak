"use client";

import { useState, useEffect, useMemo } from 'react';
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
  GripVertical,
  ArrowUp,
  ArrowDown,
  FileText,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Breadcrumbs from '@/components/Breadcrumbs';

interface FormField {
  id: string;
  label: string;
  labelBn?: string;
  fieldKey: string;
  fieldType: string;
  options?: string;
  section?: string;
  isRequired: boolean;
  sortOrder: number;
  createdAt?: string;
}

interface Outbreak {
  id: string;
  name: string;
  disease: { name: string };
}

const FIELD_TYPES = ['NUMBER', 'TEXT', 'SELECT', 'DATE', 'BOOLEAN'];
const SECTIONS = ['cases', 'mortality', 'hospitalization', 'lab', 'other'];

export default function FormFieldsPage() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const [fields, setFields] = useState<FormField[]>([]);
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [selectedOutbreakId, setSelectedOutbreakId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [form, setForm] = useState({
    label: '',
    labelBn: '',
    fieldKey: '',
    fieldType: 'NUMBER',
    options: '',
    section: 'other',
    isRequired: false,
    sortOrder: 0
  });

  useEffect(() => {
    fetchOutbreaks();
  }, []);

  useEffect(() => {
    if (selectedOutbreakId) {
      fetchFields();
    }
  }, [selectedOutbreakId]);

  const fetchOutbreaks = async () => {
    try {
      const res = await fetch('/api/public/outbreaks');
      const data = await res.json();
      setOutbreaks(data);
      if (data.length > 0 && !selectedOutbreakId) {
        setSelectedOutbreakId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch outbreaks:', err);
    }
  };

  const fetchFields = async () => {
    if (!selectedOutbreakId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/public/fields?outbreakId=${selectedOutbreakId}`);
      const data = await res.json();
      setFields(data);
    } catch (err) {
      console.error('Failed to fetch fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      label: '',
      labelBn: '',
      fieldKey: '',
      fieldType: 'NUMBER',
      options: '',
      section: 'other',
      isRequired: false,
      sortOrder: fields.length + 1
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
    setEditingId(null);
  };

  const handleEdit = (field: FormField) => {
    setForm({
      label: field.label,
      labelBn: field.labelBn || '',
      fieldKey: field.fieldKey,
      fieldType: field.fieldType,
      options: field.options || '',
      section: field.section || 'other',
      isRequired: field.isRequired,
      sortOrder: field.sortOrder
    });
    setEditingId(field.id);
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
    if (!form.label || !form.fieldKey) {
      setError('Label and Field Key are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder)
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/admin/form-fields/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/admin/form-fields?outbreakId=${selectedOutbreakId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setSuccess(editingId ? 'Field updated successfully' : 'Field created successfully');
        fetchFields();
        handleCancel();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save field');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;
    
    try {
      const res = await fetch(`/api/admin/form-fields/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setSuccess('Field deleted successfully');
        fetchFields();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to delete field');
      }
    } catch (err) {
      setError('Failed to delete field');
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(f => f.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) return;

    const newOrder = direction === 'up' ? fields[index - 1].sortOrder : fields[index + 1].sortOrder;
    const currentOrder = fields[index].sortOrder;

    try {
      await fetch(`/api/admin/form-fields/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: newOrder })
      });
      await fetch(`/api/admin/form-fields/${direction === 'up' ? fields[index - 1].id : fields[index + 1].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: currentOrder })
      });
      fetchFields();
    } catch (err) {
      console.error('Failed to reorder:', err);
    }
  };

  const groupedFields = useMemo(() => {
    const groups: Record<string, FormField[]> = {};
    fields.forEach(f => {
      const s = f.section || 'other';
      if (!groups[s]) groups[s] = [];
      groups[s].push(f);
    });
    Object.keys(groups).forEach(k => groups[k].sort((a, b) => a.sortOrder - b.sortOrder));
    return groups;
  }, [fields]);

  const sectionNames: Record<string, string> = {
    cases: 'Cases',
    mortality: 'Mortality',
    hospitalization: 'Hospitalization',
    lab: 'Laboratory',
    other: 'Other'
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
          <h1 className="text-2xl font-bold text-slate-900">Form Field Management</h1>
          <p className="text-slate-500 mt-1">Configure report form fields for each outbreak</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedOutbreakId}
            onChange={(e) => setSelectedOutbreakId(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="">Select Outbreak</option>
            {outbreaks.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <button
            onClick={fetchFields}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
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
            <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Field' : 'Create New Field'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Label (English) *</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                    placeholder="e.g., Suspected Cases (24h)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Label (Bengali)</label>
                  <input
                    type="text"
                    value={form.labelBn}
                    onChange={(e) => setForm({ ...form, labelBn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                    placeholder="e.g., সন্দেহধন্যা (২৪ ঘণ্টা)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Field Key *</label>
                  <input
                    type="text"
                    value={form.fieldKey}
                    onChange={(e) => setForm({ ...form, fieldKey: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                    placeholder="e.g., suspected24h"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Field Type</label>
                  <select
                    value={form.fieldType}
                    onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                  <select
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                  >
                    {SECTIONS.map(section => (
                      <option key={section} value={section}>{sectionNames[section] || section}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                    min="0"
                  />
                </div>
                {form.fieldType === 'SELECT' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Options (JSON array)</label>
                    <input
                      type="text"
                      value={form.options}
                      onChange={(e) => setForm({ ...form, options: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                      placeholder='["Option 1", "Option 2", "Option 3"]'
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isRequired}
                      onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-700">Required Field</span>
                  </label>
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
          Add New Field
        </button>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : fields.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p>No fields configured yet</p>
          <p className="text-sm">Create a new field to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFields).map(([section, sectionFields]) => (
            <div key={section} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-800">{sectionNames[section] || section}</h3>
                <p className="text-sm text-slate-500">{sectionFields.length} fields</p>
              </div>
              <div className="divide-y divide-slate-100">
                {(sectionFields as FormField[]).map((field, idx) => (
                  <div key={field.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMove(field.id, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMove(field.id, 'down')}
                          disabled={idx === sectionFields.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{field.label}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">{field.fieldKey}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">{field.fieldType}</span>
                          {field.isRequired && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-amber-600">Required</span>
                            </>
                          )}
                        </div>
                        {field.labelBn && (
                          <p className="text-sm text-slate-500">{field.labelBn}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(field)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(field.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}