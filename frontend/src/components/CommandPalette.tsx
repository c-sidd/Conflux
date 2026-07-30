import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder, HardDrive, Star, Clock, Activity, ShieldCheck, Upload, Plus, Sun, Moon, Search, X
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewFolder?: () => void;
  onUpload?: () => void;
}

export function CommandPalette({ isOpen, onClose, onNewFolder, onUpload }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { label: "Go to My Storage", icon: Folder, action: () => navigate("/dashboard") },
    { label: "Go to Storage Accounts", icon: HardDrive, action: () => navigate("/dashboard/storage") },
    { label: "Go to Starred Files", icon: Star, action: () => navigate("/dashboard/favorites") },
    { label: "Go to Recent Files", icon: Clock, action: () => navigate("/dashboard/recent") },
    { label: "Go to Activity Timeline", icon: Activity, action: () => navigate("/dashboard/activity") },
    { label: "Go to Security & Profile", icon: ShieldCheck, action: () => navigate("/dashboard/settings") },
    {
      label: "Create New Folder",
      icon: Plus,
      action: () => {
        if (onNewFolder) onNewFolder();
      },
    },
    {
      label: "Toggle Light/Dark Theme",
      icon: Sun,
      action: () => {
        const curr = localStorage.getItem("conflux_theme") || "light";
        const next = curr === "light" ? "dark" : "light";
        localStorage.setItem("conflux_theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
      },
    },
  ];

  const filteredActions = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs pt-20 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden space-y-2">
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <Input
            autoFocus
            placeholder="Type a command or search... (Press Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 bg-transparent focus:ring-0 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">No matching commands found.</div>
          ) : (
            filteredActions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer text-left"
                >
                  <Icon className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 px-4 font-mono">
          <span>Navigation Shortcuts</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
