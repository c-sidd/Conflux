"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, HardDrive, ShieldCheck, Cpu, ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";

export default function Home() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const [isLoginTab, setIsLoginTab] = useState(true);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isLoginTab) {
        await login(email, password);
      } else {
        await register(email, password, firstName, lastName);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between font-sans antialiased">
      {/* Navigation Header */}
      <header className="max-w-6xl w-full mx-auto p-6 flex items-center justify-between border-b border-slate-200/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-xs">
            C
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">{BRAND.name}</span>
        </div>
        <span className="text-xs text-slate-400 font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          v{BRAND.version} Production Ready
        </span>
      </header>

      {/* Hero & Sign-in Section */}
      <main className="max-w-6xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Column: Product Value Proposition */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
            <span>Unified Multi-Cloud Storage Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {BRAND.tagline}
          </h1>

          <p className="text-slate-600 text-sm leading-relaxed max-w-lg">
            {BRAND.description}
          </p>

          {/* 3 Core Product Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <HardDrive className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-xs text-slate-900">Storage Pooling</h3>
              <p className="text-[11px] text-slate-500 leading-normal">Combine multiple cloud accounts into one disk space.</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <Cpu className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-xs text-slate-900">Smart Routing</h3>
              <p className="text-[11px] text-slate-500 leading-normal">Automatically stores files where quota is largest.</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-xs text-slate-900">Isolation Safety</h3>
              <p className="text-[11px] text-slate-500 leading-normal">Personal drive contents remain 100% private.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Authentication Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 max-w-md w-full mx-auto">
          {/* Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => { setIsLoginTab(true); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isLoginTab ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLoginTab(false); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isLoginTab ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginTab && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  {isLoginTab ? "Sign In to Workspace" : "Create Conflux Account"} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              )}
            </Button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto p-6 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-400">
        <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
        <p>Support: {BRAND.supportEmail}</p>
      </footer>
    </div>
  );
}
