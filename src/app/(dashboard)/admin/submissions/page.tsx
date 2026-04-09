"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Search,
  Calendar,
  Filter,
  Download,
  TrendingUp,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';

interface UserData {
  id: string;
  facilityName: string;
  division: string;
  district: string;
  role: string;
  isActive: boolean;
  lastReportDate?: string;
}

interface DailyReport {
  id: string;
  userId: string;
  reportingDate: string;
}

export default function SubmissionsPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserData[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, reportsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch(`/api/reports?date=${selectedDate}`)
      ]);
      
      const usersData = await usersRes.json();
      const reportsData = await reportsRes.json();
      
      setUsers(usersData);
      setReports(reportsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const submittedUserIds = useMemo(() => {
    return new Set(reports.map(r => r.userId));
  }, [reports]);

  const userStats = useMemo(() => {
    const submitted = users.filter(u => submittedUserIds.has(u.id));
    const notSubmitted = users.filter(u => !submittedUserIds.has(u.id));
    const total = users.length;
    const rate = total > 0 ? Math.round((submitted.length / total) * 100) : 0;
    return { submitted: submitted.length, notSubmitted: notSubmitted.length, total, rate };
  }, [users, submittedUserIds]);

  const filteredUsers = useMemo(() => {
    let filtered = [...users];
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.district.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedDivision) {
      filtered = filtered.filter(u => u.division === selectedDivision);
    }
    return filtered;
  }, [users, searchTerm, selectedDivision]);

  const submittedUsers = useMemo(() => {
    return filteredUsers.filter(u => submittedUserIds.has(u.id));
  }, [filteredUsers, submittedUserIds]);

  const notSubmittedUsers = useMemo(() => {
    return filteredUsers.filter(u => !submittedUserIds.has(u.id));
  }, [filteredUsers, submittedUserIds]);

  const handleExport = () => {
    import('xlsx').then(XLSX => {
      const data = filteredUsers.map(u => ({
        Facility: u.facilityName,
        Division: u.division,
        District: u.district,
        Status: submittedUserIds.has(u.id) ? 'Submitted' : 'Not Submitted',
        Role: u.role
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Submissions");
      XLSX.writeFile(wb, `Submissions_${selectedDate}.xlsx`);
    });
  };

  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "MANAGER") {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-600 font-bold">Access Denied</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Submission Status <span className="text-slate-400 font-medium lowercase">/ জমার অবস্থা</span>
          </h1>
          <p className="text-slate-500 mt-1">Track daily report submissions across all facilities</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-bold"
            />
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Total Facilities</span>
          </div>
          <p className="text-3xl font-black text-slate-800">{userStats.total}</p>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Submitted</span>
          </div>
          <p className="text-3xl font-black text-emerald-600">{userStats.submitted}</p>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Not Submitted</span>
          </div>
          <p className="text-3xl font-black text-rose-600">{userStats.notSubmitted}</p>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Submission Rate</span>
          </div>
          <p className="text-3xl font-black text-amber-600">{userStats.rate}%</p>
        </motion.div>
      </div>

      <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative group flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search facility..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-bold"
          >
            <option value="">All Divisions</option>
            <option value="Barisal">Barisal</option>
            <option value="Chattogram">Chattogram</option>
            <option value="Dhaka">Dhaka</option>
            <option value="Khulna">Khulna</option>
            <option value="Mymensingh">Mymensingh</option>
            <option value="Rajshahi">Rajshahi</option>
            <option value="Rangpur">Rangpur</option>
            <option value="Sylhet">Sylhet</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-slate-800">Submitted ({submittedUsers.length})</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-400 text-[10px] font-black uppercase">
                  <th className="px-6 py-3">Facility</th>
                  <th className="px-6 py-3">Division</th>
                  <th className="px-6 py-3">District</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submittedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-bold text-slate-700">{user.facilityName}</td>
                    <td className="px-6 py-3 text-slate-500 text-sm">{user.division}</td>
                    <td className="px-6 py-3 text-slate-500 text-sm">{user.district}</td>
                  </tr>
                ))}
                {submittedUsers.length === 0 && (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No submissions</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-rose-50/50 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-600" />
            <h3 className="font-black text-slate-800">Not Submitted ({notSubmittedUsers.length})</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-400 text-[10px] font-black uppercase">
                  <th className="px-6 py-3">Facility</th>
                  <th className="px-6 py-3">Division</th>
                  <th className="px-6 py-3">District</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notSubmittedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-bold text-slate-700">{user.facilityName}</td>
                    <td className="px-6 py-3 text-slate-500 text-sm">{user.division}</td>
                    <td className="px-6 py-3 text-slate-500 text-sm">{user.district}</td>
                  </tr>
                ))}
                {notSubmittedUsers.length === 0 && (
                  <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">All submitted!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}