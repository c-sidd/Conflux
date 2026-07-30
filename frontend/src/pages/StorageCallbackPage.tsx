import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "@/api/client";
import { Loader2, ShieldAlert } from "lucide-react";
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
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-6 shadow-sm">
        {loading ? (
          <>
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <h1 className="text-xl font-extrabold text-slate-900">Linking Google Drive Account</h1>
            <p className="text-slate-500 text-xs">Exchanging authorization credentials and initializing workspace root folder...</p>
          </>
        ) : (
          <>
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-extrabold text-slate-900">Connection Failed</h1>
            <p className="text-slate-600 text-xs leading-relaxed">{error}</p>
            <Button onClick={() => navigate("/dashboard/storage")} className="w-full bg-blue-600 text-white text-xs py-2 rounded-xl">
              Back to Storage Accounts
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
