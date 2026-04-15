"use client";

import React from 'react';
import PublicSubmissionSection from '@/components/landing/PublicSubmissionSection';
import Footer from '@/components/Footer';
import SimpleHeader from '@/components/SimpleHeader';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <SimpleHeader />
      <main className="max-w-4xl mx-auto px-4 pb-32 space-y-12 pt-12">
        <PublicSubmissionSection />
      </main>
      <Footer />
    </div>
  );
}