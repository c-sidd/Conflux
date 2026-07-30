import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  Folder, HardDrive, Star, Clock, Trash2, ShieldCheck, Activity, Plus
} from "lucide-react";
import { apiClient } from "@/api/client";
import { StorageAccount } from "@/types";

export function Sidebar() {
  const [accounts, setAccounts] = useState<StorageAccount[]>([]);

  useEffect(() => {
    apiClient.get("/api/v1/storage/accounts/").then((res) => {
      setAccounts(res.data);
    }).catch(console.error);
  }, []);

  const navItems = [
    { to: "/dashboard", label: "My Files", icon: Folder },
    { to: "/dashboard/recent", label: "Recent Files", icon: Clock },
    { to: "/dashboard/favorites", label: "Starred Files", icon: Star },
    { to: "/dashboard/activity", label: "Activity Feed", icon: Activity },
    { to: "/dashboard/trash", label: "Trash Bin", icon: Trash2 },
    { to: "/dashboard/storage", label: "Storage Accounts", icon: HardDrive },
    { to: "/dashboard/settings", label: "Settings", icon: ShieldCheck },
  ];

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 GB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  return (
    <aside className="w-64 bg-[#22223B] border-r border-[#4A4E69]/40 text-[#F2E9E4] flex flex-col justify-between shrink-0 select-none">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-[#4A4E69] rounded-xl text-white shadow-md">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#F2E9E4] tracking-tight">Conflux Workspace</h1>
            <p className="text-[10px] text-[#C9ADA7]">Multi-Cloud Storage</p>
          </div>
        </div>

        {/* Primary Navigation */}
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
                      ? "bg-[#4A4E69] text-white border border-[#9A8C98]/40 shadow-xs"
                      : "text-[#C9ADA7] hover:text-white hover:bg-[#4A4E69]/40"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Connected Storage Accounts Section */}
        {accounts.length > 0 && (
          <div className="pt-4 border-t border-[#4A4E69]/40 space-y-3">
            <div className="flex items-center justify-between px-2 text-[10px] font-bold text-[#9A8C98] uppercase tracking-wider">
              <span>Connected Drives ({accounts.length})</span>
              <NavLink to="/dashboard/storage" className="text-[#C9ADA7] hover:text-white">
                <Plus className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            <div className="space-y-2">
              {accounts.map((acc) => {
                const percent = acc.total_storage > 0 ? Math.round((acc.used_storage / acc.total_storage) * 100) : 0;
                return (
                  <div key={acc.id} className="p-2.5 bg-[#4A4E69]/20 border border-[#4A4E69]/40 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#F2E9E4] truncate max-w-[130px]" title={acc.nickname}>
                        {acc.nickname}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                        acc.health_status === "healthy" ? "bg-emerald-950 text-emerald-300" : "bg-amber-950 text-amber-300"
                      }`}>
                        {acc.health_status === "healthy" ? "OK" : "Sync"}
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-[#22223B] rounded-full overflow-hidden">
                      <div className="h-full bg-[#9A8C98] rounded-full" style={{ width: `${percent}%` }} />
                    </div>

                    <div className="flex justify-between text-[9px] text-[#C9ADA7] font-mono">
                      <span>{formatSize(acc.used_storage)} used</span>
                      <span>{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#4A4E69]/40 text-[10px] text-[#9A8C98] text-center font-medium">
        Conflux v1.0 — Unified Storage
      </div>
    </aside>
  );
}
