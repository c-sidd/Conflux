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
    <header className="h-14 bg-white dark:bg-[#22223B] border-b border-[#C9ADA7]/30 dark:border-[#4A4E69]/40 px-6 flex items-center justify-between shrink-0 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-[#22223B] dark:text-[#F2E9E4]">Unified Cloud Storage</span>
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#F2E9E4] dark:bg-[#4A4E69]/40 border border-[#C9ADA7]/40 dark:border-[#4A4E69] rounded-xl text-[11px] font-semibold text-[#4A4E69] dark:text-[#C9ADA7] hover:text-[#22223B] dark:hover:text-white transition-colors cursor-pointer"
        >
          <Search className="w-3 h-3 text-[#4A4E69] dark:text-[#9A8C98]" />
          <span>Quick Commands</span>
          <kbd className="bg-white dark:bg-[#22223B] border border-[#C9ADA7]/40 dark:border-[#4A4E69] rounded px-1 text-[9px] font-mono shadow-2xs">Ctrl K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-xl border border-[#C9ADA7]/40 dark:border-[#4A4E69] bg-[#F2E9E4] dark:bg-[#4A4E69]/40 text-[#22223B] dark:text-[#F2E9E4] hover:bg-[#C9ADA7]/20 transition-colors cursor-pointer"
          title="Toggle Light/Dark Theme"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-[#C9ADA7]" />}
        </button>

        <div className="flex items-center gap-2 font-medium text-[#22223B] dark:text-[#F2E9E4]">
          <div className="w-7 h-7 rounded-full bg-[#4A4E69] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <span>{user?.username || user?.email}</span>
        </div>

        <Button onClick={logout} variant="outline" size="sm" className="text-xs text-[#22223B] dark:text-[#F2E9E4] border-[#C9ADA7]/40 dark:border-[#4A4E69] hover:bg-[#F2E9E4] dark:hover:bg-[#4A4E69]">
          <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
        </Button>
      </div>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </header>
  );
}
