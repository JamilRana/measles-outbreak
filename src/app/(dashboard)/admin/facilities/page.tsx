"use client";

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Trash2, 
  Pencil, 
  CheckCircle2, 
  XCircle,
  Hash,
  Activity,
  Phone,
  Mail,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { DIVISIONS, DISTRICTS_BY_DIVISION } from '@/lib/constants';

interface Facility {
  id: string;
  facilityName: string;
  facilityCode: string;
  division: string;
  district: string;
  upazila?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  _count?: { users: number };
}

export default function FacilityManagementPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    facilityName: "",
    facilityCode: "",
    division: "",
    district: "",
    upazila: "",
    phone: "",
    email: "",
    isActive: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/facilities");
      const data = await res.json();
      setFacilities(data);
    } catch {
      console.error("Failed to fetch facilities");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      facilityName: "",
      facilityCode: "",
      division: "",
      district: "",
      upazila: "",
      phone: "",
      email: "",
      isActive: true
    });
    setShowModal(true);
  };

  const openEditModal = (fac: Facility) => {
    setEditingId(fac.id);
    setFormData({
      facilityName: fac.facilityName,
      facilityCode: fac.facilityCode,
      division: fac.division,
      district: fac.district,
      upazila: fac.upazila || "",
      phone: fac.phone || "",
      email: fac.email || "",
      isActive: fac.isActive
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = "/api/admin/facilities";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...formData } : formData),
      });
      if (res.ok) {
        setShowModal(false);
        fetchFacilities();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFacility = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action is irreversible.`)) return;
    
    try {
      const res = await fetch(`/api/admin/facilities?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (res.ok) {
        fetchFacilities();
      } else {
        alert(data.error + (data.details ? `\n\nLinked data found:\n- Users: ${data.details.users}\n- Reports: ${data.details.reports}\n- Scheduled Slots: ${data.details.scheduling}` : ""));
      }
    } catch {
      alert("Failed to delete facility");
    }
  };

  const handleToggleStatus = async (fac: Facility) => {
    try {
      const res = await fetch("/api/admin/facilities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fac.id, isActive: !fac.isActive }),
      });
      if (res.ok) fetchFacilities();
    } catch {
      alert("Failed to update status");
    }
  };

  const filteredFacilities = facilities.filter(f => 
    f.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.facilityCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
      <Breadcrumbs />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Health Facility Registry</h1>
          <p className="text-slate-500 mt-1">Manage DGHS official facilities and geographic identifiers</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search facilities..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Register Facility
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-black tracking-[0.1em]">
                <th className="px-8 py-5">Facility & Code</th>
                <th className="px-6 py-5">Geography</th>
                <th className="px-6 py-5">Contacts</th>
                <th className="px-6 py-5 text-center">Users</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : filteredFacilities.map((fac) => (
                <tr key={fac.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900">{fac.facilityName}</div>
                    <div className="text-[10px] font-black text-indigo-500 uppercase mt-0.5 tracking-wider">{fac.facilityCode}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-semibold text-slate-700">{fac.division}</div>
                    <div className="text-xs text-slate-500">{fac.district} {fac.upazila ? `· ${fac.upazila}` : ''}</div>
                  </td>
                  <td className="px-6 py-5 text-xs text-slate-500 space-y-1">
                    {fac.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {fac.phone}</div>}
                    {fac.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {fac.email}</div>}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{fac._count?.users || 0} Accounts</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button 
                      onClick={() => handleToggleStatus(fac)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${fac.isActive ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                    >
                      {fac.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                    <button onClick={() => openEditModal(fac)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl transition-all">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteFacility(fac.id, fac.facilityName)} 
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete Facility"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit Facility" : "Register Facility"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><X /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Facility Name *</label>
                    <input required value={formData.facilityName} onChange={e => setFormData({...formData, facilityName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Facility Code (DGHS Official) *</label>
                    <input required value={formData.facilityCode} onChange={e => setFormData({...formData, facilityCode: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Division *</label>
                    <select required value={formData.division} onChange={e => setFormData({...formData, division: e.target.value, district: ''})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4">
                      <option value="">Select Division</option>
                      {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">District *</label>
                    <select required value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} disabled={!formData.division} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4">
                      <option value="">Select District</option>
                      {formData.division && DISTRICTS_BY_DIVISION[formData.division]?.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Upazila</label>
                    <input value={formData.upazila} onChange={e => setFormData({...formData, upazila: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
                      <input 
                        type="checkbox" 
                        checked={formData.isActive} 
                        onChange={e => setFormData({...formData, isActive: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="block text-sm font-black text-slate-700 uppercase tracking-tight">Active Surveillance Node</span>
                        <span className="block text-xs text-slate-500">Uncheck to suspend reporting capabilities for this facility.</span>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-600 font-medium">Cancel</button>
                  <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                    {saving ? <Loader2 className="animate-spin" /> : <Save />} {editingId ? "Update" : "Register"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
