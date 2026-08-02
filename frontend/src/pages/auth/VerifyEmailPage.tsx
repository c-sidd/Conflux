import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { CheckCircle2, AlertCircle } from "lucide-react";
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
        const serverMsg = err?.response?.data?.message || err?.response?.data?.detail || err?.message;
        setMessage(serverMsg || "Verification failed or token expired.");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg-canvas text-text-primary p-4">
      <div className="w-full max-w-md space-y-6 bg-bg-surface border border-border rounded-[var(--radius-2xl)] p-8 shadow-[var(--shadow-xl)] text-center cfx-scale-in">
        {loading ? (
          <div className="py-8 space-y-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-[var(--radius-full)] cfx-spin mx-auto" />
            <p className="text-[var(--font-size-caption)] text-text-muted">Verifying email address...</p>
          </div>
        ) : success ? (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-[var(--radius-full)] bg-success-light border border-success/20 text-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-[var(--font-size-h3)] font-bold tracking-tight text-text-primary">Email Verified!</h1>
            <p className="text-[var(--font-size-caption)] text-text-muted leading-relaxed">{message}</p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Go to Workspace
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-[var(--radius-full)] bg-danger-light border border-danger/20 text-danger flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-[var(--font-size-h3)] font-bold tracking-tight text-text-primary">Verification Failed</h1>
            <p className="text-[var(--font-size-caption)] text-text-muted leading-relaxed">{message}</p>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full">
              Return to Workspace
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
