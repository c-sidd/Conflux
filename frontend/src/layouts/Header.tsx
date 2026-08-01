import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/CommandPalette";

export function Header() {
  const { user, logout } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <header className="h-14 bg-bg-surface border-b border-border px-6 flex items-center justify-between shrink-0 transition-colors duration-[var(--duration-normal)]">
      <div className="flex items-center gap-3">
        <span className="text-[var(--font-size-caption)] font-bold text-text-primary tracking-tight hidden md:block">Unified Cloud Storage</span>
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-bg-sunken border border-border rounded-[var(--radius-lg)] text-[var(--font-size-caption)] font-medium text-text-muted hover:text-text-primary hover:border-border-hover hover:bg-bg-surface transition-all duration-[var(--duration-normal)] cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Quick Commands</span>
          <kbd className="hidden sm:inline bg-bg-surface border border-border rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[var(--font-size-micro)] font-mono text-text-muted shadow-[var(--shadow-xs)]">
            <Command className="w-2.5 h-2.5 inline -mt-px" /> K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-full)] bg-primary text-white flex items-center justify-center font-bold text-[var(--font-size-caption)] shadow-[var(--shadow-sm)] ring-2 ring-primary/10">
            {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="hidden sm:block">
            <p className="text-[var(--font-size-caption)] font-semibold text-text-primary leading-tight">{user?.username || user?.email}</p>
          </div>
        </div>

        <Button onClick={logout} variant="outline" size="sm" className="text-text-secondary">
          <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
        </Button>
      </div>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </header>
  );
}
