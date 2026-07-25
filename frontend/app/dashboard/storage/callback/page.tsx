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
        
        await fetchApi("/api/storage/accounts/connect-oauth/", {
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
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
        {processing ? (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
            <h1 className="text-xl font-bold">Linking Google Drive Account</h1>
            <p className="text-zinc-400 text-sm">Exchanging authorization credentials and setting up {BRAND.workspaceFolder} workspace root folder...</p>
          </>
        ) : error ? (
          <>
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-red-400">Connection Failed</h1>
            <p className="text-zinc-400 text-sm">{error}</p>
            <Button onClick={() => router.push(!user ? "/" : "/dashboard/storage")} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">
              {!user ? `Log in to ${BRAND.name}` : "Back to Storage Accounts"}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
