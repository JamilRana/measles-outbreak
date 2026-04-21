"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle, Plus, Database, Search, ChevronDown, Check, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DIVISIONS, DISTRICTS_BY_DIVISION } from '@/lib/constants';
import Breadcrumbs from '@/components/Breadcrumbs';
import UnifiedReportForm from '@/components/UnifiedReportForm';
import { useSearchParams } from 'next/navigation';

const SearchableSelect = ({ label, options, value, onChange, placeholder, icon: Icon }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((o: any) => 
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find((o: any) => o.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 flex items-center justify-between shadow-sm hover:border-indigo-300 transition-all"
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-indigo-500" />}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 overflow-hidden"
          >
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                autoFocus
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-slate-700 focus:ring-0 outline-none"
              />
            </div>
            <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt: any) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                      value === opt.value
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {value === opt.value && <Check className="w-4 h-4" />}
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-[10px] font-bold text-slate-400 italic">No results found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
              <button
                onClick={() => {
                  if (!selectedOutbreakId) {
                    alert("Please select an outbreak context first to download the correct template.");
                    return;
                  }
                  window.location.href = `/api/admin/bulk-reports?outbreakId=${selectedOutbreakId}`;
                }}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
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

            {file && (
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <SearchableSelect 
                label="1. Outbreak Target"
                placeholder="Select Outbreak Context"
                options={outbreaks.map(o => ({ value: o.id, label: o.name }))}
                value={selectedOutbreakId}
                onChange={setSelectedOutbreakId}
                icon={Activity}
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <SearchableSelect 
                label="2. Facility Context"
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
