import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Sun, Moon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/CommandPalette";

export function Header() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("conflux_theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("conflux_theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  return (
    <header className="h-14 bg-white dark:bg-[#111111] border-b border-[#F3F4F6] dark:border-[#2B2B2B] px-6 flex items-center justify-between shrink-0 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-[#111111] dark:text-white">Unified Cloud Storage</span>
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#F3F4F6] dark:bg-[#2B2B2B] border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-semibold text-[#6B7280] dark:text-slate-300 hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
        >
          <Search className="w-3 h-3 text-[#F26A21]" />
          <span>Quick Commands</span>
          <kbd className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-700 rounded px-1 text-[9px] font-mono shadow-2xs">Ctrl K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#F3F4F6] dark:bg-[#2B2B2B] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          title="Toggle Light/Dark Theme"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-[#F26A21]" />}
        </button>

        <div className="flex items-center gap-2 font-medium text-[#111111] dark:text-slate-200">
          <div className="w-7 h-7 rounded-full bg-[#F26A21] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <span>{user?.username || user?.email}</span>
        </div>

        <Button onClick={logout} variant="outline" size="sm" className="text-xs text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-[#F3F4F6] dark:hover:bg-[#2B2B2B]">
          <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
        </Button>
      </div>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </header>
  );
}
