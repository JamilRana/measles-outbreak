"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import React from 'react';

const Breadcrumbs = () => {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(segment => segment !== '');

  // Define custom labels for specific segments
  const segmentLabels: Record<string, string> = {
    admin: 'Admin Console',
    dashboard: 'Dashboard',
    outbreaks: 'Outbreak Management',
    submissions: 'Reporting Hub',
    indicators: 'Indicator Engine',
    'form-fields': 'Form Builder',
    'audit-logs': 'Audit Infrastructure',
    'bulk-data': 'Bulk Data',
    'data-management': 'Data Management',
    recipients: 'Email Recipients',
    users: 'User Management',
  };

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <Home className="w-3.2 h-3.2 mr-2" />
            Home
          </Link>
        </li>
        {pathSegments.map((segment, index) => {
          const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
          const isLast = index === pathSegments.length - 1;
          const label = segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <li key={segment}>
              <div className="flex items-center">
                <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
                {isLast ? (
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-600">
                    {label}
                  </span>
                ) : (
                  <Link 
                    href={href} 
                    className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {label}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
