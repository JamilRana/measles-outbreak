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
  FileWarning
} from "lucide-react";
import { motion } from "motion/react";

export default function AdminPage() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const role = session?.user?.role;

  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
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
              href="/admin/reports" 
              title="Report Management" 
              description="View, search and manage submitted reports"
              icon={<Search className="w-6 h-6" />}
              color="indigo"
            />
            <AdminCard 
              href="/admin/submissions" 
              title="Submission Status" 
              description="Track who submitted and who hasn't"
              icon={<ClipboardCheck className="w-6 h-6" />}
              color="emerald"
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
              href="/admin/recipients" 
              title={t('adminPanel.emailRecipients')} 
              description={t('adminPanel.emailRecipientsDesc')} 
              icon={<Mail className="w-6 h-6" />}
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

function AdminCard({ href, title, description, icon, color, disabled = false }: { href: string; title: string; description: string; icon: React.ReactNode; color: string; disabled?: boolean }) {
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