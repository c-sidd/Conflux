"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/auth/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to request password reset.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 text-white p-4">
      <div className="w-full max-w-md space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to sign in
        </Link>

        {submitted ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Check Your Email</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              If an account with <strong className="text-zinc-200">{email}</strong> exists, we’ve sent instructions to reset your password.
            </p>
            <p className="text-xs text-zinc-500 pt-2">
              Didn't receive an email? Check your spam folder or try requesting again in a few minutes.
            </p>
            <Button
              onClick={() => { setSubmitted(false); setEmail(""); }}
              className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              Try another email
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Forgot Password?</h1>
              <p className="text-sm text-zinc-400">
                Enter your account email address and we'll send you a secure link to reset your password.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Email address</label>
                <Input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 focus:border-blue-500 text-white"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Send Reset Instructions"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
