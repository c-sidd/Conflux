import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { UserSession } from "@/types";
import { ShieldCheck, Monitor, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SettingsPage() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  const [sessions, setSessions] = useState<UserSession[]>([]);

  useEffect(() => {
    apiClient.get("/api/v1/auth/active-sessions/").then((r) => setSessions(r.data)).catch(() => {});
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);
    setPwdError(null);

    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    setPwdLoading(true);
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
    } finally {
      setPwdLoading(false);
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
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl cfx-animate-in">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h1 className="text-[var(--font-size-h3)] font-bold text-text-primary tracking-tight">Security & Account Settings</h1>
      </div>

      {/* Account Profile */}
      <Card className="p-5 space-y-3">
        <h3 className="text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">Account Profile</h3>
        <div className="flex items-center justify-between text-[var(--font-size-caption)]">
          <div>
            <p className="font-bold text-text-primary">{user?.email}</p>
            <p className="text-text-muted">Account ID: #{user?.id}</p>
          </div>
          <Badge variant={user?.is_verified ? "success" : "default"}>
            {user?.is_verified ? "Verified Email" : "Active"}
          </Badge>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-5 space-y-4">
        <h3 className="text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">Change Password</h3>

        {pwdMessage && (
          <div className="flex items-center gap-2 p-3 text-[var(--font-size-caption)] bg-success-light border border-success/20 text-success rounded-[var(--radius-lg)]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pwdMessage}</span>
          </div>
        )}

        {pwdError && (
          <div className="flex items-center gap-2 p-3 text-[var(--font-size-caption)] bg-danger-light border border-danger/20 text-danger rounded-[var(--radius-lg)]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pwdError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          <div className="space-y-1">
            <label className="text-[var(--font-size-caption)] font-semibold text-text-secondary">Current Password</label>
            <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[var(--font-size-caption)] font-semibold text-text-secondary">New Password</label>
            <Input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[var(--font-size-caption)] font-semibold text-text-secondary">Confirm New Password</label>
            <Input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button type="submit" size="sm" loading={pwdLoading}>
            Update Password
          </Button>
        </form>
      </Card>

      {/* Active Device Sessions */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-text-muted" />
          <h3 className="text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">Active Device Sessions</h3>
        </div>

        {sessions.length === 0 ? (
          <p className="text-[var(--font-size-caption)] text-text-muted">No active device sessions found.</p>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between text-[var(--font-size-caption)]">
                <div>
                  <p className="font-bold text-text-primary">{s.device_name} {s.is_current && <span className="text-primary font-bold">(Current)</span>}</p>
                  <p className="text-[var(--font-size-label)] text-text-muted">IP: {s.ip_address} • Last active: {new Date(s.last_active).toLocaleString()}</p>
                </div>
                {!s.is_current && (
                  <Button onClick={() => handleRevokeSession(s.id)} variant="outline" size="sm" className="text-danger hover:bg-danger-light">
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
