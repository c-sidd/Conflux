"use client";

import { useAuth } from "@/lib/auth-context";
import { Settings as SettingsIcon, Shield, Key, ToggleLeft, User as UserIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 overflow-auto p-8 z-10 space-y-8 max-w-4xl">
      <header>
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-emerald-400" /> Account Settings
        </h2>
        <p className="text-zinc-400 text-sm mt-1">Manage security credentials, workspace preferences, and system flags.</p>
      </header>

      <div className="space-y-6">
        {/* Profile Card */}
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <UserIcon className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Profile Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-zinc-500 block">Email Address</span>
              <span className="text-zinc-200 font-medium">{user?.email}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Account Name</span>
              <span className="text-zinc-200 font-medium">{user?.first_name ? `${user.first_name} ${user.last_name || ""}` : "DCS User"}</span>
            </div>
          </div>
        </Card>

        {/* Security & Authentication */}
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <Shield className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Security & Password</h3>
          </div>
          <p className="text-xs text-zinc-400">Your account is secured with email and password authentication.</p>
          <Button variant="outline" className="border-zinc-800 text-zinc-300 hover:text-white text-xs">
            <Key className="w-3.5 h-3.5 mr-1.5" /> Change Password
          </Button>
        </Card>

        {/* Active Feature Flags */}
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <ToggleLeft className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">System Feature Flags (Phase 1.5A.5)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-850">
              <span className="text-zinc-300 font-mono">FEATURE_TRASH</span>
              <span className="text-green-400 font-bold">ACTIVE</span>
            </div>
            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-850">
              <span className="text-zinc-300 font-mono">FEATURE_PREVIEW</span>
              <span className="text-green-400 font-bold">ACTIVE</span>
            </div>
            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-850">
              <span className="text-zinc-300 font-mono">FEATURE_SEARCH</span>
              <span className="text-green-400 font-bold">ACTIVE</span>
            </div>
            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-850">
              <span className="text-zinc-300 font-mono">FEATURE_FAVORITES</span>
              <span className="text-green-400 font-bold">ACTIVE</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
