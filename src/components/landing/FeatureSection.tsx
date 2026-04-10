"use client";

import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, BarChart4, Zap, Globe2, BellRing, Database } from 'lucide-react';

const features = [
  {
    name: 'Real-time Reporting',
    description: 'Instant data submission from health facilities directly to the central DGHS database.',
    icon: Zap,
    color: 'indigo'
  },
  {
    name: 'Outbreak Visualization',
    description: 'Interactive Heatmaps and District-wise maps for rapid response and resource allocation.',
    icon: BarChart4,
    color: 'blue'
  },
  {
    name: 'Data Integrity',
    description: 'Triple-layer validation ensuring reports are accurate and verified by field supervisors.',
    icon: ShieldCheck,
    color: 'emerald'
  },
  {
    name: 'Unified Platform',
    description: 'One platform for divisions, districts, and municipalities across all of Bangladesh.',
    icon: Globe2,
    color: 'purple'
  },
  {
    name: 'Automated Alerts',
    description: 'Predictive modeling triggers alerts when case thresholds are exceeded in any district.',
    icon: BellRing,
    color: 'rose'
  },
  {
    name: 'Historical Archives',
    description: 'Comprehensive backlog tracking and year-to-date summaries for longitudinal analysis.',
    icon: Database,
    color: 'amber'
  }
];

export default function FeatureSection() {
  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-50/20 to-transparent pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4"
          >
            Platform Capabilities
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-black text-slate-900 tracking-tight leading-tight"
          >
            Advanced Surveillance for <br />
            <span className="text-slate-400">Public Health Excellence</span>
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">{feature.name}</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
