import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/CommandPalette";

export function Header() {
  const { user, logout } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <header className="h-14 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-[#0F172A]">Unified Cloud Storage</span>
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[11px] font-semibold text-[#475569] hover:text-[#0F172A] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
        >
          <Search className="w-3 h-3 text-[#2563EB]" />
          <span>Quick Commands</span>
          <kbd className="bg-white border border-[#E2E8F0] rounded px-1 text-[9px] font-mono shadow-2xs">Ctrl K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2 font-medium text-[#0F172A]">
          <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <span>{user?.username || user?.email}</span>
        </div>

        <Button onClick={logout} variant="outline" size="sm" className="text-xs text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:text-[#0F172A]">
          <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
        </Button>
      </div>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </header>
  );
}
