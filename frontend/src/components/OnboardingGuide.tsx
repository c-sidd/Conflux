import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, HardDrive, FolderPlus, Upload, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="m-4 p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
      <div className="space-y-1 z-10 max-w-xl">
        <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-300" /> Welcome to Conflux Workspace
        </div>
        <h2 className="text-base font-extrabold text-white">Get Started in 3 Simple Steps</h2>
        <p className="text-xs text-blue-100 leading-relaxed">
          Pool storage capacity across your Google Drive accounts into a single unified cloud filesystem.
        </p>
      </div>

      <div className="flex items-center gap-3 z-10">
        <Link
          to="/dashboard/storage"
          className="inline-flex items-center gap-1.5 bg-white text-blue-700 font-bold text-xs px-3.5 py-2 rounded-xl shadow-md hover:bg-blue-50 transition-colors"
        >
          <HardDrive className="w-3.5 h-3.5" /> 1. Connect Account
        </Link>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-blue-200 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
