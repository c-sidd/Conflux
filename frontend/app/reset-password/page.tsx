"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, CheckCircle2, ShieldAlert, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenError("Missing password reset token in URL.");
      return;
    }

    const checkToken = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/auth/verify-reset-token/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Password reset link is invalid or expired.");
        }

        setTokenValid(true);
      } catch (err: any) {
        setTokenError(err.message || "Failed to verify reset token.");
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/auth/reset-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.errors?.new_password?.[0] || "Failed to reset password.");
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 text-white p-4">
      <div className="w-full max-w-md space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        {verifying ? (
          <div className="text-center py-8 space-y-3">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
            <p className="text-sm text-zinc-400">Verifying reset link...</p>
          </div>
        ) : !tokenValid ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Invalid or Expired Link</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {tokenError || "This password reset link is invalid or has expired."}
            </p>
            <Button
              onClick={() => router.push("/forgot-password")}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white mt-2"
            >
              Request a new reset link
            </Button>
          </div>
        ) : submitSuccess ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Password Reset Complete</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Your password has been successfully updated. All active sessions have been signed out for security.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-4"
            >
              Sign In with New Password
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Set New Password</h1>
              <p className="text-sm text-zinc-400">
                Please enter your new password below.
              </p>
            </div>

            {submitError && (
              <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">New Password</label>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 focus:border-blue-500 text-white pr-9"
                  />
                  <Lock className="w-4 h-4 text-zinc-500 absolute right-3 top-3" />
                </div>
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Confirm New Password</label>
                <div className="relative">
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 focus:border-blue-500 text-white pr-9"
                  />
                  <Lock className="w-4 h-4 text-zinc-500 absolute right-3 top-3" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || !newPassword || !confirmPassword}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Reset Password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
