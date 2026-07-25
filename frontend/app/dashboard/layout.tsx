"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Folder, HardDrive, Settings, LogOut } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const displayName = user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.email.split("@")[0];
  const initial = (user.first_name || user.email).charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">
            DCS
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <a href="/dashboard" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <Folder className="w-5 h-5 text-blue-400" />
            My Files
          </a>
          <a href="/dashboard/storage" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <HardDrive className="w-5 h-5 text-purple-400" />
            Storage Accounts
          </a>
          <a href="/dashboard/insights" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 rounded-lg text-zinc-400 hover:text-white transition-colors">
            <Settings className="w-5 h-5 text-emerald-400" />
            Storage Insights
          </a>
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white shadow">
              {initial}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate capitalize">{displayName}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-zinc-400 hover:text-red-400 transition-colors w-full px-2 py-1.5 text-sm rounded-lg hover:bg-zinc-800/50 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        {children}
      </main>
    </div>
  );
}
