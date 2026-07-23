"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchApi } from "@/lib/api";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Wait for NextAuth to establish session authentication first
    if (status === "loading") return;

    if (status === "unauthenticated") {
      setError("You must be logged into DCS to connect storage accounts.");
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
        console.error(err);
        setError(err.message || "Failed to link storage account.");
        setProcessing(false);
      }
    };

    connectAccount();
  }, [status, searchParams, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
        {processing ? (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
            <h1 className="text-xl font-bold">Linking Google Drive Account</h1>
            <p className="text-zinc-400 text-sm">Please wait while we exchange credentials and synchronize storage quotas.</p>
          </>
        ) : error ? (
          <>
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-red-400">Connection Failed</h1>
            <p className="text-zinc-400 text-sm">{error}</p>
            <Button onClick={() => router.push(status === "unauthenticated" ? "/" : "/dashboard/storage")} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">
              {status === "unauthenticated" ? "Log in to DCS" : "Back to Storage Accounts"}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
