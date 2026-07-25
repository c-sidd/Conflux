"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { 
  Folder, HardDrive, Settings, LogOut, Clock, Star, Trash2, Search as SearchIcon, 
  Activity, Shield, Command, ChevronRight, User, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { fetchApi } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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

  // Global Keyboard Listener (Cmd+K / Ctrl+K)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setIsSearchOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults({ files: [], folders: [] });
      return;
    }
    try {
      const data = await fetchApi(`/api/v1/search/?q=${encodeURIComponent(query)}`);
      setSearchResults(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const displayName = user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.email.split("@")[0];
  const initial = (user.first_name || user.email).charAt(0).toUpperCase();

  const navItems = [
    { label: "My Files", href: "/dashboard", icon: Folder },
    { label: "Recent", href: "/dashboard/recent", icon: Clock },
    { label: "Favorites", href: "/dashboard/favorites", icon: Star },
    { label: "Storage Accounts", href: "/dashboard/storage", icon: HardDrive },
    { label: "Insights", href: "/dashboard/insights", icon: Settings },
    { label: "Activity", href: "/dashboard/activity", icon: Activity },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
    { label: "Trash", href: "/dashboard/trash", icon: Trash2 },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans antialiased">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none z-20">
        <div>
          {/* Logo Header */}
          <div className="p-5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/dashboard")}>
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-sm">
                C
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                  {BRAND.name}
                </h1>
                <span className="text-[10px] text-slate-400 font-medium">Cloud Storage OS</span>
              </div>
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
              v{BRAND.version}
            </span>
          </div>

          {/* Quick Search Shortcut Trigger */}
          <div className="p-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 transition-all group"
            >
              <div className="flex items-center gap-2">
                <SearchIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                <span>Search files...</span>
              </div>
              <kbd className="bg-white border border-slate-200 text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-bold shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {initial}
              </div>
              <div className="overflow-hidden text-left">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{displayName}</p>
                <p className="text-[10px] text-slate-400 truncate leading-none">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Layered Content Container */}
      <main className="flex-1 bg-[#FCFCFD] overflow-auto flex flex-col">
        {children}
      </main>

      {/* Global Cmd+K Search Modal */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="bg-white border border-slate-200 p-0 rounded-2xl max-w-xl shadow-xl overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center gap-3">
            <SearchIcon className="w-4 h-4 text-slate-400 ml-2" />
            <Input
              autoFocus
              placeholder="Search files, folders, or type:pdf..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="border-none bg-transparent focus-visible:ring-0 text-sm text-slate-900 placeholder:text-slate-400 p-0"
            />
            <kbd className="bg-slate-100 border border-slate-200 text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded mr-2">
              ESC
            </kbd>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {!searchQuery.trim() ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Type keywords or structured queries like <code className="bg-slate-100 px-1 py-0.5 rounded">type:pdf</code>
              </div>
            ) : searchResults.files.length === 0 && searchResults.folders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No matching results found for "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.folders.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 block">Folders</span>
                    {searchResults.folders.map(f => (
                      <div
                        key={f.id}
                        onClick={() => { setIsSearchOpen(false); router.push(`/dashboard/folder/${f.id}`); }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Folder className="w-4 h-4 text-blue-500" />
                          <span className="font-semibold text-slate-800">{f.name}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.files.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1 block">Files</span>
                    {searchResults.files.map(f => (
                      <div
                        key={f.id}
                        onClick={() => { setIsSearchOpen(false); router.push(`/dashboard?highlight=${f.id}`); }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Folder className="w-4 h-4 text-purple-500" />
                          <span className="font-semibold text-slate-800">{f.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{f.storage_account?.nickname}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
