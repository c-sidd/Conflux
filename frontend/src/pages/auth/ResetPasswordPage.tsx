import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "@/api/client";
import { KeyRound, Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.post("/api/v1/auth/reset-password/", {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 text-white p-4">
      <div className="w-full max-w-md space-y-6 bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
        {submitted ? (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Password Updated</h1>
            <p className="text-xs text-slate-400">Your password has been successfully reset.</p>
            <Button onClick={() => navigate("/login")} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 text-xs">
              Sign In with New Password
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Set New Password</h1>
              <p className="text-xs text-slate-400">Enter your new password below</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">New Password</label>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-slate-900 border-slate-800 focus:border-blue-500 text-white pr-9"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-900 border-slate-800 focus:border-blue-500 text-white pr-9"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>

              <Button type="submit" disabled={loading || !newPassword} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 text-xs">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Reset Password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
