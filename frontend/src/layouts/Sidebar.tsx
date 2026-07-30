import React from "react";
import { NavLink } from "react-router-dom";
import {
  Folder, HardDrive, Star, Clock, Trash2, ShieldCheck, Activity
} from "lucide-react";

export function Sidebar() {
  const navItems = [
    { to: "/dashboard", label: "My Storage", icon: Folder },
    { to: "/dashboard/storage", label: "Storage Accounts", icon: HardDrive },
    { to: "/dashboard/favorites", label: "Starred Files", icon: Star },
    { to: "/dashboard/recent", label: "Recent Files", icon: Clock },
    { to: "/dashboard/activity", label: "Activity Timeline", icon: Activity },
    { to: "/dashboard/trash", label: "Trash Bin", icon: Trash2 },
    { to: "/dashboard/settings", label: "Security & Profile", icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Conflux Workspace</h1>
            <p className="text-[10px] text-slate-400">Multi-Cloud Storage</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800/80 text-[10px] text-slate-500 text-center">
        Conflux v1.0.0 — Unified Storage
      </div>
    </aside>
  );
}
