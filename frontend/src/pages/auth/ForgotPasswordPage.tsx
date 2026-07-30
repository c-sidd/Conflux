import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/api/client";
import { KeyRound, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 text-white p-4">
      <div className="w-full max-w-md space-y-6 bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
        {submitted ? (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Reset Link Dispatched</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              If an account with <strong className="text-slate-200">{email}</strong> exists, you will receive password reset instructions shortly.
            </p>
            <Link to="/login" className="inline-block w-full bg-blue-600 hover:bg-blue-500 text-white py-2 text-xs font-semibold rounded-xl">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Forgot Password?</h1>
              <p className="text-xs text-slate-400">Enter your email to receive a password reset link</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <div className="relative">
                  <Input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-900 border-slate-800 focus:border-blue-500 text-white pr-9"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 text-xs">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Send Reset Link"}
              </Button>
            </form>

            <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
              Remember your password? <Link to="/login" className="text-blue-400 hover:underline font-semibold">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
