import React from "react";
import { Link } from "react-router-dom";
import { HardDrive, ShieldCheck, Zap, Layers, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-slate-800/80 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md">
            <HardDrive className="w-5 h-5" />
          </div>
          <span className="text-base font-extrabold tracking-tight">Conflux</span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-colors shadow-2xs">
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-20 text-center space-y-8 flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5" /> Next-Generation Multi-Cloud Orchestration
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Pool All Your Cloud Storage Into One Virtual Drive
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          Conflux seamlessly aggregates capacity across multiple Google Drive accounts and cloud providers into a single high-performance virtual filesystem with smart placement.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg transition-all">
            Launch Workspace <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="inline-flex items-center justify-center gap-2 border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white text-xs font-bold px-6 py-3 rounded-xl transition-all">
            Sign In Existing Account
          </Link>
        </div>

        {/* Value Proposition Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full text-left">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
            <div className="p-2.5 bg-blue-600/10 text-blue-400 w-fit rounded-xl border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Capacity Pooling</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Combine 15GB free quotas across multiple Google accounts into a single multi-terabyte pool.</p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
            <div className="p-2.5 bg-emerald-600/10 text-emerald-400 w-fit rounded-xl border border-emerald-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Smart Placement</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Intelligent placement algorithms automatically route uploads to the drive with the most free space.</p>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
            <div className="p-2.5 bg-purple-600/10 text-purple-400 w-fit rounded-xl border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Zero-Knowledge Security</h3>
            <p className="text-xs text-slate-400 leading-relaxed">OAuth tokens are symmetrically encrypted at rest with enterprise-grade Fernet encryption.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        © 2026 Conflux Multi-Cloud Storage Platform. All rights reserved.
      </footer>
    </div>
  );
}
