"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";
import {
  Settings as SettingsIcon, Shield, Key, User as UserIcon, Monitor, Bell,
  HardDrive, Info, CheckCircle2, AlertTriangle, Laptop, Smartphone, Globe,
  LogOut, Loader2, Lock, ShieldAlert, History
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { BRAND } from "@/lib/brand";

type TabType = "profile" | "security" | "appearance" | "storage" | "notifications" | "about";

interface SecurityDashboardData {
  email: string;
  is_verified: boolean;
  email_verified_at: string | null;
  last_password_change: string | null;
  mfa_enabled: boolean;
  active_devices_count: number;
  last_login_at: string | null;
  recent_events: {
    id: number;
    event_type: string;
    ip_address: string | null;
    device_name: string;
    timestamp: string;
    metadata: any;
  }[];
}

interface UserSessionItem {
  id: number;
  device_name: string;
  ip_address: string | null;
  user_agent: string;
  last_active: string;
  created_at: string;
  is_active: boolean;
  is_current: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  // Security State
  const [secData, setSecData] = useState<SecurityDashboardData | null>(null);
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [loadingSec, setLoadingSec] = useState(false);

  // Change Password State
  const [currPassword, setCurrPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Resend Email State
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  // Revoke State
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSecurityData = async () => {
    setLoadingSec(true);
    try {
      const [dashRes, sessRes] = await Promise.all([
        fetchApi("/api/v1/auth/security-dashboard/"),
        fetchApi("/api/v1/auth/sessions/"),
      ]);
      if (dashRes?.success) setSecData(dashRes.dashboard);
      if (sessRes?.success) setSessions(sessRes.sessions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSec(false);
    }
  };

  useEffect(() => {
    if (activeTab === "security") {
      loadSecurityData();
    }
  }, [activeTab]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMsg({ success: false, text: "New passwords do not match." });
      return;
    }

    setChangingPass(true);
    setPassMsg(null);

    try {
      const res = await fetchApi("/api/v1/auth/change-password/", {
        method: "POST",
        body: JSON.stringify({
          current_password: currPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      if (res?.success) {
        setPassMsg({ success: true, text: res.message || "Password changed successfully." });
        setCurrPassword("");
        setNewPassword("");
        setConfirmPassword("");
        loadSecurityData();
      } else {
        setPassMsg({ success: false, text: res?.message || res?.errors?.new_password?.[0] || "Failed to change password." });
      }
    } catch (err: any) {
      setPassMsg({ success: false, text: err.message || "Failed to change password." });
    } finally {
      setChangingPass(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setResendMsg(null);
    try {
      const res = await fetchApi("/api/v1/auth/resend-verification/", { method: "POST" });
      setResendMsg(res?.message || "Verification email sent.");
    } catch (err: any) {
      setResendMsg(err.message || "Failed to resend verification email.");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm("Are you sure you want to log out all other active devices?")) return;
    setRevokingAll(true);
    try {
      await fetchApi("/api/v1/auth/sessions/revoke-all/", { method: "POST" });
      loadSecurityData();
    } catch (err) {
      console.error(err);
    } finally {
      setRevokingAll(false);
    }
  };

  const handleRevokeSingleSession = async (id: number) => {
    try {
      await fetchApi(`/api/v1/auth/sessions/${id}/revoke/`, { method: "POST" });
      loadSecurityData();
    } catch (err) {
      console.error(err);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "security", label: "Security & Passwords", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Monitor },
    { id: "storage", label: "Storage Preferences", icon: HardDrive },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "about", label: "About Conflux", icon: Info },
  ];

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6 bg-slate-50 min-h-screen">
      <header className="border-b border-slate-200/80 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-slate-600" /> Account Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Manage security credentials, active sessions, workspace preferences, and feature flags.
        </p>
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
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-2xs"
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
                  <span className="text-slate-900 font-semibold">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ""}` : "Conflux User"}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Security Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200 p-4 rounded-2xl shadow-2xs flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${secData?.is_verified ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                    {secData?.is_verified ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Email Status</span>
                    <span className="text-xs font-bold text-slate-900">
                      {secData?.is_verified ? "Verified" : "Unverified"}
                    </span>
                  </div>
                </Card>

                <Card className="bg-white border-slate-200 p-4 rounded-2xl shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Active Devices</span>
                    <span className="text-xs font-bold text-slate-900">
                      {secData?.active_devices_count ?? 1} Connected
                    </span>
                  </div>
                </Card>

                <Card className="bg-white border-slate-200 p-4 rounded-2xl shadow-2xs flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">2FA Status</span>
                    <span className="text-xs font-bold text-slate-500">
                      Disabled (Phase 4)
                    </span>
                  </div>
                </Card>
              </div>

              {/* Email Verification Box (If Unverified) */}
              {secData && !secData.is_verified && (
                <Card className="bg-amber-50/60 border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">Your email address is not verified</span>
                      <span className="text-slate-600">Verify your email to ensure secure account recovery access.</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0"
                  >
                    {resendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Resend Email"}
                  </Button>
                </Card>
              )}
              {resendMsg && (
                <p className="text-xs font-medium text-blue-600 pl-1">{resendMsg}</p>
              )}

              {/* Change Password Card */}
              <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <Key className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900">Change Account Password</h3>
                </div>

                {passMsg && (
                  <div className={`p-3 text-xs rounded-xl flex items-center gap-2 ${passMsg.success ? "bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium" : "bg-red-50 border border-red-200 text-red-600"}`}>
                    {passMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
                    <span>{passMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Current Password</label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={currPassword}
                      onChange={(e) => setCurrPassword(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">New Password</label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 text-xs"
                    />
                    <PasswordStrengthMeter password={newPassword} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 text-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={changingPass || !currPassword || !newPassword || !confirmPassword}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                  >
                    {changingPass ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Update Password"}
                  </Button>
                </form>
              </Card>

              {/* Active Devices / Sessions Panel */}
              <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Laptop className="w-4 h-4 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Active Devices & Sessions</h3>
                      <p className="text-xs text-slate-500">Devices currently logged into your account.</p>
                    </div>
                  </div>
                  {sessions.length > 1 && (
                    <Button
                      onClick={handleRevokeAllSessions}
                      disabled={revokingAll}
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                    >
                      {revokingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5 mr-1" />}
                      Logout All Other Devices
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {sessions.map((sess) => (
                    <div key={sess.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700">
                          {sess.device_name.toLowerCase().includes("mobile") || sess.device_name.toLowerCase().includes("ios") || sess.device_name.toLowerCase().includes("android") ? (
                            <Smartphone className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Laptop className="w-4 h-4 text-slate-700" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{sess.device_name}</span>
                            {sess.is_current && (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-100 text-blue-700 rounded-full">
                                THIS DEVICE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                            <span>IP: {sess.ip_address || "Unknown"}</span>
                            <span>•</span>
                            <span>Active: {new Date(sess.last_active).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {!sess.is_current && (
                        <Button
                          onClick={() => handleRevokeSingleSession(sess.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 text-xs"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recent Security Activity Feed */}
              <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <History className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">Recent Security Events</h3>
                </div>

                <div className="space-y-2.5 text-xs">
                  {secData?.recent_events && secData.recent_events.length > 0 ? (
                    secData.recent_events.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            ev.event_type === "LOGIN" ? "bg-emerald-100 text-emerald-800" :
                            ev.event_type === "PASSWORD_CHANGED" || ev.event_type === "PASSWORD_RESET" ? "bg-purple-100 text-purple-800" :
                            ev.event_type === "EMAIL_VERIFIED" ? "bg-blue-100 text-blue-800" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {ev.event_type.replace("_", " ")}
                          </span>
                          <span className="font-semibold text-slate-800">{ev.device_name || "System"}</span>
                          <span className="text-slate-400 text-[11px]">({ev.ip_address || "Internal"})</span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(ev.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-2">No security events logged yet.</p>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "appearance" && (
            <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Monitor className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Appearance & Theme</h3>
              </div>
              <p className="text-xs text-slate-500">
                Conflux features a handcrafted slate design system (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">#F8FAFC</code>).
              </p>
            </Card>
          )}

          {activeTab === "storage" && (
            <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Storage Routing Preferences</h3>
              </div>
              <p className="text-xs text-slate-500">
                Default placement strategy: <strong className="text-slate-900">MostFreeSpaceStrategy</strong>. Automatically selects connected provider with the largest available quota.
              </p>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="bg-white border-slate-200 p-6 space-y-4 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Notification Channels</h3>
              </div>
              <p className="text-xs text-slate-500">In-app notifications and background sync notifications are active.</p>
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
