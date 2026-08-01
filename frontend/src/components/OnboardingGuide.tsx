import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, HardDrive, X } from "lucide-react";

export function OnboardingGuide() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem("conflux_onboarding_dismissed");
    if (isDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("conflux_onboarding_dismissed", "true");
  };

  if (dismissed) return null;

  return (
    <div className="m-4 p-5 bg-primary text-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-lg)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden cfx-animate-in">
      <div className="space-y-1 z-10 max-w-xl">
        <div className="flex items-center gap-2 text-brand-gold text-[var(--font-size-label)] font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-brand-gold" /> Welcome to Conflux Workspace
        </div>
        <h2 className="text-[var(--font-size-h4)] font-extrabold text-white">Get Started in 3 Simple Steps</h2>
        <p className="text-[var(--font-size-caption)] text-accent leading-relaxed">
          Pool storage capacity across your Google Drive accounts into a single unified cloud filesystem.
        </p>
      </div>

      <div className="flex items-center gap-3 z-10">
        <Link
          to="/dashboard/storage"
          className="inline-flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-hover text-primary font-bold text-[var(--font-size-caption)] px-4 py-2 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-normal)] active:scale-[0.98]"
        >
          <HardDrive className="w-3.5 h-3.5" /> 1. Connect Account
        </Link>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-accent hover:text-white rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
