import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/api/client";
import { KeyRound, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.post("/api/v1/auth/forgot-password/", { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg-canvas text-text-primary p-4">
      <div className="w-full max-w-md space-y-6 bg-bg-surface border border-border rounded-[var(--radius-2xl)] p-8 shadow-[var(--shadow-xl)] text-center cfx-scale-in">
        {submitted ? (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-[var(--radius-full)] bg-success-light border border-success/20 text-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-[var(--font-size-h3)] font-bold tracking-tight text-text-primary">Reset Link Dispatched</h1>
            <p className="text-[var(--font-size-caption)] text-text-muted leading-relaxed">
              If an account with <strong className="text-text-primary">{email}</strong> exists, you will receive password reset instructions shortly.
            </p>
            <Link to="/login" className="inline-block w-full">
              <Button className="w-full">Back to Sign In</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-primary-light border border-primary/20 text-primary flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-[var(--font-size-h3)] font-bold tracking-tight text-text-primary">Forgot Password?</h1>
              <p className="text-[var(--font-size-caption)] text-text-muted">Enter your email to receive a password reset link</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-[var(--font-size-caption)] bg-danger-light border border-danger/20 text-danger rounded-[var(--radius-lg)] text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-9"
                  />
                  <Mail className="w-4 h-4 text-text-muted absolute right-3 top-2.5" />
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full">
                Send Reset Link
              </Button>
            </form>

            <div className="text-center text-[var(--font-size-caption)] text-text-muted pt-2 border-t border-border-subtle">
              Remember your password? <Link to="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
