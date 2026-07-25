"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchApi } from "@/lib/api";
import { Loader2, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export default function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [canForceRelink, setCanForceRelink] = useState(false);
  const [processing, setProcessing] = useState(true);

  const connectAccount = async (forceRelink = false) => {
    setProcessing(true);
    setError(null);
    try {
      const code = searchParams.get("code");
      if (!code) throw new Error("No authorization code received from Google.");

      const redirectUri = `${window.location.origin}/dashboard/storage/callback`;
      
      await fetchApi("/api/v1/storage/accounts/connect-oauth/", {
        method: "POST",
        body: JSON.stringify({
          code,
          redirect_uri: redirectUri,
          nickname: "Google Drive",
          force_relink: forceRelink
        })
      });
      
      router.push("/dashboard/storage");
    } catch (err: any) {
      console.error("Failed to link storage account:", err);
      setError(err.message || "Failed to link storage account.");
      if (err.can_force_relink || err.message?.includes("already linked")) {
        setCanForceRelink(true);
      }
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setError(`You must be logged into ${BRAND.name} to connect storage accounts.`);
      setProcessing(false);
      return;
    }

    connectAccount(false);
  }, [loading, user, searchParams, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC] text-slate-900 p-4 font-sans antialiased">
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
            
            <div className="space-y-2 pt-2">
              {canForceRelink && (
                <Button 
                  onClick={() => connectAccount(true)} 
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Transfer Drive to Current Account
                </Button>
              )}
              
              <Button 
                onClick={() => router.push(!user ? "/" : "/dashboard/storage")} 
                variant="outline" 
                className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs py-2.5 rounded-xl"
              >
                {!user ? `Log in to ${BRAND.name}` : "Back to Storage Accounts"}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
