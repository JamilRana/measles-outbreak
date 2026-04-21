"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { 
  Settings, 
  Database, 
  Mail, 
  ShieldAlert,
  Search,
  ChevronRight,
  Upload,
  Clock,
  ClipboardCheck,
  FileWarning,
  FileText,
  RotateCcw,
  Activity,
  Calculator,
  History,
  Building2
} from "lucide-react";
import { motion } from "motion/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { ArrowLeft } from "lucide-react";

export default function AdminPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const role = session?.user?.role;

  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";

  if (role && !isAdmin && !isManager) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3rem] shadow-xl max-w-md text-center border border-slate-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-[0.03] -rotate-12">
              <ShieldAlert className="w-48 h-48" />
           </div>
           <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-8 relative z-10">
              <ShieldAlert className="w-10 h-10" />
           </div>
           <h1 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Admin Restricted</h1>
           <p className="text-slate-500 font-medium mb-10 leading-relaxed">
              Your account privileges do not allow access to administrative tools. Please return to the surveillance dashboard.
           </p>
           <button 
             onClick={() => window.location.href = '/dashboard'} 
             className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 w-full"
           >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <Breadcrumbs />
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {isAdmin ? t('adminPanel.title') : isManager ? 'Manager Dashboard' : 'Dashboard'}
        </h1>
        <p className="text-slate-500 mt-1">
          {isAdmin ? t('adminPanel.subtitle') : isManager ? 'Manage reports and monitor submissions' : 'Access restricted'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(isAdmin || isManager) && (
          <>
            <AdminCard 
              href="/admin/submissions" 
              title="Reporting Hub" 
              description="Status, logs, and gap analysis"
              icon={<ClipboardCheck className="w-6 h-6" />}
              color="indigo"
            />
            <AdminCard 
              href="/admin/bulk-data" 
              title={t('adminPanel.bulkDataUpload')} 
              description={t('adminPanel.bulkDataUploadDesc')} 
              icon={<Upload className="w-6 h-6" />}
              color="indigo"
            />
          </>
        )}

        {isManager && (
          <>
            <AdminCard 
              hidden={true} 
              href="/admin/audit-log" 
              title="Audit Trail" 
              description="View activity logs and changes"
              icon={<FileWarning className="w-6 h-6" />}
              color="amber"
            />
          </>
        )}

        {isAdmin && (
          <>
            <AdminCard 
              href="/admin/outbreaks" 
              title="Outbreak Management" 
              description="Manage outbreak events, thresholds, and reporting windows" 
              icon={<Activity className="w-6 h-6" />}
              color="rose"
            />
            <AdminCard 
              hidden={true} 
              href="/admin/indicators" 
              title="Indicator Engine" 
              description="Define and manage dynamic health metrics" 
              icon={<Calculator className="w-6 h-6" />}
              color="indigo"
            />
            <AdminCard 
              href="/admin/audit-logs" 
              title="Audit Infrastructure" 
              description="Monitor immutable system activity logs" 
              icon={<History className="w-6 h-6" />}
              color="slate"
            />
            <AdminCard
              hidden={true} 
              href="/admin/form-fields" 
              title="Report Form Fields" 
              description="Configure form fields for outbreak reports" 
              icon={<FileText className="w-6 h-6" />}
              color="emerald"
            />
            <AdminCard 
              hidden={true} 
              href="/admin/recipients" 
              title={t('adminPanel.emailRecipients')} 
              description={t('adminPanel.emailRecipientsDesc')} 
              icon={<Mail className="w-6 h-6" />}
              color="indigo"
            />
            <AdminCard 
              href="/admin/facilities" 
              title="Facility Registry" 
              description="Manage official health facilities, DGHS codes, and geographic metadata" 
              icon={<Building2 className="w-6 h-6" />}
              color="indigo"
            />
            <AdminCard 
              href="/admin/users" 
              title={t('adminPanel.userAccounts')} 
              description={t('adminPanel.userAccountsDesc')} 
              icon={<ShieldAlert className="w-6 h-6" />}
              color="amber"
            />
            <AdminCard 
              href="/admin/settings" 
              title={t('adminPanel.settings')} 
              description={t('adminPanel.settingsDesc')} 
              icon={<Clock className="w-6 h-6" />}
              color="amber"
            />
            <AdminCard 
              href="/admin/data-management" 
              title={t('adminPanel.systemMaintenance')} 
              description={t('adminPanel.systemMaintenanceDesc')} 
              icon={<Database className="w-6 h-6" />}
              color="rose"
            />
          </>
        )}
      </div>
    </div>
  );
}

function AdminCard({ href, title, description, icon, color, disabled = false, hidden = false }: { href: string; title: string; description: string; icon: React.ReactNode; color: string; disabled?: boolean, hidden?: boolean }) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };

  if (disabled) {
    return (
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 opacity-60 cursor-not-allowed">
        <div className="p-3 bg-slate-200 rounded-xl w-fit mb-4 text-slate-400">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-700">{title}</h3>
        <p className="text-slate-400 text-sm mt-1">{description}</p>
      </div>
    );
  }

  if (hidden) {
    return null;
  }

  return (
    <Link href={href}>
      <motion.div 
        whileHover={{ y: -5 }}
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
      >
        <div className={`p-3 rounded-xl w-fit mb-4 transition-colors ${colors[color]}`}>
          {icon}
        </div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
        </div>
        <p className="text-slate-500 text-sm mt-1">{description}</p>
      </motion.div>
    </Link>
  );
}