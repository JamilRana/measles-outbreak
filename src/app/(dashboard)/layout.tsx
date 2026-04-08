import Navbar from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <footer className="mt-auto px-8 py-10 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-xl text-slate-400">DGHS</div>
              <div>
                <p className="text-sm font-black text-slate-800 tracking-tight">Directorate General of Health Services</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Govt. of the People's Republic of Bangladesh</p>
              </div>
           </div>
           <div className="flex flex-col items-end gap-2">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Data sources: Concern Civil Surgeon Office • Updated daily</p>
             <p className="text-slate-200/60 text-xs">
               © {new Date().getFullYear()} Measles Outbreak Monitoring Platform. All rights reserved.
             </p>
           </div>
        </div>
      </footer>
    </div>
  );
}
