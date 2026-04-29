"use client";

import React from 'react';
import PublicSubmissionSection from '@/components/landing/PublicSubmissionSection';
import Footer from '@/components/Footer';
import SimpleHeader from '@/components/SimpleHeader';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <main className="max-w-7xl mx-auto pb-32">
        <PublicSubmissionSection />
      </main>
      <Footer />
    </div>
  );
}