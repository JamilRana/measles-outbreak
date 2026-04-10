"use client";

import React from 'react';
import { motion } from 'motion/react';
import { Activity, Shield, BarChart3, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LandingHero() {
  return (
    <div className="relative overflow-hidden bg-white pt-16 pb-24 lg:pt-24 lg:pb-32">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-blue-50 rounded-full blur-3xl opacity-60"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
          <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-7 lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-widest mb-6 border border-indigo-100">
                <Shield className="w-3.5 h-3.5" />
                DGHS Bangladesh Surveillance
              </span>
              <h1 className="text-4xl tracking-tight font-black text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl leading-tight">
                Monitoring Measles <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Across Districts
                </span>
              </h1>
              <p className="mt-6 text-lg text-slate-500 sm:text-xl lg:text-lg xl:text-xl leading-relaxed max-w-2xl">
                A unified platform for real-time reporting, monitoring, and analysis of measles outbreaks. Empowering healthcare facilities with data-driven surveillance.
              </p>
              
              <div className="mt-10 flex flex-col sm:flex-row gap-4 sm:justify-center lg:justify-start">
                <Link
                  href="/report"
                  className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-bold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 group"
                >
                  Facility Reporting
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/surveillance"
                  className="inline-flex items-center justify-center px-8 py-4 border border-slate-200 text-base font-bold rounded-2xl text-slate-700 bg-white hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 group shadow-sm"
                >
                  <BarChart3 className="mr-2 w-5 h-5 text-indigo-600" />
                  Public Dashboard
                </Link>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-6 border-t border-slate-100 pt-8 max-w-lg sm:mx-auto lg:mx-0">
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-slate-900">24/7</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Surveillance</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-slate-900">8</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Divisions</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-slate-900">64</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Districts</span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mt-16 sm:mt-24 lg:mt-0 lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative p-4 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white shadow-inner"
            >
              <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monitoring Live</span>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="h-6 w-3/4 bg-slate-100 rounded-full animate-pulse"></div>
                    <div className="h-32 w-full bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <Activity className="w-12 h-12 text-indigo-200 animate-pulse" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <div className="h-3 w-1/2 bg-slate-200 rounded mb-2"></div>
                      <div className="h-6 w-3/4 bg-slate-300 rounded"></div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <div className="h-3 w-1/2 bg-slate-200 rounded mb-2"></div>
                      <div className="h-6 w-3/4 bg-slate-300 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center p-4 transform rotate-12 border border-slate-50">
                <Shield className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-indigo-600 rounded-2xl shadow-xl p-4 transform -rotate-6">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
