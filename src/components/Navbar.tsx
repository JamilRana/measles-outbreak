"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { LogOut, LayoutDashboard, ClipboardList, Settings, Globe, FileText, ActivitySquare, Zap, BarChart3, FileBarChart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { hasPermission } from "@/lib/rbac";

export default function Navbar() {
  const { data: session } = useSession();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'bn' ? 'en' : 'bn';
    i18n.changeLanguage(newLang);
  };

  const canViewAdmin = hasPermission(session?.user?.role || "", 'admin:view');
  const canViewReports = hasPermission(session?.user?.role || "", 'report:read:own');
  const isFacilityInactive = session?.user?.facilityId && session?.user?.facilityIsActive === false;
  const canSubmit = hasPermission(session?.user?.role || "", 'report:create') && !isFacilityInactive;

  return (
    <nav className="bg-[#1E3A5F] text-white shadow-lg sticky top-0 z-50 border-b border-white/5 scroll-gpu">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-14 h-14 relative bg-white rounded-full p-2 flex items-center justify-center shadow-md">
              <Image src="/logo_mohfw.png" alt="MOHFW Logo" width={40} height={40} className="object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden md:inline">{t('app.title')}</span>
          </Link>

          <div className="flex items-center gap-1">
            <NavLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label={t('nav.dashboard')} />
            <NavLink href="/bulletin" icon={<FileBarChart className="w-4 h-4" />} label={t('nav.bulletin')} />
            {session ? (
              <>
                {canSubmit && (
                  <NavLink href="/report" icon={<Zap className="w-4 h-4" />} label={t('nav.report')} />
                )}
                {canViewReports && (
                  <NavLink href="/my-reports" icon={<FileText className="w-4 h-4" />} label={t('nav.myReports')} />
                )}
                {canViewAdmin && (
                  <NavLink href={session?.user?.role === 'VIEWER' ? "/admin/submissions" : "/admin"} icon={<Settings className="w-4 h-4" />} label={t('nav.admin')} />
                )}
                <div className="h-6 w-[1px] bg-indigo-500/50 mx-1" />

                <div
                  className="hidden sm:flex flex-col items-end px-2"
                  title={session?.user?.facilityName || ""}
                >
                  <span className="text-xs sm:text-sm font-semibold text-right max-w-[140px] md:max-w-[200px] xl:max-w-[300px] line-clamp-2 leading-tight">
                    {session.user.facilityName}
                  </span>
                </div>

                <button
                  onClick={() => {
                    signOut({ callbackUrl: `${window.location.origin}/login` });
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                  title={t('nav.signOut')}
                >
                  <LogOut className="w-5 h-5 text-indigo-100 group-hover:text-white" />
                </button>
              </>
            ) : (
              <Link href="/login" className="bg-white text-indigo-700 px-5 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors">
                {t('nav.signIn')}
              </Link>
            )}
            <button
              onClick={toggleLanguage}
              className="flex items-center px-1.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-100 hover:text-white transition-all text-sm font-semibold"
              title="Switch language"
            >
              <Globe className="w-4 h-4" />
              <span className="sm:inline">{i18n.language === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 text-indigo-100 hover:text-white transition-all text-sm font-medium"
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}