"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { DIVISIONS, DISTRICTS_BY_DIVISION } from '@/lib/constants';
import { SearchableSelect } from '@/components/SearchableSelect';
import { hasPermission } from '@/lib/rbac';
import { useSession } from 'next-auth/react';
import { AlertCircle } from 'lucide-react';

interface Facility {
  id: string;
  facilityName: string;
  facilityCode: string;
  facilityTypeId?: string;
  facilityTypeRel?: {
    id: string;
    name: string;
    slug: string;
    tier: string | null;
  };
  division: string;
  district: string;
  upazila?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  _count?: { users: number };
}

export default function FacilityManagementPage() {
  const { data: session } = useSession();
  const role = session?.user?.role || "";
  const canManage = hasPermission(role, 'facility:manage');
  const canView = hasPermission(role, 'facility:view');

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    facilityName: "",
    facilityCode: "",
    facilityTypeId: "",
    division: "",
    district: "",
    upazila: "",
    phone: "",
    email: "",
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [facilityTypes, setFacilityTypes] = useState<any[]>([]);

  useEffect(() => {
    fetchFacilities();
    fetchFacilityTypes();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDivision, selectedDistrict, statusFilter]);

  const resetFilters = () => {
    setSelectedDivision("");
    setSelectedDistrict("");
    setStatusFilter("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const fetchFacilityTypes = async () => {
    try {
      const res = await fetch("/api/admin/facility-types");
      const data = await res.json();
      if (Array.isArray(data)) {
        setFacilityTypes(data);
      }
    } catch {
      console.error("Failed to fetch facility types");
    }
  };

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
      facilityTypeId: "",
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
      facilityTypeId: (fac as any).facilityTypeId || "",
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
        setSelectedIds(prev => prev.filter(i => i !== id));
      } else {
        alert(data.error + (data.details ? `\n\nLinked data found:\n- Users: ${data.details.users}\n- Reports: ${data.details.reports}\n- Scheduled Slots: ${data.details.scheduling}` : ""));
      }
    } catch {
      alert("Failed to delete facility");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} facilities? Facilities with linked data (reports/users) will not be deleted.`)) return;

    setIsDeletingBulk(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/facilities?id=${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setIsDeletingBulk(false);
    setSelectedIds([]);
    fetchFacilities();
    alert(`Cleanup complete: ${successCount} deleted, ${failCount} failed (due to linked data).`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFacilities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFacilities.map(f => f.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
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

  if (!canView) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
        <p className="text-slate-500 mt-2">You need administrative privileges to access this page.</p>
      </div>
    );
  }

  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      const matchesSearch = f.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            f.facilityCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDivision = !selectedDivision || f.division === selectedDivision;
      const matchesDistrict = !selectedDistrict || f.district === selectedDistrict;
      const matchesStatus = statusFilter === "all" ||
                            (statusFilter === "active" && f.isActive) ||
                            (statusFilter === "inactive" && !f.isActive);
      return matchesSearch && matchesDivision && matchesDistrict && matchesStatus;
    });
  }, [facilities, searchTerm, selectedDivision, selectedDistrict, statusFilter]);

  const paginatedFacilities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFacilities.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFacilities, currentPage, itemsPerPage]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
      <Breadcrumbs />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Health Facility Registry</h1>
          <p className="text-slate-500 mt-1">Manage facilities</p>
        </div>
        <div className="flex items-center gap-4">
          {canManage && selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              className="flex items-center gap-2 px-5 py-3 bg-rose-50 text-rose-600 font-bold rounded-2xl hover:bg-rose-100 transition-all border border-rose-100"
            >
              {isDeletingBulk ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Delete {selectedIds.length}
            </button>
          )}
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
          {canManage && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              Register Facility
            </button>
          )}
        </div>
      </div>

      {/* Facilities Registry Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Search Facilities</label>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by name, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="min-w-[150px]">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Division</label>
          <select
            value={selectedDivision}
            onChange={(e) => { setSelectedDivision(e.target.value); setSelectedDistrict(""); }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Divisions</option>
            {DIVISIONS.map(div => <option key={div} value={div}>{div}</option>)}
          </select>
        </div>

        <div className="min-w-[150px]">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">District</label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={!selectedDivision}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer disabled:opacity-55"
          >
            <option value="">All Districts</option>
            {(selectedDivision ? DISTRICTS_BY_DIVISION[selectedDivision] || [] : []).map(dist => (
              <option key={dist} value={dist}>{dist}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[120px]">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">Active Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active Nodes</option>
            <option value="inactive">Inactive Nodes</option>
          </select>
        </div>

        <div className="mt-5">
          <button
            onClick={resetFilters}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-black tracking-[0.1em]">
                {canManage && (
                  <th className="pl-8 py-5 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredFacilities.length && filteredFacilities.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                    />
                  </th>
                )}
                <th className={canManage ? "px-6 py-5" : "pl-8 px-6 py-5"}>Facility & Code</th>
                <th className="px-6 py-5">Geography</th>
                <th className="px-6 py-5">Contacts</th>
                <th className="px-6 py-5 text-center">Users</th>
                <th className="px-6 py-5 text-center">Status</th>
                {canManage && <th className="px-8 py-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : paginatedFacilities.map((fac) => (
                <tr key={fac.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(fac.id) ? 'bg-indigo-50/30' : ''}`}>
                  {canManage && (
                    <td className="pl-8 py-5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(fac.id)}
                        onChange={() => toggleSelect(fac.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                      />
                    </td>
                  )}
                  <td className={canManage ? "px-6 py-5" : "pl-8 px-6 py-5"}>
                    <div className="font-bold text-slate-900">{fac.facilityName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">{fac.facilityCode}</span>
                      {fac.facilityTypeRel?.name && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{fac.facilityTypeRel.name}</span>
                        </>
                      )}
                    </div>
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
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${fac.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {fac.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </td>
                  {canManage && (
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
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Navigation Console */}
        <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigation Console</p>
            <p className="text-sm font-black text-slate-700 tracking-tight mt-0.5 font-sans">
              Showing <b>{filteredFacilities.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredFacilities.length)}</b> of <b>{filteredFacilities.length}</b> units
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 disabled:opacity-40 transition-all shadow-sm active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 px-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                Page {currentPage} / {Math.ceil(filteredFacilities.length / itemsPerPage) || 1}
              </span>
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredFacilities.length / itemsPerPage), p + 1))}
              disabled={currentPage >= Math.ceil(filteredFacilities.length / itemsPerPage)}
              className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 disabled:opacity-40 transition-all shadow-sm active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto pt-16 md:pt-24">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">{editingId ? "Edit Facility" : "Register Facility"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><X /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Facility Name *</label>
                    <input required value={formData.facilityName} onChange={e => setFormData({ ...formData, facilityName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Facility Code (DGHS Official) *</label>
                    <input required value={formData.facilityCode} onChange={e => setFormData({ ...formData, facilityCode: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Facility Type</label>
                    <SearchableSelect
                      label=""
                      placeholder="Select Facility Type"
                      options={facilityTypes.map(t => ({ value: t.id, label: t.name }))}
                      value={formData.facilityTypeId}
                      onChange={value => setFormData({ ...formData, facilityTypeId: value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Division *</label>
                    <SearchableSelect
                      label=""
                      placeholder="Select Division"
                      options={DIVISIONS.map(d => ({ value: d, label: d }))}
                      value={formData.division}
                      onChange={value => {
                        setFormData({ ...formData, division: value, district: '' })
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">District *</label>
                    <SearchableSelect
                      label=""
                      placeholder="Select District"
                      options={(formData.division ? DISTRICTS_BY_DIVISION[formData.division] : [])?.map(dist => ({ value: dist, label: dist })) || []}
                      value={formData.district}
                      onChange={value => setFormData({ ...formData, district: value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Upazila</label>
                    <input value={formData.upazila} onChange={e => setFormData({ ...formData, upazila: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Contact Phone</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Contact Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
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
