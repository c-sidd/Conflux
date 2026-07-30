import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { MailCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setMessage("Verification token is missing in URL.");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await apiClient.post("/api/v1/auth/verify-email/", { token });
        setSuccess(true);
        setMessage(res.data.message || "Your email address has been verified!");
      } catch (err: any) {
        setSuccess(false);
        setMessage(err.message || "Verification failed or token expired.");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 text-white p-4">
      <div className="w-full max-w-md space-y-6 bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
        {loading ? (
          <div className="py-8 space-y-3">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Verifying email address...</p>
          </div>
        ) : success ? (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Email Verified!</h1>
            <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
            <Button onClick={() => navigate("/dashboard")} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 text-xs">
              Go to Workspace
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Verification Failed</h1>
            <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
            <Button onClick={() => navigate("/dashboard")} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 text-xs">
              Return to Workspace
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
