"use client";

import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans antialiased">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg mx-auto">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-slate-900">Page Not Found</h1>
          <p className="text-slate-500 text-xs leading-relaxed">
            The page or resource you are looking for does not exist in {BRAND.name}.
          </p>
        </div>
        <Link 
          href="/dashboard" 
          className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-xs transition-colors"
        >
          Return to Workspace Dashboard
        </Link>
      </div>
    </div>
  );
}
