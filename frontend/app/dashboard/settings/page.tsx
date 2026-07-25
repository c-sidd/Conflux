"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Settings as SettingsIcon, Shield, Key, ToggleLeft, User as UserIcon, Monitor, Bell, HardDrive, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

type TabType = "profile" | "security" | "appearance" | "storage" | "notifications" | "about";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  const tabs = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "security", label: "Security & Passwords", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Monitor },
    { id: "storage", label: "Storage Preferences", icon: HardDrive },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "about", label: "About Conflux", icon: Info },
  ];

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <header className="border-b border-slate-200/80 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-slate-600" /> Account Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">Manage security credentials, workspace preferences, and system feature flags.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings Navigation Sidebar */}
        <div className="space-y-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as TabType)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === "profile" && (
            <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <UserIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Profile Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Email Address</span>
                  <span className="text-slate-900 font-semibold">{user?.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Account Name</span>
                  <span className="text-slate-900 font-semibold">{user?.first_name ? `${user.first_name} ${user.last_name || ""}` : "Conflux User"}</span>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "security" && (
            <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Shield className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Security Credentials</h3>
              </div>
              <p className="text-xs text-slate-500">Your account is secured with email and password authentication and JWT tokens.</p>
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs">
                <Key className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Change Account Password
              </Button>
            </Card>
          )}

          {activeTab === "appearance" && (
            <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Monitor className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Appearance & Theme</h3>
              </div>
              <p className="text-xs text-slate-500">Conflux features a handcrafted light slate design system (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">#F8FAFC</code> / <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">#FCFCFD</code>).</p>
            </Card>
          )}

          {activeTab === "storage" && (
            <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Storage Routing Preferences</h3>
              </div>
              <p className="text-xs text-slate-500">Default placement strategy: <strong className="text-slate-900">MostFreeSpaceStrategy</strong>. Automatically selects connected provider with the largest available quota.</p>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Notification Channels</h3>
              </div>
              <p className="text-xs text-slate-500">In-app notifications and background Celery task sync notifications are active.</p>
            </Card>
          )}

          {activeTab === "about" && (
            <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Info className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">About {BRAND.name}</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Application:</span>
                  <span className="font-bold text-slate-900">{BRAND.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Version:</span>
                  <span className="font-mono font-bold text-blue-600">v{BRAND.version}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">Tagline:</span>
                  <span className="font-semibold text-slate-700">{BRAND.tagline}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Workspace Folder:</span>
                  <span className="font-mono text-slate-900 font-bold">{BRAND.workspaceFolder}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
