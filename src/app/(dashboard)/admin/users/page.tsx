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
  ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface User {
  id: string;
  email: string;
  facilityName: string;
  facilityCode?: string;
  facilityType?: string;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  role: string;
  emailVerified: string | null;
  isActive: boolean;
  createdAt: string;
}

const ROLE_OPTIONS = ["USER", "ADMIN", "SUBMITTER", "EXPORTER", "VIEWER"];
const DIVISIONS = ["Dhaka", "Chittagong", "Khulna", "Rajshahi", "Rangpur", "Sylhet", "Barisal", "Mymensingh"];

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    facilityName: "",
    facilityCode: "",
    facilityType: "",
    division: "",
    district: "",
    upazila: "",
    role: "USER",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      password: "",
      facilityName: "",
      facilityCode: "",
      facilityType: "",
      division: "",
      district: "",
      upazila: "",
      role: "USER",
    });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      facilityName: user.facilityName,
      facilityCode: user.facilityCode || "",
      facilityType: user.facilityType || "",
      division: user.division || "",
      district: user.district || "",
      upazila: user.upazila || "",
      role: user.role,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";
      const body = editingUser 
        ? { id: editingUser.id, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to save user");
        return;
      }

      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = async (user: User) => {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, role: newRole }),
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error("Update failed");
    }
  };

  const toggleVerification = async (user: User) => {
    const isVerified = !!user.emailVerified;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, emailVerified: !isVerified }),
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error("Update failed");
    }
  };

  const toggleActive = async (user: User) => {
    const newStatus = !user.isActive;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, isActive: newStatus }),
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error("Update failed");
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error("Delete failed");
    }
  };

  const filteredUsers = users.filter(u => 
    u.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage facility accounts, roles, and verifications</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 uppercase text-[10px] font-black tracking-[0.1em]">
                <th className="px-8 py-5">Facility & Contact</th>
                <th className="px-6 py-5">Location</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-center">Role</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader /></td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${user.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{user.facilityName}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                          <Mail className="w-3.5 h-3.5" /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-semibold text-slate-700">{user.division || 'N/A'}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {user.district || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center gap-2">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">
                          <XCircle className="w-3 h-3" /> Unverified
                        </span>
                      )}
                      <button 
                        onClick={() => toggleActive(user)}
                        title={user.isActive ? "Deactivate User" : "Activate User"}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          user.isActive 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {user.isActive ? (
                          <><ToggleRight className="w-4 h-4" /> Active</>
                        ) : (
                          <><ToggleLeft className="w-4 h-4" /> Inactive</>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button 
                      onClick={() => toggleRole(user)}
                      className={`inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                        user.role === 'ADMIN' 
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                          : user.role === 'SUBMITTER'
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : user.role === 'EXPORTER'
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          : user.role === 'VIEWER'
                          ? 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {user.role}
                    </button>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Edit User"
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => toggleVerification(user)}
                        title={user.emailVerified ? "Unverify Email" : "Verify Email"}
                        className={`p-2 rounded-xl transition-all ${user.emailVerified ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      >
                        {user.emailVerified ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                      </button>
                      <button 
                        onClick={() => deleteUser(user.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredUsers.length === 0 && (
            <div className="p-20 text-center text-slate-400 font-medium">No users found matching your search.</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <UserModal
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onClose={() => setShowModal(false)}
            saving={saving}
            isEdit={!!editingUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UserModal({ 
  formData, 
  setFormData, 
  onSubmit, 
  onClose, 
  saving,
  isEdit 
}: { 
  formData: any; 
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  saving: boolean;
  isEdit: boolean;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? "Edit User" : "Create New User"}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">New Password (leave blank to keep)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Facility Name *</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.facilityName}
                  onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Facility Code</label>
              <input
                type="text"
                value={formData.facilityCode}
                onChange={(e) => setFormData({ ...formData, facilityCode: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Facility Type</label>
              <input
                type="text"
                value={formData.facilityType}
                onChange={(e) => setFormData({ ...formData, facilityType: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                placeholder="e.g., Hospital, Clinic"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Role *</label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              >
                {ROLE_OPTIONS.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Division</label>
              <select
                value={formData.division}
                onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              >
                <option value="">Select Division</option>
                {DIVISIONS.map(div => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Upazila</label>
              <input
                type="text"
                value={formData.upazila}
                onChange={(e) => setFormData({ ...formData, upazila: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isEdit ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-slate-400 font-medium text-sm">Loading user database...</p>
    </div>
  );
}