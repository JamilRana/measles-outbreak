"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle, Plus, Edit2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DIVISIONS, DISTRICTS_BY_DIVISION } from '@/lib/constants';

interface User {
  id: string;
  email: string;
  facilityName: string;
  division: string;
  district: string;
}

interface Report {
  id: string;
  reportingDate: string;
  division: string;
  district: string;
  facilityName: string;
  suspected24h: number;
  suspectedYTD: number;
  confirmed24h: number;
  confirmedYTD: number;
  suspectedDeath24h: number;
  suspectedDeathYTD: number;
  confirmedDeath24h: number;
  confirmedDeathYTD: number;
  admitted24h: number;
  admittedYTD: number;
  discharged24h: number;
  dischargedYTD: number;
  serumSentYTD: number;
}

export default function BulkDataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; message: string; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<'bulk' | 'single'>('bulk');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    reportingDate: new Date().toISOString().split('T')[0],
    suspected24h: '', suspectedYTD: '',
    confirmed24h: '', confirmedYTD: '',
    suspectedDeath24h: '', suspectedDeathYTD: '',
    confirmedDeath24h: '', confirmedDeathYTD: '',
    admitted24h: '', admittedYTD: '',
    discharged24h: '', dischargedYTD: '',
    serumSentYTD: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.filter((u: User) => u.facilityName));
    } catch (e) {
      console.error('Failed to fetch users');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert("Please select a CSV file");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/bulk-reports", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: 0, failed: 0, message: "Upload failed", errors: ["Network error"] });
    } finally {
      setUploading(false);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          division: selectedUser.division,
          district: selectedUser.district,
          facilityName: selectedUser.facilityName,
          userId: selectedUser.id
        })
      });
      
      if (res.ok) {
        setSaveMessage({ type: 'success', message: 'Report submitted successfully!' });
        setFormData({
          reportingDate: new Date().toISOString().split('T')[0],
          suspected24h: '', suspectedYTD: '',
          confirmed24h: '', confirmedYTD: '',
          suspectedDeath24h: '', suspectedDeathYTD: '',
          confirmedDeath24h: '', confirmedDeathYTD: '',
          admitted24h: '', admittedYTD: '',
          discharged24h: '', dischargedYTD: '',
          serumSentYTD: ''
        });
      } else {
        const data = await res.json();
        setSaveMessage({ type: 'error', message: data.error || 'Failed to submit' });
      }
    } catch {
      setSaveMessage({ type: 'error', message: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Data Entry</h1>
        <p className="text-slate-500 mt-1">Upload historical or add single report data</p>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setMode('bulk')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'bulk' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Bulk Upload
        </button>
        <button
          onClick={() => setMode('single')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Single Entry
        </button>
      </div>

      {mode === 'bulk' ? (
        <>
          <div className="bg-white rounded-3xl border border-slate-300 shadow-md p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <Upload className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Upload CSV File</h3>
                  <p className="text-sm text-slate-400 font-medium">Select a CSV file with report data</p>
                </div>
              </div>
              <a 
                href="/sample-reports.csv"
                download
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Download className="w-4 h-4" />
                Download Sample
              </a>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                file 
                  ? "border-indigo-500 bg-indigo-50" 
                  : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-indigo-600" />
                  <p className="font-bold text-slate-700">{file.name}</p>
                  <p className="text-sm text-slate-400">Click to change file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-slate-300" />
                  <p className="font-bold text-slate-600">Click to upload or drag and drop</p>
                  <p className="text-sm text-slate-400">CSV files only</p>
                </div>
              )}
            </div>

            {file && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex justify-end"
              >
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  {uploading ? "Uploading..." : "Upload Data"}
                </button>
              </motion.div>
            )}
          </div>

          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-6 border ${
                result.failed === 0 
                  ? "bg-emerald-50 border-emerald-200" 
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                {result.failed === 0 ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                )}
                <h3 className="text-lg font-bold text-slate-800">{result.message}</h3>
              </div>
              
              <div className="flex gap-6 mb-4">
                <div>
                  <p className="text-sm text-slate-500">Successful</p>
                  <p className="text-2xl font-black text-emerald-600">{result.success}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Failed</p>
                  <p className="text-2xl font-black text-amber-600">{result.failed}</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-bold text-slate-600 mb-2">Errors (first 10):</p>
                  <ul className="text-sm text-slate-500 space-y-1">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-amber-500" />
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-300 shadow-md p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Plus className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Single Report Entry</h3>
              <p className="text-sm text-slate-400 font-medium">Submit report for a specific facility</p>
            </div>
          </div>

          <form onSubmit={handleSingleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Select Facility *</label>
              <select
                value={selectedUser?.id || ''}
                onChange={(e) => {
                  const user = users.find(u => u.id === e.target.value);
                  setSelectedUser(user || null);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                required
              >
                <option value="">Select a facility</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.facilityName} - {user.district}, {user.division}
                  </option>
                ))}
              </select>
              {selectedUser && (
                <p className="text-xs text-slate-500 mt-1">
                  Division: {selectedUser.division} | District: {selectedUser.district}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Reporting Date *</label>
              <input
                type="date"
                value={formData.reportingDate}
                onChange={(e) => setFormData({ ...formData, reportingDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Suspected (24h) *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.suspected24h}
                  onChange={(e) => setFormData({ ...formData, suspected24h: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Suspected (YTD)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.suspectedYTD}
                  onChange={(e) => setFormData({ ...formData, suspectedYTD: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Confirmed (24h) *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.confirmed24h}
                  onChange={(e) => setFormData({ ...formData, confirmed24h: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Confirmed (YTD)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.confirmedYTD}
                  onChange={(e) => setFormData({ ...formData, confirmedYTD: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Deaths - Suspected (24h)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.suspectedDeath24h}
                  onChange={(e) => setFormData({ ...formData, suspectedDeath24h: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Deaths - Suspected (YTD)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.suspectedDeathYTD}
                  onChange={(e) => setFormData({ ...formData, suspectedDeathYTD: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Deaths - Confirmed (24h)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.confirmedDeath24h}
                  onChange={(e) => setFormData({ ...formData, confirmedDeath24h: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Deaths - Confirmed (YTD)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.confirmedDeathYTD}
                  onChange={(e) => setFormData({ ...formData, confirmedDeathYTD: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Admitted (24h)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.admitted24h}
                  onChange={(e) => setFormData({ ...formData, admitted24h: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Admitted (YTD)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.admittedYTD}
                  onChange={(e) => setFormData({ ...formData, admittedYTD: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Discharged (24h)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.discharged24h}
                  onChange={(e) => setFormData({ ...formData, discharged24h: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Discharged (YTD)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.dischargedYTD}
                  onChange={(e) => setFormData({ ...formData, dischargedYTD: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Serum Samples Sent (YTD)</label>
              <input
                type="number"
                min="0"
                value={formData.serumSentYTD}
                onChange={(e) => setFormData({ ...formData, serumSentYTD: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm"
              />
            </div>

            {saveMessage && (
              <div className={`p-4 rounded-xl ${saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {saveMessage.message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !selectedUser}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              {saving ? "Saving..." : "Submit Report"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
