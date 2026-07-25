"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export default function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setError(`You must be logged into ${BRAND.name} to connect storage accounts.`);
      setProcessing(false);
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      setError("No authorization code received from Google.");
      setProcessing(false);
      return;
    }

    const connectAccount = async () => {
      try {
        const redirectUri = `${window.location.origin}/dashboard/storage/callback`;
        
        await fetchApi("/api/v1/storage/accounts/connect-oauth/", {
          method: "POST",
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
            nickname: "Google Drive"
          })
        });
        
        router.push("/dashboard/storage");
      } catch (err: any) {
        console.error("Failed to link storage account:", err);
        setError(err.message || "Failed to link storage account.");
        setProcessing(false);
      }
    };

    connectAccount();
  }, [loading, user, searchParams, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC] text-slate-900 p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-6 shadow-sm">
        {processing ? (
          <>
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <h1 className="text-xl font-extrabold text-slate-900">Linking Google Drive Account</h1>
            <p className="text-slate-500 text-xs">Exchanging authorization credentials and initializing {BRAND.workspaceFolder} workspace root folder...</p>
          </>
        ) : error ? (
          <>
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-extrabold text-slate-900">Connection Failed</h1>
            <p className="text-slate-600 text-xs leading-relaxed">{error}</p>
            <Button onClick={() => router.push(!user ? "/" : "/dashboard/storage")} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-xs">
              {!user ? `Log in to ${BRAND.name}` : "Back to Storage Accounts"}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
