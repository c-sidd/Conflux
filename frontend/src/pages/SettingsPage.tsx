import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { UserSession, SecurityEvent } from "@/types";
import { ShieldCheck, Monitor, History, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function SettingsPage() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    apiClient.get("/api/v1/auth/active-sessions/").then((r) => setSessions(r.data)).catch(() => {});
    apiClient.get("/api/v1/auth/audit-log/").then((r) => setEvents(r.data)).catch(() => {});
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);
    setPwdError(null);

    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    try {
      await apiClient.post("/api/v1/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPwdMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdError(err.message || "Failed to change password.");
    }
  };

  const handleRevokeSession = async (id: number) => {
    try {
      await apiClient.post(`/api/v1/auth/active-sessions/${id}/revoke/`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      alert("Failed to revoke session");
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Security & Account Settings</h1>
      </div>

      {/* Account Info */}
      <Card className="p-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Profile</h3>
        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-slate-900">{user?.email}</p>
            <p className="text-slate-500">Account ID: #{user?.id}</p>
          </div>
          <span className="bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full text-[10px] uppercase">
            {user?.is_verified ? "Verified Email" : "Active"}
          </span>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Change Password</h3>

        {pwdMessage && (
          <div className="flex items-center gap-2 p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pwdMessage}</span>
          </div>
        )}

        {pwdError && (
          <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pwdError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Current Password</label>
            <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">New Password</label>
            <Input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
            <Input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button type="submit" size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
            Update Password
          </Button>
        </form>
      </Card>

      {/* Active Sessions */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Device Sessions</h3>
        </div>

        {sessions.length === 0 ? (
          <p className="text-xs text-slate-400">No active device sessions found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-800">{s.device_name} {s.is_current && <span className="text-blue-600">(Current)</span>}</p>
                  <p className="text-[11px] text-slate-400">IP: {s.ip_address} • Last active: {new Date(s.last_active).toLocaleString()}</p>
                </div>
                {!s.is_current && (
                  <Button onClick={() => handleRevokeSession(s.id)} variant="outline" size="sm" className="text-[11px] text-red-600">
                    Revoke Access
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
