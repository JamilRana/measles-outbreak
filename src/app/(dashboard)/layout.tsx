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
      <footer className="footer-gradient bg-indigo-900 border-t border-indigo-800/50 py-8">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-indigo-200/60 text-sm">
              © {new Date().getFullYear()} Measles Outbreak Monitoring Platform. All rights reserved.
            </p>
          </div>
        </footer>
    </div>
  );
}
