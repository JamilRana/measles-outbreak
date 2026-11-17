"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle, Plus, Database, Search, ChevronDown, Check, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DIVISIONS, DISTRICTS_BY_DIVISION } from '@/lib/constants';
import Breadcrumbs from '@/components/Breadcrumbs';
import UnifiedReportForm from '@/components/UnifiedReportForm';
import { useSearchParams } from 'next/navigation';
import { SearchableSelect } from '@/components/SearchableSelect';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';


interface User {
  id: string;
  email: string;
  facilityName: string;
  division: string;
  district: string;
}

export default function BulkDataPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Configuration...</div>}>
      <BulkDataContent />
    </React.Suspense>
  );
}

function BulkDataContent() {
  const { data: session } = useSession();
  const role = session?.user?.role || "";
  const canManage = hasPermission(role, 'data:manage') || role === 'ADMIN' || role === 'EDITOR';
  const canView = hasPermission(role, 'admin:view');

  const searchParams = useSearchParams();
  const [outbreaks, setOutbreaks] = useState<any[]>([]);
  const [selectedOutbreakId, setSelectedOutbreakId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; message: string; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<'bulk' | 'single'>('bulk');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchOutbreaks();
  }, []);

  const fetchOutbreaks = async () => {
    try {
      const res = await fetch('/api/outbreaks');
      const data = await res.json();
      setOutbreaks(data);
    } catch (e) {
      console.error('Failed to fetch outbreaks');
    }
  };

  useEffect(() => {
    if (searchParams.get('mode') === 'single') setMode('single');
    const oId = searchParams.get('outbreakId');
    if (oId) setSelectedOutbreakId(oId);

    const fId = searchParams.get('facilityId');
    if (fId && users.length > 0) {
      const u = users.find(u => u.id === fId);
      if (u) setSelectedUser(u);
    }
  }, [searchParams, users]);

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
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("outbreakId", selectedOutbreakId);

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

  if (!canView) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
        <p className="text-slate-500 mt-2">You need administrative privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <Breadcrumbs />
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
        {canManage && (
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Single Entry
          </button>
        )}
      </div>

      {mode === 'bulk' ? (
        <>
          <div className="bg-white rounded-3xl border border-slate-300 shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <Upload className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Upload Data File</h3>
                  <p className="text-sm text-slate-400 font-medium">Select an Excel or CSV file with report data</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!selectedOutbreakId) {
                      alert("Please select an outbreak context first.");
                      return;
                    }
                    window.location.href = `/api/admin/bulk-reports?outbreakId=${selectedOutbreakId}&format=xlsx`;
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Excel Template
                </button>
                <button
                  onClick={() => {
                    if (!selectedOutbreakId) {
                      alert("Please select an outbreak context first.");
                      return;
                    }
                    window.location.href = `/api/admin/bulk-reports?outbreakId=${selectedOutbreakId}&format=csv`;
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  CSV Template
                </button>
              </div>
            </div>

            <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <SearchableSelect 
                label="Target Outbreak Context"
                placeholder="Select Outbreak Context"
                options={outbreaks.map(o => ({ value: o.id, label: o.name }))}
                value={selectedOutbreakId}
                onChange={setSelectedOutbreakId}
                icon={Database}
              />
              <p className="mt-2 text-[10px] text-slate-400 font-bold italic">* All records in the file will be mapped to this outbreak.</p>
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
                accept=".csv,.xlsx,.xls" 
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

            {file && canManage && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex justify-end"
              >
                <button
                  onClick={handleUpload}
                  disabled={uploading || !selectedOutbreakId}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            {file && !canManage && (
               <p className="mt-4 text-center text-xs font-bold text-amber-600 uppercase tracking-widest">Read-Only Access: Upload Restricted</p>
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {result.failed === 0 ? (
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  )}
                  <h3 className="text-lg font-bold text-slate-800">{result.message}</h3>
                </div>
                {result.success > 0 && (
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-bold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm"
                  >
                    View Dashboard
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                )}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <SearchableSelect 
                label="1. Outbreak Target (১. প্রাদুর্ভাবের প্রেক্ষাপট)"
                placeholder="Select Outbreak Context"
                options={outbreaks.map(o => ({ value: o.id, label: o.name }))}
                value={selectedOutbreakId}
                onChange={setSelectedOutbreakId}
                icon={Activity}
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <SearchableSelect 
                label="2. Facility Context (২. স্বাস্থ্যসেবা কেন্দ্রের প্রেক্ষাপট)"
                placeholder="Select Reporting Facility"
                options={users.map(u => ({ value: u.id, label: `${u.facilityName} (${u.district})` }))}
                value={selectedUser?.id || ''}
                onChange={(val: string) => {
                  const user = users.find(u => u.id === val);
                  setSelectedUser(user || null);
                }}
                icon={Plus}
              />
            </div>
          </div>

          {selectedOutbreakId && selectedUser ? (
            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800 tracking-tight">Dynamic Intelligent Form</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading fields based on {outbreaks.find(o => o.id === selectedOutbreakId)?.name}</p>
                </div>
              </div>

              <UnifiedReportForm 
                outbreakId={selectedOutbreakId}
                facilityId={selectedUser.id}
                onSuccess={() => setSaveMessage({ type: 'success', message: 'Intelligence record processed successfully.' })}
              />
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center mt-6">
               <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                  <Database className="w-8 h-8 text-slate-300" />
               </div>
               <p className="text-slate-400 font-bold text-sm tracking-tight">
                 Select an outbreak and facility context to load the intelligent data entry matrix.
               </p>
            </div>
          )}

          {saveMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-2xl mt-6 flex items-center gap-3 font-bold text-sm ${saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}
            >
              {saveMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {saveMessage.message}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
