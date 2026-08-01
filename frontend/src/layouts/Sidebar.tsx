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
    <aside className="w-64 bg-bg-surface border-r border-border text-text-primary flex flex-col justify-between shrink-0 select-none">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-primary rounded-[var(--radius-lg)] text-white shadow-[var(--shadow-md)]">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[var(--font-size-subtitle)] font-extrabold text-text-primary tracking-tight">Conflux</h1>
            <p className="text-[var(--font-size-label)] text-text-muted">Multi-Cloud Storage</p>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-lg)] text-[var(--font-size-caption)] font-medium transition-all duration-[var(--duration-normal)] ${
                    isActive
                      ? "bg-primary-light text-primary font-bold shadow-[var(--shadow-xs)]"
                      : "text-text-secondary hover:text-primary hover:bg-primary-light"
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
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between px-2 text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">
              <span>Connected Drives ({accounts.length})</span>
              <NavLink to="/dashboard/storage" className="text-primary hover:text-primary-hover transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            <div className="space-y-2">
              {accounts.map((acc) => {
                const percent = acc.total_storage > 0 ? Math.round((acc.used_storage / acc.total_storage) * 100) : 0;
                return (
                  <div key={acc.id} className="p-2.5 bg-bg-sunken border border-border rounded-[var(--radius-lg)] space-y-1.5 hover:border-primary/30 transition-all duration-[var(--duration-normal)]">
                    <div className="flex items-center justify-between text-[var(--font-size-caption)]">
                      <span className="font-bold text-text-primary truncate max-w-[130px]" title={acc.nickname}>
                        {acc.nickname}
                      </span>
                      <span className={`text-[var(--font-size-micro)] px-1.5 py-0.5 rounded-[var(--radius-full)] font-bold uppercase ${
                        acc.health_status === "healthy" ? "bg-success-light text-success" : "bg-warning-light text-warning"
                      }`}>
                        {acc.health_status === "healthy" ? "OK" : "Sync"}
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-neutral-light rounded-[var(--radius-full)] overflow-hidden">
                      <div className="h-full bg-primary rounded-[var(--radius-full)] transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>

                    <div className="flex justify-between text-[var(--font-size-micro)] text-text-muted font-mono">
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

      <div className="p-4 border-t border-border text-[var(--font-size-label)] text-text-muted text-center font-medium">
        Conflux v1.0 — Beta
      </div>
    </aside>
  );
}
