import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/client";
import { StorageAccount } from "@/types";
import { HardDrive, Plus, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function StoragePage() {
  const [accounts, setAccounts] = useState<StorageAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    try {
      const res = await apiClient.get("/api/v1/storage/accounts/");
      setAccounts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const redirectUri = `${window.location.origin}/dashboard/storage/callback`;
      const res = await apiClient.get(`/api/v1/storage/accounts/google-auth-url/?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (e: any) {
      alert(e.message || "Failed to generate Google Auth URL");
    }
  };

  const handleSyncQuota = async (id: number) => {
    try {
      await apiClient.post(`/api/v1/storage/accounts/${id}/sync-quota/`);
      loadAccounts();
    } catch (e: any) {
      alert(e.message || "Failed to sync quota");
    }
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm("Are you sure you want to disconnect this storage account?")) return;
    try {
      await apiClient.delete(`/api/v1/storage/accounts/${id}/`);
      loadAccounts();
    } catch (e: any) {
      alert(e.message || "Failed to disconnect account");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 GB";
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1) + " GB";
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Storage Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage connected Google Drive accounts, health status, and pooled capacity</p>
        </div>
        <Button onClick={handleConnectGoogle} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
          <Plus className="w-4 h-4 mr-1.5" /> Connect Google Drive
        </Button>
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 text-center py-12">Loading storage accounts...</div>
      ) : accounts.length === 0 ? (
        <Card className="p-8 text-center space-y-3 max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <HardDrive className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Storage Accounts Connected</h3>
          <p className="text-xs text-slate-500">Connect a Google Drive account to start pooling storage space.</p>
          <Button onClick={handleConnectGoogle} className="bg-blue-600 hover:bg-blue-700 text-white text-xs mt-2">
            <Plus className="w-4 h-4 mr-1.5" /> Connect First Account
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const percent = acc.total_storage > 0 ? Math.round((acc.used_storage / acc.total_storage) * 100) : 0;
            const isExpired = acc.health_status === "expired_token" || acc.health_status === "unauthorized";

            return (
              <Card key={acc.id} className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{acc.nickname}</h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-[160px]">{acc.provider_email}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    acc.health_status === "healthy" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                  }`}>
                    {acc.health_status}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Used: {formatSize(acc.used_storage)}</span>
                    <span>Total: {formatSize(acc.total_storage)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>

                {isExpired && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Session Expired
                    </span>
                    <Button onClick={handleConnectGoogle} size="sm" className="h-6 px-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white">
                      <Link2 className="w-3 h-3 mr-1" /> Reconnect
                    </Button>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Button onClick={() => handleSyncQuota(acc.id)} variant="outline" size="sm" className="text-[11px]">
                    <RefreshCw className="w-3 h-3 mr-1" /> Sync Quota
                  </Button>
                  <Button onClick={() => handleDisconnect(acc.id)} variant="ghost" size="sm" className="text-[11px] text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3 h-3 mr-1" /> Disconnect
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
