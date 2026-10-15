import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { CloudConnectIllustration } from '../../components/ui/Illustrations';
import { CheckCircle2, HardDrive, Layers, ShieldCheck, Zap } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
            <HardDrive className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">Conflux</span>
          <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-brand-700 border border-blue-200">
            Phase 1
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 sm:py-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-brand-700 mb-6">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          Multi-Account Google Drive Aggregator
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl">
          All your Google Drive accounts, unified in one clean workspace
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Connect your personal, work, and archive Google Drives. Browse all your files together with clear account attribution, search across drives, and balance storage automatically.
        </p>

        {/* Hero Illustration */}
        <div className="my-8 w-full max-w-md flex justify-center">
          <CloudConnectIllustration className="w-72 h-auto sm:w-96 drop-shadow-sm hover:scale-[1.02] transition-transform duration-300" />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs">
          <Link to="/register" className="w-full">
            <Button size="lg" className="w-full py-3">
              Start Free
            </Button>
          </Link>
          <Link to="/login" className="w-full">
            <Button variant="outline" size="lg" className="w-full py-3">
              Sign In
            </Button>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Free with Neon Postgres
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> OAuth 2.0 Security
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Zero File Alteration
          </span>
        </div>

        {/* 3 Core Phase-1 Features Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Unified File Explorer</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every file row clearly displays its origin Google account. Browse everything in a single view or filter down to a specific drive anytime.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Quota & Best-Fit Placement</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Observe aggregate and per-drive storage quotas in real-time. New uploads automatically select the drive with the most free capacity.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Safe Verification</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cross-account operations verify the destination first and require explicit confirmation. Source files are never touched without verification.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        Conflux Phase 1 &bull; Files remain safely stored on Google Drive &bull; Google Drive is a trademark of Google LLC.
      </footer>
    </div>
  );
};
