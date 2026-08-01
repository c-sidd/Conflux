import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/client";
import { StorageAccount } from "@/types";
import { HardDrive, Plus, RefreshCw, AlertTriangle, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StorageAnalyticsChart } from "@/components/StorageAnalyticsChart";
import cloudConnectIllustration from "@/assets/illustrations/cloud-connect.svg";

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
    <div className="flex-1 p-6 space-y-6 overflow-y-auto cfx-animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[var(--font-size-h3)] font-bold text-text-primary tracking-tight">Storage Accounts & Analytics</h1>
          <p className="text-[var(--font-size-caption)] text-text-muted mt-0.5">Manage connected Google Drive accounts, health status, and pooled capacity</p>
        </div>
        <Button onClick={handleConnectGoogle}>
          <Plus className="w-4 h-4 mr-1.5" /> Connect Google Drive
        </Button>
      </div>

      {loading ? (
        <div className="text-[var(--font-size-caption)] text-text-muted text-center py-12">Loading storage accounts...</div>
      ) : accounts.length === 0 ? (
        <Card className="p-8 text-center space-y-4 max-w-md mx-auto my-12">
          <img src={cloudConnectIllustration} alt="No connected accounts" className="w-48 mx-auto opacity-90" />
          <h3 className="text-[var(--font-size-subtitle)] font-bold text-text-primary">No Storage Accounts Connected</h3>
          <p className="text-[var(--font-size-caption)] text-text-muted">Connect your Google Drive accounts to pool storage capacity into a single drive.</p>
          <Button onClick={handleConnectGoogle} className="mt-2">
            <Plus className="w-4 h-4 mr-1.5" /> Connect First Account
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <StorageAnalyticsChart accounts={accounts} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const percent = acc.total_storage > 0 ? Math.round((acc.used_storage / acc.total_storage) * 100) : 0;
              const isExpired = acc.health_status === "expired_token" || acc.health_status === "unauthorized";

              return (
                <Card key={acc.id} className="p-5 space-y-4 hover:shadow-[var(--shadow-md)]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-[var(--radius-lg)] bg-primary-light text-primary border border-primary/20">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-[var(--font-size-caption)] font-bold text-text-primary">{acc.nickname}</h4>
                        <p className="text-[var(--font-size-label)] text-text-muted truncate max-w-[160px]">{acc.provider_email}</p>
                      </div>
                    </div>
                    <Badge variant={acc.health_status === "healthy" ? "success" : "warning"}>
                      {acc.health_status}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[var(--font-size-label)] font-semibold text-text-muted">
                      <span>Used: {formatSize(acc.used_storage)}</span>
                      <span>Total: {formatSize(acc.total_storage)}</span>
                    </div>
                    <div className="h-2 w-full bg-bg-sunken rounded-[var(--radius-full)] overflow-hidden">
                      <div className="h-full bg-primary rounded-[var(--radius-full)] transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  {isExpired && (
                    <div className="p-2.5 bg-warning-light border border-warning/20 rounded-[var(--radius-lg)] flex items-center justify-between text-[var(--font-size-caption)] text-warning">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Session Expired
                      </span>
                      <Button onClick={handleConnectGoogle} size="sm" variant="secondary" className="h-6 px-2 text-[var(--font-size-label)]">
                        <Link2 className="w-3 h-3 mr-1" /> Reconnect
                      </Button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                    <Button onClick={() => handleSyncQuota(acc.id)} variant="outline" size="sm">
                      <RefreshCw className="w-3 h-3 mr-1" /> Sync Quota
                    </Button>
                    <Button onClick={() => handleDisconnect(acc.id)} variant="ghost" size="sm" className="text-danger hover:bg-danger-light">
                      <Trash2 className="w-3 h-3 mr-1" /> Disconnect
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
