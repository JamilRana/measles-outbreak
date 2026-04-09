"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Clock, Save, CheckCircle, XCircle, Globe, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsData {
  cutoffHour: number;
  cutoffMinute: number;
  editDeadlineHour: number;
  editDeadlineMinute: number;
  publishTimeHour: number;
  publishTimeMinute: number;
  enablePublicView: boolean;
  enableEmailNotifications: boolean;
}

const defaultSettings: SettingsData = {
  cutoffHour: 14,
  cutoffMinute: 0,
  editDeadlineHour: 10,
  editDeadlineMinute: 0,
  publishTimeHour: 9,
  publishTimeMinute: 0,
  enablePublicView: true,
  enableEmailNotifications: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-64 bg-slate-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
        <p className="text-slate-500 mt-1">Configure platform behavior and time settings</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <div className="p-2 bg-indigo-50 rounded-lg"><Clock className="w-5 h-5 text-indigo-600" /></div>
          <h2 className="text-xl font-bold text-slate-800">Time Configuration</h2>
        </div>
        
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-amber-800">Report Submission Deadline</h3>
              </div>
              <p className="text-xs text-amber-600/70 mb-4">After this time, users cannot submit new reports for the day</p>
              <div className="flex items-center gap-2">
                <select
                  value={settings.cutoffHour}
                  onChange={(e) => setSettings({ ...settings, cutoffHour: Number(e.target.value) })}
                  className="bg-white border border-amber-200 rounded-lg py-2 px-3 text-sm font-bold"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="text-amber-800 font-bold">:</span>
                <select
                  value={settings.cutoffMinute}
                  onChange={(e) => setSettings({ ...settings, cutoffMinute: Number(e.target.value) })}
                  className="bg-white border border-amber-200 rounded-lg py-2 px-3 text-sm font-bold"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-blue-800">Edit Deadline</h3>
              </div>
              <p className="text-xs text-blue-600/70 mb-4">Deadline for users to edit their submitted reports</p>
              <div className="flex items-center gap-2">
                <select
                  value={settings.editDeadlineHour}
                  onChange={(e) => setSettings({ ...settings, editDeadlineHour: Number(e.target.value) })}
                  className="bg-white border border-blue-200 rounded-lg py-2 px-3 text-sm font-bold"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="text-blue-800 font-bold">:</span>
                <select
                  value={settings.editDeadlineMinute}
                  onChange={(e) => setSettings({ ...settings, editDeadlineMinute: Number(e.target.value) })}
                  className="bg-white border border-blue-200 rounded-lg py-2 px-3 text-sm font-bold"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-emerald-800">Report Publish Time</h3>
              </div>
              <p className="text-xs text-emerald-600/70 mb-4">Time when reports become visible to public</p>
              <div className="flex items-center gap-2">
                <select
                  value={settings.publishTimeHour}
                  onChange={(e) => setSettings({ ...settings, publishTimeHour: Number(e.target.value) })}
                  className="bg-white border border-emerald-200 rounded-lg py-2 px-3 text-sm font-bold"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="text-emerald-800 font-bold">:</span>
                <select
                  value={settings.publishTimeMinute}
                  onChange={(e) => setSettings({ ...settings, publishTimeMinute: Number(e.target.value) })}
                  className="bg-white border border-emerald-200 rounded-lg py-2 px-3 text-sm font-bold"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <div className="p-2 bg-indigo-50 rounded-lg"><Settings className="w-5 h-5 text-indigo-600" /></div>
          <h2 className="text-xl font-bold text-slate-800">Platform Settings</h2>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-slate-600" />
              <div>
                <p className="font-bold text-slate-700">Public Dashboard Access</p>
                <p className="text-sm text-slate-500">Allow public users to view outbreak data</p>
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, enablePublicView: !settings.enablePublicView })}
              className={`w-12 h-7 rounded-full transition-colors ${settings.enablePublicView ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enablePublicView ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-600" />
              <div>
                <p className="font-bold text-slate-700">Email Notifications</p>
                <p className="text-sm text-slate-500">Send automated daily reports to recipients</p>
              </div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, enableEmailNotifications: !settings.enableEmailNotifications })}
              className={`w-12 h-7 rounded-full transition-colors ${settings.enableEmailNotifications ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enableEmailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        {saved && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-emerald-600 font-medium"
          >
            <CheckCircle className="w-5 h-5" />
            Settings saved successfully!
          </motion.div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function Edit2(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
}
