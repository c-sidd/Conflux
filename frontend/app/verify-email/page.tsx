"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MailCheck, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setMessage("Verification token is missing in URL.");
      return;
    }

    const doVerify = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/auth/verify-email/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Email verification failed.");
        }

        setSuccess(true);
        setMessage("Your email address has been verified successfully!");
      } catch (err: any) {
        setMessage(err.message || "An unexpected error occurred.");
      } finally {
        setVerifying(false);
      }
    };

    doVerify();
  }, [token]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 text-white p-4">
      <div className="w-full max-w-md space-y-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
        {verifying ? (
          <div className="py-8 space-y-3">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
            <h1 className="text-xl font-semibold">Verifying Email Address</h1>
            <p className="text-sm text-zinc-400">Please wait while we confirm your credentials...</p>
          </div>
        ) : success ? (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Email Verified!</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-4"
            >
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Verification Failed</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white mt-4"
            >
              Return to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
