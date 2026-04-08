"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { TrendingUp, LogOut, User, LayoutDashboard, ClipboardList, Settings, FileText } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-[#1E3A5F] text-white shadow-lg relative z-50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-white p-1.5 rounded-lg">
              <TrendingUp className="w-6 h-6 text-indigo-700" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden md:inline">Measles Outbreak Monitor</span>
          </Link>

          <div className="flex items-center gap-4">
            {session ? (
              <>
                <div className="flex gap-2">
                  <NavLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
                  {(session.user.role === "SUBMITTER" || session.user.role === "ADMIN") && (
                    <NavLink href="/report" icon={<ClipboardList className="w-4 h-4" />} label="Data Entry" />
                  )}
                  <NavLink href="/my-reports" icon={<FileText className="w-4 h-4" />} label="My Reports" />
                  {session.user.role === "ADMIN" && (
                    <NavLink href="/admin" icon={<Settings className="w-4 h-4" />} label="Admin" />
                  )}
                </div>
                
                <div className="h-6 w-[1px] bg-indigo-500/50 mx-2" />
                
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs text-indigo-200 uppercase font-bold tracking-tighter">Facility</span>
                  <span className="text-sm font-semibold truncate max-w-[150px]">{session.user.facilityName}</span>
                </div>

                <button 
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5 text-indigo-100 group-hover:text-white" />
                </button>
              </>
            ) : (
              <Link href="/login" className="bg-white text-indigo-700 px-5 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors">
                Sign In
              </Link>
            )}
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
