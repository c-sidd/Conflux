import React from "react";
import { Link } from "react-router-dom";
import { HardDrive, ShieldCheck, Zap, Layers, ArrowRight } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-primary text-white font-sans antialiased flex flex-col justify-between selection:bg-brand-gold selection:text-primary">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-white/10 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-[var(--radius-lg)] text-white shadow-[var(--shadow-sm)] backdrop-blur-sm">
            <HardDrive className="w-5 h-5" />
          </div>
          <span className="text-[var(--font-size-title)] font-extrabold tracking-tight">Conflux</span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="text-[var(--font-size-caption)] font-semibold text-white/70 hover:text-white px-3 py-1.5 rounded-[var(--radius-lg)] transition-colors duration-[var(--duration-normal)]">
            Sign In
          </Link>
          <Link to="/register" className="text-[var(--font-size-caption)] font-semibold bg-brand-gold hover:bg-brand-gold-hover text-primary px-4 py-2 rounded-[var(--radius-lg)] transition-all duration-[var(--duration-normal)] shadow-[var(--shadow-sm)] active:scale-[0.98]">
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-20 text-center space-y-8 flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[var(--radius-full)] bg-white/10 border border-white/15 text-brand-gold text-[var(--font-size-caption)] font-semibold backdrop-blur-sm">
          <Zap className="w-3.5 h-3.5" /> Next-Generation Multi-Cloud Orchestration
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight cfx-animate-in">
          Pool All Your Cloud Storage Into One Virtual Drive
        </h1>

        <p className="text-[var(--font-size-body)] sm:text-[var(--font-size-title)] text-accent max-w-2xl leading-relaxed">
          Conflux seamlessly aggregates capacity across multiple Google Drive accounts and cloud providers into a single high-performance virtual filesystem with smart placement.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-hover text-primary text-[var(--font-size-caption)] font-bold px-6 py-3 rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] transition-all duration-[var(--duration-normal)] active:scale-[0.98]">
            Launch Workspace <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="inline-flex items-center justify-center gap-2 border border-white/15 bg-white/5 text-white/80 hover:text-white text-[var(--font-size-caption)] font-bold px-6 py-3 rounded-[var(--radius-lg)] transition-all duration-[var(--duration-normal)] backdrop-blur-sm">
            Sign In Existing Account
          </Link>
        </div>

        {/* Value Proposition Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full text-left">
          <div className="p-6 bg-white/5 border border-white/10 rounded-[var(--radius-2xl)] space-y-3 backdrop-blur-sm hover:bg-white/8 transition-all duration-[var(--duration-normal)]">
            <div className="p-2.5 bg-brand-gold/15 text-brand-gold w-fit rounded-[var(--radius-lg)] border border-brand-gold/20">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-[var(--font-size-subtitle)] font-bold text-white">Capacity Pooling</h3>
            <p className="text-[var(--font-size-caption)] text-accent leading-relaxed">Combine 15GB free quotas across multiple Google accounts into a single multi-terabyte pool.</p>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-[var(--radius-2xl)] space-y-3 backdrop-blur-sm hover:bg-white/8 transition-all duration-[var(--duration-normal)]">
            <div className="p-2.5 bg-brand-gold/15 text-brand-gold w-fit rounded-[var(--radius-lg)] border border-brand-gold/20">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-[var(--font-size-subtitle)] font-bold text-white">Smart Placement</h3>
            <p className="text-[var(--font-size-caption)] text-accent leading-relaxed">Intelligent placement algorithms automatically route uploads to the drive with the most free space.</p>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-[var(--radius-2xl)] space-y-3 backdrop-blur-sm hover:bg-white/8 transition-all duration-[var(--duration-normal)]">
            <div className="p-2.5 bg-brand-gold/15 text-brand-gold w-fit rounded-[var(--radius-lg)] border border-brand-gold/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-[var(--font-size-subtitle)] font-bold text-white">Zero-Knowledge Security</h3>
            <p className="text-[var(--font-size-caption)] text-accent leading-relaxed">OAuth tokens are symmetrically encrypted at rest with enterprise-grade Fernet encryption.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-[var(--font-size-caption)] text-accent/60">
        © 2026 Conflux Multi-Cloud Storage Platform. All rights reserved.
      </footer>
    </div>
  );
}
