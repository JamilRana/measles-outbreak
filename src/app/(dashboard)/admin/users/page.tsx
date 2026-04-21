"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Trash2, 
  Mail, 
  MapPin, 
  Search,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  Plus,
  X,
  Building2,
  Phone,
  Save,
  ToggleLeft,
  ToggleRight,
  Pencil,
  PlusCircle,
  Globe,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { DIVISIONS, DISTRICTS_BY_DIVISION } from '@/lib/constants';

interface User {
  id: string;
  email: string;
  name: string;
  facilityName: string;
  facilityCode?: string;
  facilityType?: string;
  division?: string | null;
  district?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  facilityId: string | null;
  managedDivisions: string[];
  managedDistricts: string[];
}

interface Facility {
  id: string;
  facilityName: string;
  facilityCode: string;
  division: string;
  district: string;
}

const ROLE_OPTIONS = ["USER", "EDITOR", "ADMIN", "VIEWER"];

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "USER",
    facilityId: "",
    managedDivisions: [] as string[],
    managedDistricts: [] as string[]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchFacilities();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data);
    } catch {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const res = await fetch("/api/admin/facilities");
      const data = await res.json();
      setFacilities(data);
    } catch (e) {
      console.error("Failed to fetch facilities");
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      password: "",
      name: "",
      role: "USER",
      facilityId: "",
      managedDivisions: [],
      managedDistricts: []
    });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      name: user.name || "",
      role: user.role,
      facilityId: user.facilityId || "",
      managedDivisions: user.managedDivisions || [],
      managedDistricts: user.managedDistricts || []
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";
      const body = {
        ...formData,
        id: editingUser?.id,
        facilityId: formData.facilityId === "" ? null : formData.facilityId
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowModal(false);
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: User) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });
      if (res.ok) fetchUsers();
    } catch (e) { console.error(e); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
    } catch (e) { console.error(e); }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.facilityName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
      <Breadcrumbs />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Identity Hub</h1>
          <p className="text-slate-500 mt-1">Manage personnel access, facility linking, and administrative scopes</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 focus:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search user or facility..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button onClick={openCreateModal} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95">
            <PlusCircle className="w-5 h-5" /> Account
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">
                <th className="px-8 py-6">User Identity</th>
                <th className="px-6 py-6">Reporting Entity</th>
                <th className="px-6 py-6 text-center">Status</th>
                <th className="px-6 py-6 text-center">Administrative Rank</th>
                <th className="px-8 py-6 text-right">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic-last-row">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="font-bold text-slate-900">{user.name || "System Managed"}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-mono">{user.email}</div>
                  </td>
                  <td className="px-6 py-6">
                    {user.facilityId ? (
                      <div>
                        <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{user.facilityName}</div>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {user.district}, {user.division}</div>
                      </div>
                    ) : (
                      <div className="text-xs font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" /> High-Level Admin
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-6 text-center">
                    <button onClick={() => toggleActive(user)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${user.isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-slate-100 text-slate-400 border border-slate-200"}`}>
                      {user.isActive ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-6 py-6 text-center">
                     <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase ${user.role === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {user.role}
                     </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEditModal(user)} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white rounded-xl transition-all"><Pencil className="w-5 h-5" /></button>
                      <button onClick={() => deleteUser(user.id)} className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
             <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/20">
                <div className="p-10 pb-0 flex items-center justify-between">
                   <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{editingUser ? "Configure Account" : "User Creation"}</h2>
                   <button onClick={() => setShowModal(false)} className="p-3 bg-slate-100 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all"><X /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="md:col-span-2 space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Email Address</label>
                         <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-4 px-6 text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" placeholder="name@dghs.gov.bd" />
                      </div>

                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                         <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-4 px-6 focus:outline-none focus:border-indigo-500 transition-all" />
                      </div>

                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Access Role</label>
                         <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-4 px-6 focus:outline-none focus:border-indigo-500 transition-all">
                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                         </select>
                      </div>

                      <div className="md:col-span-2 space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center justify-between">
                            <span>Reporting Facility Assignment</span>
                            <span className="text-[9px] lowercase italic font-normal text-amber-500">Unset for regional/national roles</span>
                         </label>
                         <select value={formData.facilityId} onChange={e => setFormData({...formData, facilityId: e.target.value})} className="w-full bg-slate-950 border-2 border-slate-800 text-white rounded-3xl py-4 px-6 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all">
                            <option value="">-- No Local Facility Assigned --</option>
                            {facilities.map(f => (
                               <option key={f.id} value={f.id}>{f.facilityName} ({f.facilityCode}) · {f.district}</option>
                            ))}
                         </select>
                      </div>
                      
                      <div className="md:col-span-2 space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Security Credential</label>
                         <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-4 px-6 focus:outline-none focus:border-indigo-500 transition-all" placeholder={editingUser ? "Leave blank to ignore" : "Secure Password"} />
                      </div>
                   </div>

                   <div className="flex gap-4 pt-4 border-t border-slate-100">
                      <button type="submit" disabled={saving} className="flex-1 bg-slate-900 hover:bg-black text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50">
                         {saving ? <Loader2 className="animate-spin mx-auto" /> : (editingUser ? "Apply Changes" : "Provision Identity")}
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