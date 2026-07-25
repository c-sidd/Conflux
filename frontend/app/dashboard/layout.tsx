"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { Folder, HardDrive, Settings, LogOut, Clock, Star, Trash2, Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fetchApi } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ files: any[]; folders: any[] }>({ files: [], folders: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ files: [], folders: [] });
      setIsSearchOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchApi(`/api/v1/search/?q=${encodeURIComponent(searchQuery)}`)
        .then(res => {
          setSearchResults(res);
          setIsSearchOpen(true);
        })
        .catch(console.error);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const displayName = user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.email.split("@")[0];
  const initial = (user.first_name || user.email).charAt(0).toUpperCase();

  const navItems = [
    { label: "My Files", href: "/dashboard", icon: Folder, color: "text-blue-400" },
    { label: "Recent", href: "/dashboard/recent", icon: Clock, color: "text-purple-400" },
    { label: "Favorites", href: "/dashboard/favorites", icon: Star, color: "text-amber-400" },
    { label: "Storage Accounts", href: "/dashboard/storage", icon: HardDrive, color: "text-emerald-400" },
    { label: "Insights", href: "/dashboard/insights", icon: Settings, color: "text-cyan-400" },
    { label: "Trash", href: "/dashboard/trash", icon: Trash2, color: "text-red-400" },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent cursor-pointer" onClick={() => router.push("/dashboard")}>
            DCS
          </h1>
          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold border border-blue-500/30">v1.5A</span>
        </div>

        {/* Instant Search Bar */}
        <div className="px-4 mb-4 relative">
          <div className="relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search type:pdf folder:AI..."
              className="bg-zinc-950 border-zinc-800 text-xs text-white pl-9 h-9"
            />
          </div>

          {/* Search Autocomplete Dropdown */}
          {isSearchOpen && (searchResults.files.length > 0 || searchResults.folders.length > 0) && (
            <div className="absolute left-4 right-4 top-11 z-50 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 space-y-1 max-h-64 overflow-y-auto text-xs">
              {searchResults.folders.map(f => (
                <div
                  key={`sf-${f.id}`}
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                    router.push(`/dashboard/folder/${f.id}`);
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-xl flex items-center gap-2 cursor-pointer text-zinc-300"
                >
                  <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
              {searchResults.files.map(fi => (
                <div
                  key={`sfi-${fi.id}`}
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                    router.push(fi.folder ? `/dashboard/folder/${fi.folder}` : "/dashboard");
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-xl flex items-center gap-2 cursor-pointer text-zinc-300"
                >
                  <Folder className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="truncate">{fi.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${isActive ? "bg-zinc-800 text-white font-bold" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"}`}
              >
                <Icon className={`w-4 h-4 ${item.color}`} />
                {item.label}
              </a>
            );
          })}
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
            className="flex items-center gap-2 text-zinc-400 hover:text-red-400 transition-colors w-full px-2 py-1.5 text-xs font-semibold rounded-lg hover:bg-zinc-800/50 cursor-pointer"
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
