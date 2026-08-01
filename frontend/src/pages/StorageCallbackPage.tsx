import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "@/api/client";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StorageCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Authorization code is missing from Google redirect.");
      setLoading(false);
      return;
    }

    const connectStorage = async () => {
      try {
        const redirectUri = `${window.location.origin}/dashboard/storage/callback`;
        await apiClient.post("/api/v1/storage/accounts/connect-oauth/", {
          code,
          redirect_uri: redirectUri,
          nickname: "Google Drive",
        });
        navigate("/dashboard/storage");
      } catch (err: any) {
        setError(err.message || "Failed to link storage account.");
        setLoading(false);
      }
    };

    connectStorage();
  }, [searchParams, navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg-canvas p-4">
      <div className="max-w-md w-full bg-bg-surface border border-border rounded-[var(--radius-2xl)] p-8 text-center space-y-6 shadow-[var(--shadow-lg)] cfx-scale-in">
        {loading ? (
          <>
            <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-[var(--radius-full)] cfx-spin mx-auto" />
            <h1 className="text-[var(--font-size-h3)] font-extrabold text-text-primary">Linking Google Drive Account</h1>
            <p className="text-text-muted text-[var(--font-size-caption)]">Exchanging authorization credentials and initializing workspace root folder...</p>
          </>
        ) : (
          <>
            <ShieldAlert className="w-12 h-12 text-danger mx-auto" />
            <h1 className="text-[var(--font-size-h3)] font-extrabold text-text-primary">Connection Failed</h1>
            <p className="text-text-secondary text-[var(--font-size-caption)] leading-relaxed">{error}</p>
            <Button onClick={() => navigate("/dashboard/storage")} className="w-full">
              Back to Storage Accounts
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
