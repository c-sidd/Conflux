import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder, HardDrive, Star, Clock, Activity, ShieldCheck, Plus, Search, X, Command
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewFolder?: () => void;
}

export function CommandPalette({ isOpen, onClose, onNewFolder }: CommandPaletteProps) {
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
  ];

  const filteredActions = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-bg-overlay backdrop-blur-sm pt-20 p-4 cfx-animate-in">
      <div className="w-full max-w-lg bg-bg-surface border border-border rounded-[var(--radius-2xl)] shadow-[var(--shadow-modal)] overflow-hidden space-y-2 cfx-scale-in">
        <div className="p-3 bg-bg-sunken border-b border-border flex items-center gap-2">
          <Search className="w-4 h-4 text-text-muted" />
          <Input
            autoFocus
            placeholder="Type a command or search... (Press Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 bg-transparent focus:ring-0 text-[var(--font-size-caption)] text-text-primary placeholder:text-text-muted"
          />
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors duration-[var(--duration-fast)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="p-4 text-center text-[var(--font-size-caption)] text-text-muted">No matching commands found.</div>
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] hover:bg-primary-light text-text-primary text-[var(--font-size-caption)] font-medium transition-colors duration-[var(--duration-fast)] cursor-pointer text-left"
                >
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="p-2.5 bg-bg-sunken border-t border-border flex items-center justify-between text-[var(--font-size-label)] text-text-muted px-4 font-mono">
          <span>Navigation Shortcuts</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
