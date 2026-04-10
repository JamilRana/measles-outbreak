"use client";

import { useSession } from "next-auth/react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { hasPermission } from "@/lib/rbac";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  
  // A simple check: only ADMIN and MANAGER (represented by EDITOR in some contexts) 
  // should access administrative infrastructure.
  const role = session?.user?.role || "";
  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER" || role === "EDITOR";

  if (status === "loading") return null;

  if (session && !isAdmin && !isManager) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[3rem] shadow-xl max-w-md text-center border border-slate-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-[0.03] -rotate-12">
              <ShieldAlert className="w-48 h-48" />
           </div>
           <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-8 relative z-10">
              <ShieldAlert className="w-10 h-10" />
           </div>
           <h1 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Console Restricted</h1>
           <p className="text-slate-500 font-medium mb-10 leading-relaxed">
              Your account does not have administrative privileges. Access to management consoles is strictly regulated.
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

  return children;
}
