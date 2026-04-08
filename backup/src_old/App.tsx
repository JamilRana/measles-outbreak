/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  LayoutDashboard, 
  Settings, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Edit, 
  Search, 
  Filter,
  LogOut,
  ChevronRight,
  TrendingUp,
  Users,
  Hospital,
  Skull,
  X,
  Calendar,
  XCircle,
  Download,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

// --- Constants ---

const DISTRICTS_BY_DIVISION: Record<string, string[]> = {
  'Barishal': ['Barguna', 'Barishal', 'Bhola', 'Jhalokathi', 'Patuakhali', 'Pirojpur'],
  'Chattogram': ['Bandarban', 'Brahmanbaria', 'Chandpur', 'Chattogram', "Cox's Bazar", 'Cumilla', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati', 'Feni'],
  'Dhaka': ['Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail'],
  'Khulna': ['Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  'Mymensingh': ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'],
  'Rajshahi': ['Bogura', 'Chapainawabganj', 'Joypurhat', 'Naogaon', 'Natore', 'Pabna', 'Rajshahi', 'Sirajganj'],
  'Rangpur': ['Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon'],
  'Sylhet': ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet']
};

const DIVISIONS = Object.keys(DISTRICTS_BY_DIVISION);

const ADMIN_PASSWORD = "MIS@1234@";

// --- Types ---

interface Submission {
  id: number;
  entryTime: string;
  division: string;
  district: string;
  reportingDate: string;
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

// --- Sub-components (Defined outside to avoid focus loss) ---

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="mb-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
      {children}
    </div>
  </div>
);

const InputGroup = ({ 
  label, 
  labelBn, 
  name, 
  value, 
  onChange, 
  type = "number", 
  required = true, 
  isSelect = false, 
  options = [], 
  fullWidth = false, 
  disabled = false 
}: any) => (
  <div className={`flex flex-col ${fullWidth ? 'md:col-span-2' : ''}`}>
    <label className="text-sm font-semibold text-slate-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {labelBn && <span className="text-xs text-slate-500 mb-2 leading-tight">{labelBn}</span>}
    
    {isSelect ? (
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm py-2.5 px-3 border ${
          disabled 
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
            : 'bg-white border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
        }`}
      >
        <option value="" disabled>Select an option</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border bg-white placeholder-slate-300"
        placeholder={type === 'number' ? '0' : 'Enter details...'}
      />
    )}
  </div>
);

// --- Main Application ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'dashboard' | 'admin'>('form');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modals
  const [editRecord, setEditRecord] = useState<Submission | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Live Clock (GMT+6)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetch('/api/submissions')
      .then(res => res.json())
      .then(data => setSubmissions(data))
      .catch(err => console.error("Failed to fetch submissions:", err));
  }, []);

  const formatGMT6 = (date: Date) => {
    // Bangladesh is GMT+6
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  };

  const handleAddSubmission = async (data: Omit<Submission, 'id' | 'entryTime'>) => {
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const newRecord = await res.json();
      setSubmissions(prev => [...prev, newRecord]);
      setSuccessMessage("Submission saved successfully!");
      setTimeout(() => {
        setSuccessMessage(null);
        setActiveTab('dashboard');
      }, 2000);
    } catch (err) {
      console.error("Failed to add submission:", err);
    }
  };

  const handleUpdateSubmission = async (data: Submission) => {
    try {
      const res = await fetch(`/api/submissions/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const updatedRecord = await res.json();
      setSubmissions(prev => prev.map(s => s.id === updatedRecord.id ? updatedRecord : s));
      setEditRecord(null);
      setSuccessMessage("Record updated successfully!");
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      console.error("Failed to update submission:", err);
    }
  };

  const handleDeleteSubmission = async (id: number) => {
    try {
      await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      setSubmissions(prev => prev.filter(s => s.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete submission:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sticky Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-white p-1.5 rounded-lg shadow-inner">
                <TrendingUp className="w-6 h-6 text-indigo-700" />
              </div>
              <span className="text-xl font-bold tracking-tight">Districtwise Measles Outbreak Monitoring Platform</span>
            </div>
            <div className="flex gap-1">
              <NavButton 
                active={activeTab === 'form'} 
                onClick={() => setActiveTab('form')}
                icon={<ClipboardList className="w-5 h-5" />}
                label="Data Entry"
              />
              <NavButton 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')}
                icon={<LayoutDashboard className="w-5 h-5" />}
                label="Dashboard"
              />
              <NavButton 
                active={activeTab === 'admin'} 
                onClick={() => setActiveTab('admin')}
                icon={<Settings className="w-5 h-5" />}
                label="Admin"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DataEntryForm 
                onSubmit={handleAddSubmission} 
                currentTime={currentTime}
              />
            </motion.div>
          )}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Dashboard submissions={submissions} />
            </motion.div>
          )}
          {activeTab === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {!adminLoggedIn ? (
                <AdminLogin onLogin={() => setAdminLoggedIn(true)} />
              ) : (
                <AdminPanel 
                  submissions={submissions} 
                  onEdit={setEditRecord} 
                  onDelete={setDeleteConfirmId}
                  onLogout={() => setAdminLoggedIn(false)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white px-8 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-slate-800">Edit Submission</h2>
              <button onClick={() => setEditRecord(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-8">
              <DataEntryForm 
                initialData={editRecord} 
                onSubmit={handleUpdateSubmission} 
                isEdit 
                currentTime={editRecord.entryTime}
              />
            </div>
          </motion.div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center"
          >
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Confirm Delete</h2>
            <p className="text-slate-500 mb-8">Are you sure you want to delete this record? This action cannot be undone.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteSubmission(deleteConfirmId)}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// --- Navigation Button ---

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
        active 
          ? 'bg-white/20 text-white shadow-inner' 
          : 'text-indigo-100 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      <span className="hidden sm:inline font-medium">{label}</span>
    </button>
  );
}

// --- Feature 2: Data Entry Form ---

function DataEntryForm({ 
  onSubmit, 
  initialData, 
  isEdit = false,
  currentTime
}: { 
  onSubmit: (data: any) => void; 
  initialData?: Submission;
  isEdit?: boolean;
  currentTime: Date | string;
}) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<any>(
    initialData || {
      division: '', district: '', date: '', facility: '',
      suspected24h: '', admitted24h: '', discharged24h: '', suspectedDeaths24h: '',
      confirmed24h: '', confirmedDeaths24h: '',
      suspectedYear: '', admittedYear: '', dischargedYear: '', suspectedDeathsYear: '',
      confirmedYear: '', confirmedDeathsYear: '', serumSentYear: ''
    }
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => {
      const updated = { ...prev, [name]: value };
      if (name === 'division') {
        updated.district = ''; 
      }
      return updated;
    });
    setValidationErrors([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const errors: string[] = [];
    if (Number(formData.suspectedYear) < Number(formData.suspected24h)) errors.push("Suspected Year-to-Date cannot be less than 24h count.");
    if (Number(formData.confirmedYear) < Number(formData.confirmed24h)) errors.push("Confirmed Year-to-Date cannot be less than 24h count.");
    if (Number(formData.suspectedDeathsYear) < Number(formData.suspectedDeaths24h)) errors.push("Suspected Deaths Year-to-Date cannot be less than 24h count.");
    if (Number(formData.confirmedDeathsYear) < Number(formData.confirmedDeaths24h)) errors.push("Confirmed Deaths Year-to-Date cannot be less than 24h count.");
    if (Number(formData.admittedYear) < Number(formData.admitted24h)) errors.push("Admitted Year-to-Date cannot be less than 24h count.");
    if (Number(formData.dischargedYear) < Number(formData.discharged24h)) errors.push("Discharged Year-to-Date cannot be less than 24h count.");

    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const entryTimeStr = new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });

    const processedData = {
      ...formData,
      id: initialData?.id || Date.now(),
      entryTime: entryTimeStr,
      reportingDate: formData.date, // Map PDF field 'date' to our 'reportingDate'
      facilityName: formData.facility, // Map PDF field 'facility' to our 'facilityName'
      suspected24h: Number(formData.suspected24h) || 0,
      admitted24h: Number(formData.admitted24h) || 0,
      discharged24h: Number(formData.discharged24h) || 0,
      suspectedDeath24h: Number(formData.suspectedDeaths24h) || 0,
      confirmed24h: Number(formData.confirmed24h) || 0,
      confirmedDeath24h: Number(formData.confirmedDeaths24h) || 0,
      suspectedYTD: Number(formData.suspectedYear) || 0,
      admittedYTD: Number(formData.admittedYear) || 0,
      dischargedYTD: Number(formData.dischargedYear) || 0,
      suspectedDeathYTD: Number(formData.suspectedDeathsYear) || 0,
      confirmedYTD: Number(formData.confirmedYear) || 0,
      confirmedDeathYTD: Number(formData.confirmedDeathsYear) || 0,
      serumSentYTD: Number(formData.serumSentYear) || 0
    };

    setIsSubmitted(true);
    setTimeout(() => {
      onSubmit(processedData);
      setIsSubmitted(false);
      if (!isEdit) {
        setFormData({
          division: '', district: '', date: '', facility: '',
          suspected24h: '', admitted24h: '', discharged24h: '', suspectedDeaths24h: '',
          confirmed24h: '', confirmedDeaths24h: '',
          suspectedYear: '', admittedYear: '', dischargedYear: '', suspectedDeathsYear: '',
          confirmedYear: '', confirmedDeathsYear: '', serumSentYear: ''
        });
      }
    }, 1000);
  };

  const availableDistricts = formData.division ? DISTRICTS_BY_DIVISION[formData.division] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {isSubmitted ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-12 text-center flex flex-col items-center">
          <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Report Submitted Successfully</h2>
          <p className="text-slate-600">The data has been added to the dashboard.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Daily Measles Outbreak Reporting</h1>
              <p className="text-slate-600 mt-2">Please complete the daily monitoring form below.</p>
            </div>
            <div className="flex flex-col items-end bg-indigo-50/80 px-4 py-2.5 rounded-xl border border-indigo-100 shadow-sm min-w-[200px]">
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1.5"/> Bangladesh Time
              </span>
              <span className="text-xl font-black text-indigo-700 tabular-nums tracking-tight">
                {typeof currentTime === 'string' ? currentTime : currentTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' })}
              </span>
              {typeof currentTime !== 'string' && (
                <span className="text-xs font-medium text-indigo-600/80 mt-0.5">
                  {currentTime.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          <div className="mb-8 p-5 bg-indigo-50 border-l-4 border-indigo-500 text-sm text-indigo-900 rounded-r-lg flex flex-col space-y-1.5 shadow-sm">
            <span className="font-semibold text-base mb-1">Important Instructions:</span>
            <span>• <strong>ইংরেজিতে পূরণ করুন।</strong> (Fill in English)</span>
            <span>• <strong>প্রতিদিন সকাল ৯টার মধ্যে একবার পূরণ করুন।</strong> (Submit once daily by 9 AM)</span>
            <span>• <strong>সাবমিট করার আগে ভালো করে দেখুন ভুল আছে কিনা।</strong> (Review before submitting)</span>
            <span className="font-bold text-red-700 mt-2 bg-red-50 p-2 rounded inline-block w-fit border border-red-100">
              • প্রতিদিন একবার এন্ট্রি দিন, একই দিনে দ্বিতীয় বার এন্ট্রি নেয়া যাবে না। (Only ONE entry per day)
            </span>
          </div>

          {validationErrors.length > 0 && (
            <div className="mb-8 p-5 bg-red-50 border-l-4 border-red-500 text-sm text-red-900 rounded-r-lg flex flex-col space-y-1 shadow-sm">
              <span className="font-bold text-base mb-1 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" /> Validation Errors:
              </span>
              {validationErrors.map((err, i) => <span key={i}>• {err}</span>)}
            </div>
          )}

          <Section title="1. General Information" subtitle="Location and facility reporting">
            <InputGroup 
              label="Division" 
              labelBn="(আপনার বিভাগের নাম নির্বাচন করুন)" 
              name="division" 
              value={formData.division} 
              onChange={handleChange} 
              isSelect 
              options={DIVISIONS} 
            />
            <InputGroup 
              label="District name (English)" 
              labelBn="(আপনার জেলার নাম নির্বাচন করুন)" 
              name="district" 
              value={formData.district}
              onChange={handleChange}
              isSelect 
              options={availableDistricts} 
              disabled={!formData.division} 
            />
            <InputGroup 
              label="Reporting Date" 
              name="date" 
              value={formData.date} 
              onChange={handleChange} 
              type="date" 
            />
            <InputGroup 
              label="Reporting Facility Name" 
              labelBn="(যে প্রতিষ্ঠান রিপোর্ট এন্ট্রি করছে তার নাম লিখুন, এখানে নিজের নাম লিখবেন না)" 
              name="facility" 
              value={formData.facility} 
              onChange={handleChange} 
              type="text" 
              required={false} 
            />
          </Section>

          <Section title="2. Suspected Cases" subtitle="Patients displaying measles-like symptoms">
            <InputGroup 
              label="Suspected cases in last 24 hrs" 
              labelBn="গত ২৪ ঘণ্টায় সন্দেহজনক হাম রোগীর সংখ্যা" 
              name="suspected24h" 
              value={formData.suspected24h} 
              onChange={handleChange} 
            />
            <InputGroup 
              label="Total suspected cases in this year" 
              labelBn="অদ্যাবধি মোট সন্দেহজনক হাম রোগীর সংখ্যা" 
              name="suspectedYear" 
              value={formData.suspectedYear} 
              onChange={handleChange} 
            />
          </Section>

          <Section title="3. Confirmed Cases" subtitle="Laboratory or clinically confirmed measles cases">
            <InputGroup 
              label="Confirmed cases in last 24 hrs" 
              labelBn="গত ২৪ ঘণ্টায় নিশ্চিত হাম রোগীর সংখ্যা" 
              name="confirmed24h" 
              value={formData.confirmed24h} 
              onChange={handleChange} 
            />
            <InputGroup 
              label="Total confirmed cases in this year" 
              labelBn="অদ্যাবধি মোট নিশ্চিত হাম রোগীর সংখ্যা" 
              name="confirmedYear" 
              value={formData.confirmedYear} 
              onChange={handleChange} 
            />
          </Section>

          <Section title="4. Mortality (Deaths)" subtitle="Deaths attributed to suspected or confirmed measles">
            <InputGroup 
              label="Deaths due to suspected cases (24 hrs)" 
              labelBn="গত ২৪ ঘণ্টায় সন্দেহজনক হাম রোগে মৃত্যুর সংখ্যা" 
              name="suspectedDeaths24h" 
              value={formData.suspectedDeaths24h} 
              onChange={handleChange} 
            />
            <InputGroup 
              label="Deaths due to suspected cases (Year)" 
              labelBn="অদ্যাবধি মোট সন্দেহজনক হাম রোগে মৃত্যুর সংখ্যা" 
              name="suspectedDeathsYear" 
              value={formData.suspectedDeathsYear} 
              onChange={handleChange} 
            />
            <InputGroup 
              label="Deaths due to confirmed cases (24 hrs)" 
              labelBn="গত ২৪ ঘণ্টায় নিশ্চিত হাম রোগে মৃত্যুর সংখ্যা" 
              name="confirmedDeaths24h" 
              value={formData.confirmedDeaths24h} 
              onChange={handleChange} 
            />
            <InputGroup 
              label="Deaths due to confirmed cases (Year)" 
              labelBn="অদ্যাবধি মোট নিশ্চিত হাম রোগে মৃত্যুর সংখ্যা" 
              name="confirmedDeathsYear" 
              value={formData.confirmedDeathsYear} 
              onChange={handleChange} 
            />
          </Section>

          <Section title="5. Hospitalization" subtitle="Hospital admissions and discharges">
            <InputGroup 
              label="Admitted to hospitals (24 hrs)" 
              labelBn="গত ২৪ ঘণ্টায় সন্দেহজনক হাম রোগী ভর্তির সংখ্যা" 
              name="admitted24h" 
              value={formData.admitted24h} 
              onChange={handleChange} 
            />
            <InputGroup 
              label="Total admitted to hospitals (Year)" 
              labelBn="অদ্যাবধি মোট সন্দেহজনক হাম রোগী ভর্তির সংখ্যা" 
              name="admittedYear" 
              value={formData.admittedYear} 
              onChange={handleChange} 
            />
            <InputGroup 
              label="Discharged from hospitals (24 hrs)" 
              labelBn="গত ২৪ ঘণ্টায় হাসপাতাল হতে ছুটি পাওয়ার সংখ্যা" 
              name="discharged24h" 
              value={formData.discharged24h} 
              onChange={handleChange} 
            />
            <InputGroup 
              label="Total discharged from hospitals (Year)" 
              labelBn="অদ্যাবধি হাসপাতাল হতে মোট ছুটি পাওয়ার সংখ্যা" 
              name="dischargedYear" 
              value={formData.dischargedYear} 
              onChange={handleChange} 
            />
          </Section>

          <Section title="6. Laboratory Surveillance" subtitle="Samples sent for laboratory testing">
            <InputGroup 
              label="Total Serum Sent to Lab in this year" 
              name="serumSentYear" 
              value={formData.serumSentYear} 
              onChange={handleChange} 
              required={false} 
              fullWidth 
            />
          </Section>

          <div className="flex justify-end pt-6 pb-12">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center text-lg"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Submit Daily Report
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// --- Feature 3: Dashboard ---

function Dashboard({ submissions }: { submissions: Submission[] }) {
  const [filterDate, setFilterDate] = useState('');
  const [showMissingModal, setShowMissingModal] = useState(false);

  const allDistricts = useMemo(() => {
    return Object.values(DISTRICTS_BY_DIVISION).flat();
  }, []);

  const aggregatedData = useMemo(() => {
    const filteredData = filterDate ? submissions.filter(item => item.reportingDate === filterDate) : submissions;
    const grouped: any = {};
    const grandTotals: any = {
      suspected24h: 0, admitted24h: 0, discharged24h: 0, suspectedDeath24h: 0, confirmed24h: 0, confirmedDeath24h: 0,
      suspectedYTD: 0, admittedYTD: 0, dischargedYTD: 0, suspectedDeathYTD: 0, confirmedYTD: 0, confirmedDeathYTD: 0
    };

    filteredData.forEach(item => {
      // Ensure reportingDate exists, fallback to a generic date if missing (though it shouldn't be)
      const dateKey = item.reportingDate || 'Unknown Date';
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          divisions: {},
          dailyTotals: { 
            suspected24h: 0, admitted24h: 0, discharged24h: 0, suspectedDeath24h: 0, confirmed24h: 0, confirmedDeath24h: 0,
            suspectedYTD: 0, admittedYTD: 0, dischargedYTD: 0, suspectedDeathYTD: 0, confirmedYTD: 0, confirmedDeathYTD: 0 
          }
        };
      }
      const dateGroup = grouped[dateKey];
      
      if (!dateGroup.divisions[item.division]) {
        dateGroup.divisions[item.division] = {
          suspected24h: 0, admitted24h: 0, discharged24h: 0, suspectedDeath24h: 0, confirmed24h: 0, confirmedDeath24h: 0,
          suspectedYTD: 0, admittedYTD: 0, dischargedYTD: 0, suspectedDeathYTD: 0, confirmedYTD: 0, confirmedDeathYTD: 0
        };
      }
      const divStats = dateGroup.divisions[item.division];
      const metrics = [
        'suspected24h', 'admitted24h', 'discharged24h', 'suspectedDeath24h', 'confirmed24h', 'confirmedDeath24h',
        'suspectedYTD', 'admittedYTD', 'dischargedYTD', 'suspectedDeathYTD', 'confirmedYTD', 'confirmedDeathYTD'
      ];
      
      metrics.forEach(metric => {
        const val = Number((item as any)[metric]) || 0;
        divStats[metric] += val;
        dateGroup.dailyTotals[metric] += val;
        grandTotals[metric] += val;
      });
    });

    const formattedData = Object.keys(grouped)
      .sort((a, b) => {
        if (a === 'Unknown Date') return 1;
        if (b === 'Unknown Date') return -1;
        return new Date(b).getTime() - new Date(a).getTime();
      })
      .map(date => ({
        date,
        divisions: Object.keys(grouped[date].divisions).sort().map(divName => ({
          name: divName,
          stats: grouped[date].divisions[divName]
        })),
        totals: grouped[date].dailyTotals
      }));

    // If filterDate is set but no data, add a placeholder with all divisions at zero
    if (filterDate && formattedData.length === 0) {
      formattedData.push({
        date: filterDate,
        divisions: DIVISIONS.map(divName => ({
          name: divName,
          stats: { 
            suspected24h: 0, admitted24h: 0, discharged24h: 0, suspectedDeath24h: 0, confirmed24h: 0, confirmedDeath24h: 0,
            suspectedYTD: 0, admittedYTD: 0, dischargedYTD: 0, suspectedDeathYTD: 0, confirmedYTD: 0, confirmedDeathYTD: 0 
          }
        })),
        totals: { 
          suspected24h: 0, admitted24h: 0, discharged24h: 0, suspectedDeath24h: 0, confirmed24h: 0, confirmedDeath24h: 0,
          suspectedYTD: 0, admittedYTD: 0, dischargedYTD: 0, suspectedDeathYTD: 0, confirmedYTD: 0, confirmedDeathYTD: 0 
        }
      });
    }

    return { dates: formattedData, grandTotals, filteredCount: filteredData.length };
  }, [submissions, filterDate]);

  const missingDistricts = useMemo(() => {
    if (!filterDate) return [];
    const districtsWithData = submissions
      .filter(s => s.reportingDate === filterDate)
      .map(s => s.district);
    
    return allDistricts.filter(d => !districtsWithData.includes(d));
  }, [submissions, filterDate, allDistricts]);

  const kpis = [
    { title: "Suspected Cases (24h)", value: aggregatedData.grandTotals.suspected24h, icon: Users, color: "text-amber-600", bg: "bg-amber-100" },
    { title: "Confirmed Cases (24h)", value: aggregatedData.grandTotals.confirmed24h, icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
    { title: "Admitted to Hosp. (24h)", value: aggregatedData.grandTotals.admitted24h, icon: Hospital, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Total Deaths (YTD)", value: aggregatedData.grandTotals.suspectedDeathYTD + aggregatedData.grandTotals.confirmedDeathYTD, icon: Skull, color: "text-indigo-600", bg: "bg-indigo-100" },
  ];

  const showNoDataMessage = submissions.length === 0 && !filterDate;

  if (showNoDataMessage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <LayoutDashboard className="w-20 h-20 mb-4 opacity-20" />
        <p className="text-xl font-medium">No records found. Start by adding data.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Date Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Calendar className="w-5 h-5 text-indigo-700" />
          </div>
          <h3 className="font-semibold text-slate-800">Filter Dashboard by Date</h3>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="block w-full sm:w-auto rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border bg-white"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="flex items-center text-sm text-slate-500 hover:text-red-600 transition-colors"
              title="Clear date filter"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
          {filterDate && (
            <button
              onClick={() => setShowMissingModal(true)}
              className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg border border-amber-200 hover:bg-amber-100 transition-all font-medium text-sm"
            >
              <MapPin className="w-4 h-4" />
              Missing Districts
            </button>
          )}
        </div>
      </div>

      {filterDate && aggregatedData.filteredCount === 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-amber-400 mr-3" />
            <p className="text-sm text-amber-700 font-medium">
              No entry has been done for the selected date: <span className="font-bold">{new Date(filterDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>. Showing zero data preview.
            </p>
          </div>
        </div>
      )}

      {/* Missing Districts Modal */}
      {showMissingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Missing Districts</h2>
                <p className="text-sm text-slate-500">Districts yet to entry data for {new Date(filterDate).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setShowMissingModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              {missingDistricts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-slate-800">All districts have submitted data!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {missingDistricts.map(district => (
                    <div key={district} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <span className="text-sm font-medium text-slate-700">{district}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowMissingModal(false)}
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <KPICard 
            key={idx}
            title={kpi.title}
            value={kpi.value}
            icon={<kpi.icon className="w-6 h-6" />}
            color={kpi.bg.replace('bg-', 'bg-').replace('100', '600')} // Simple mapping for color
            label="Current Total"
          />
        ))}
      </div>

      {/* Aggregation Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th colSpan={2} className="border-b border-r border-slate-700 py-4 px-4 text-left font-bold uppercase tracking-wider text-xs">Regional Outbreak Report</th>
                <th colSpan={6} className="bg-slate-700 border-b border-r border-slate-600 py-4 text-slate-100 font-bold uppercase tracking-wider text-xs">Last 24 Hours (গত ২৪ ঘণ্টায়)</th>
                <th colSpan={6} className="bg-indigo-900 border-b border-slate-800 py-4 text-indigo-100 font-bold uppercase tracking-wider text-xs">Year to Date (অদ্যাবধি)</th>
              </tr>
              <tr>
                <th colSpan={2} className="bg-white border-b border-r border-slate-200"></th>
                <th colSpan={4} className="bg-amber-50/40 border-b border-r border-amber-100 py-2.5 text-amber-900 font-semibold text-xs">Suspected (সন্দেহজনক)</th>
                <th colSpan={2} className="bg-red-50/40 border-b border-r border-red-100 py-2.5 text-red-900 font-semibold text-xs">Confirmed (নিশ্চিত)</th>
                <th colSpan={4} className="bg-amber-50/40 border-b border-r border-amber-100 py-2.5 text-amber-900 font-semibold text-xs">Suspected (সন্দেহজনক)</th>
                <th colSpan={2} className="bg-red-50/40 border-b border-slate-200 py-2.5 text-red-900 font-semibold text-xs">Confirmed (নিশ্চিত)</th>
              </tr>
              <tr className="text-xs text-slate-600 bg-white font-medium">
                <th className="border-b-2 border-r border-slate-200 py-3 px-4 text-left">Date</th>
                <th className="border-b-2 border-r border-slate-200 py-3 px-4 text-left">Division</th>
                <th className="border-b-2 border-r border-slate-100 py-3 px-3 hover:bg-slate-50">Cases<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">রোগী</span></th>
                <th className="border-b-2 border-r border-slate-100 py-3 px-3 hover:bg-slate-50">Admitted<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">ভর্তি</span></th>
                <th className="border-b-2 border-r border-slate-100 py-3 px-3 hover:bg-slate-50">Discharged<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">ছুটি</span></th>
                <th className="border-b-2 border-r border-slate-100 py-3 px-3 hover:bg-slate-50">Deaths<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">মৃত্যু</span></th>
                <th className="border-b-2 border-r border-slate-100 py-3 px-3 hover:bg-slate-50">Cases<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">রোগী</span></th>
                <th className="border-b-2 border-r border-slate-100 py-3 px-3 hover:bg-slate-50">Deaths<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">মৃত্যু</span></th>
                <th className="border-b-2 border-r border-slate-100 py-3 px-3 hover:bg-slate-50 bg-indigo-50/10">Cases<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">রোগী</span></th>
                <th className="border-b-2 border-r border-slate-100 py-3 px-3 hover:bg-slate-50 bg-indigo-50/10">Admitted<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">ভর্তি</span></th>
                <th className="border-b-2 border-r border-slate-100 py-3 px-3 hover:bg-slate-50 bg-indigo-50/10">Discharged<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">ছুটি</span></th>
                <th className="border-b-2 border-r border-slate-100 py-3 px-3 hover:bg-slate-50 bg-indigo-50/10">Deaths<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">মৃত্যু</span></th>
                <th className="border-b-2 border-r border-slate-100 py-3 px-3 hover:bg-slate-50 bg-indigo-50/10">Cases<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">রোগী</span></th>
                <th className="border-b-2 border-slate-200 py-3 px-3 hover:bg-slate-50 bg-indigo-50/10">Deaths<br/><span className="text-[10px] text-slate-400 font-normal mt-1 block">মৃত্যু</span></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {aggregatedData.dates.length === 0 ? (
                <tr><td colSpan={14} className="py-12 text-center text-slate-500 bg-slate-50">No dashboard data available yet. Please submit an entry.</td></tr>
              ) : (
                aggregatedData.dates.map((dateGroup: any) => (
                  <React.Fragment key={dateGroup.date}>
                    {dateGroup.divisions.map((div: any, divIdx: number) => (
                      <tr key={`${dateGroup.date}-${div.name}`} className="hover:bg-slate-50/80 transition-colors group">
                        {divIdx === 0 && (
                          <td rowSpan={dateGroup.divisions.length + 1} className="border-b border-r border-slate-200 px-4 py-3 align-top bg-slate-50/50 text-slate-700 font-semibold whitespace-nowrap text-left">
                            <div className="flex items-center pt-1">
                              <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2.5 shadow-sm"></div>
                              {new Date(dateGroup.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </td>
                        )}
                        <td className="border-b border-slate-100 px-4 py-3 text-left font-medium text-slate-700">{div.name}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900">{div.stats.suspected24h}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900">{div.stats.admitted24h}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900">{div.stats.discharged24h}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900">{div.stats.suspectedDeath24h}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900 font-medium">{div.stats.confirmed24h}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900">{div.stats.confirmedDeath24h}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900 bg-indigo-50/5">{div.stats.suspectedYTD}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900 bg-indigo-50/5">{div.stats.admittedYTD}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900 bg-indigo-50/5">{div.stats.dischargedYTD}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900 bg-indigo-50/5">{div.stats.suspectedDeathYTD}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900 font-medium bg-indigo-50/5">{div.stats.confirmedYTD}</td>
                        <td className="border-b border-slate-100 px-3 py-3 text-slate-600 group-hover:text-slate-900 bg-indigo-50/5">{div.stats.confirmedDeathYTD}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100/80 border-b-2 border-slate-200 font-semibold text-slate-800">
                      <td className="px-4 py-3 text-left">
                        {new Date(dateGroup.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Total
                      </td>
                      <td className="px-3 py-3 text-amber-700">{dateGroup.totals.suspected24h}</td>
                      <td className="px-3 py-3">{dateGroup.totals.admitted24h}</td>
                      <td className="px-3 py-3">{dateGroup.totals.discharged24h}</td>
                      <td className="px-3 py-3">{dateGroup.totals.suspectedDeath24h}</td>
                      <td className="px-3 py-3 text-red-700">{dateGroup.totals.confirmed24h}</td>
                      <td className="px-3 py-3">{dateGroup.totals.confirmedDeath24h}</td>
                      <td className="px-3 py-3 bg-indigo-50/30 text-amber-700">{dateGroup.totals.suspectedYTD}</td>
                      <td className="px-3 py-3 bg-indigo-50/30">{dateGroup.totals.admittedYTD}</td>
                      <td className="px-3 py-3 bg-indigo-50/30">{dateGroup.totals.dischargedYTD}</td>
                      <td className="px-3 py-3 bg-indigo-50/30">{dateGroup.totals.suspectedDeathYTD}</td>
                      <td className="px-3 py-3 bg-indigo-50/30 text-red-700">{dateGroup.totals.confirmedYTD}</td>
                      <td className="px-3 py-3 bg-indigo-50/30">{dateGroup.totals.confirmedDeathYTD}</td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
            {aggregatedData.dates.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold text-base shadow-inner">
                  <td className="px-4 py-5 text-left" colSpan={2}>Overall Grand Total</td>
                  <td className="px-3 py-5 text-amber-400">{aggregatedData.grandTotals.suspected24h}</td>
                  <td className="px-3 py-5">{aggregatedData.grandTotals.admitted24h}</td>
                  <td className="px-3 py-5">{aggregatedData.grandTotals.discharged24h}</td>
                  <td className="px-3 py-5">{aggregatedData.grandTotals.suspectedDeath24h}</td>
                  <td className="px-3 py-5 text-red-400">{aggregatedData.grandTotals.confirmed24h}</td>
                  <td className="px-3 py-5">{aggregatedData.grandTotals.confirmedDeath24h}</td>
                  <td className="px-3 py-5 text-amber-400 bg-slate-700">{aggregatedData.grandTotals.suspectedYTD}</td>
                  <td className="px-3 py-5 bg-slate-700">{aggregatedData.grandTotals.admittedYTD}</td>
                  <td className="px-3 py-5 bg-slate-700">{aggregatedData.grandTotals.dischargedYTD}</td>
                  <td className="px-3 py-5 bg-slate-700">{aggregatedData.grandTotals.suspectedDeathYTD}</td>
                  <td className="px-3 py-5 text-red-400 bg-slate-700">{aggregatedData.grandTotals.confirmedYTD}</td>
                  <td className="px-3 py-5 bg-slate-700">{aggregatedData.grandTotals.confirmedDeathYTD}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, color, label }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-xs text-slate-400 mb-2">{label}</p>
        <p className="text-3xl font-bold text-slate-800">{value.toLocaleString()}</p>
      </div>
      <div className={`p-3 rounded-xl text-white ${color} shadow-lg`}>
        {icon}
      </div>
    </div>
  );
}

// --- Feature 4: Admin Panel ---

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onLogin();
    } else {
      setError("This page is restricted for official admins only");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Settings className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Admin Access</h2>
        <p className="text-center text-slate-500 mb-8">Please enter your credentials to manage the system.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <InputGroup 
            label="Admin Password"
            type="password"
            name="password"
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            required
          />
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          <button 
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Login to Admin Panel
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminPanel({ 
  submissions, 
  onEdit, 
  onDelete,
  onLogout
}: { 
  submissions: Submission[]; 
  onEdit: (s: Submission) => void; 
  onDelete: (id: number) => void;
  onLogout: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [exportDate, setExportDate] = useState(new Date().toISOString().split('T')[0]);

  const filtered = submissions.filter(s => 
    s.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.division.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    const dataToExport = submissions.filter(s => s.reportingDate === exportDate);
    
    if (dataToExport.length === 0) {
      alert(`No data found for the date: ${exportDate}`);
      return;
    }

    // Sort data by Division and District
    const sortedData = [...dataToExport].sort((a, b) => {
      if (a.division !== b.division) return a.division.localeCompare(b.division);
      return a.district.localeCompare(b.district);
    });

    const worksheetData = sortedData.map(s => ({
      'ID': s.id,
      'Entry Time': s.entryTime,
      'Reporting Date': s.reportingDate,
      'Division': s.division,
      'District': s.district,
      'Facility Name': s.facilityName,
      'Suspected (24h)': s.suspected24h,
      'Confirmed (24h)': s.confirmed24h,
      'Admitted (24h)': s.admitted24h,
      'Discharged (24h)': s.discharged24h,
      'Suspected Deaths (24h)': s.suspectedDeath24h,
      'Confirmed Deaths (24h)': s.confirmedDeath24h,
      'Suspected (YTD)': s.suspectedYTD,
      'Confirmed (YTD)': s.confirmedYTD,
      'Admitted (YTD)': s.admittedYTD,
      'Discharged (YTD)': s.dischargedYTD,
      'Suspected Deaths (YTD)': s.suspectedDeathYTD,
      'Confirmed Deaths (YTD)': s.confirmedDeathYTD,
      'Serum Sent (YTD)': s.serumSentYTD
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Report");
    
    // Set column widths
    const wscols = [
      {wch: 12}, {wch: 12}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30},
      {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15},
      {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}
    ];
    worksheet['!cols'] = wscols;

    // Add auto-filter
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

    XLSX.writeFile(workbook, `Measles_Outbreak_Report_${exportDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Admin Management</h2>
          <p className="text-slate-500">Manage all system submissions and records</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <input 
              type="date" 
              value={exportDate}
              onChange={(e) => setExportDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700"
            />
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all font-semibold text-sm shadow-md shadow-emerald-100"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
            />
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            title="Logout"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">ID / Reporting Date</th>
                <th className="px-6 py-4">Entry Time</th>
                <th className="px-6 py-4">Division / District</th>
                <th className="px-6 py-4">Facility</th>
                <th className="px-6 py-4">YTD Totals (S/C/D)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700">{s.id}</div>
                    <div className="text-xs text-slate-400">{s.reportingDate}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-indigo-600">{s.entryTime}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-700">{s.division}</div>
                    <div className="text-xs text-slate-400">{s.district}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{s.facilityName}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 text-xs">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">S: {s.suspectedYTD}</span>
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">C: {s.confirmedYTD}</span>
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded">D: {s.suspectedDeathYTD + s.confirmedDeathYTD}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => onEdit(s)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => onDelete(s.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
