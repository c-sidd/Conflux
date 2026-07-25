"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { HardDrive, Plus, RefreshCw, Trash2, Edit2, Check, X, ShieldAlert, Loader2, Info, AlertTriangle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BRAND } from "@/lib/brand";

export default function StorageAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [testingId, setTestingId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // Safe Disconnection Modal states
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [disconnectPreview, setDisconnectPreview] = useState<any | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [removalStep, setRemovalStep] = useState<"CHOICE" | "CONFIRM_PURGE">("CHOICE");
  const [confirmText, setConfirmText] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      const data = await fetchApi("/api/v1/storage/accounts/");
      setAccounts(data);
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
      const res: any = await fetchApi(`/api/v1/storage/accounts/google-auth-url/?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (e: any) {
      alert(e.message || "Failed to generate Google Auth URL");
    }
  };

  const handleTestConnection = async (id: number) => {
    setTestingId(id);
    try {
      const res: any = await fetchApi(`/api/v1/storage/accounts/${id}/test-connection/`, { method: "POST" });
      alert(`Account Health: ${res.status.toUpperCase()} (${res.provider})`);
      loadAccounts();
    } catch (e: any) {
      alert(e.message || "Test connection failed");
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncQuota = async (id: number) => {
    setSyncingId(id);
    try {
      await fetchApi(`/api/v1/storage/accounts/${id}/sync-quota/`, { method: "POST" });
      loadAccounts();
    } catch (e: any) {
      alert(e.message || "Quota sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  const openDisconnectModal = async (account: any) => {
    setSelectedAccount(account);
    setDisconnectModalOpen(true);
    setLoadingPreview(true);
    setRemovalStep("CHOICE");
    setConfirmText("");
    setConfirmChecked(false);
    setErrorMessage(null);

    try {
      const preview = await fetchApi(`/api/v1/storage/accounts/${account.id}/disconnect-preview/`);
      setDisconnectPreview(preview);
    } catch (e: any) {
      setErrorMessage("Failed to load disconnect analysis");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDisconnectOnly = async () => {
    if (!selectedAccount) return;
    setDisconnecting(true);
    try {
      await fetchApi(`/api/v1/storage/accounts/${selectedAccount.id}/disconnect-only/`, { method: "POST" });
      setDisconnectModalOpen(false);
      loadAccounts();
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to disconnect account");
    } finally {
      setDisconnecting(false);
    }
  };

  const handlePurgeAndDisconnect = async () => {
    if (!selectedAccount) return;
    if (confirmText !== "DELETE" || !confirmChecked) {
      setErrorMessage("Please type DELETE and check the warning box");
      return;
    }
    setDisconnecting(true);
    try {
      await fetchApi(`/api/v1/storage/accounts/${selectedAccount.id}/purge-and-disconnect/`, { method: "POST" });
      setDisconnectModalOpen(false);
      loadAccounts();
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to delete workspace and disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const formatStorage = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 GB";
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <HardDrive className="w-6 h-6 text-blue-600" /> Storage Accounts
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage connected cloud storage providers powering your unified pool.</p>
        </div>
        <Button
          onClick={handleConnectGoogle}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Connect Google Drive
        </Button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : accounts.length === 0 ? (
        <Card className="bg-white border-slate-200 p-12 text-center space-y-4 rounded-2xl shadow-2xs">
          <HardDrive className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Storage Accounts Connected</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Connect your first Google Drive account to activate storage pooling.</p>
          </div>
          <Button onClick={handleConnectGoogle} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl">
            Connect Google Drive
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => {
            const usedPct = acc.total_storage > 0 ? (acc.used_storage / acc.total_storage * 100) : 0;
            return (
              <Card key={acc.id} className="bg-white border-slate-200 p-5 space-y-4 rounded-2xl shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <HardDrive className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{acc.nickname}</h4>
                      <p className="text-xs text-slate-500">{acc.provider_email}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${acc.health_status === 'healthy' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {acc.health_status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Storage Usage</span>
                    <span className="text-slate-900 font-mono">{formatStorage(acc.used_storage)} / {formatStorage(acc.total_storage)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${usedPct}%` }}></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-200 text-slate-700 text-xs h-8"
                      disabled={testingId === acc.id}
                      onClick={() => handleTestConnection(acc.id)}
                    >
                      {testingId === acc.id ? "Testing..." : "Test Health"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-200 text-slate-700 text-xs h-8"
                      disabled={syncingId === acc.id}
                      onClick={() => handleSyncQuota(acc.id)}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncingId === acc.id ? 'animate-spin' : ''}`} /> Sync
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 h-8 text-xs font-semibold"
                    onClick={() => openDisconnectModal(acc)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Disconnect
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Guided Safe Account Removal Modal */}
      {disconnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            {loadingPreview ? (
              <div className="py-12 text-center text-slate-500 space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-semibold">Analyzing storage dependencies...</p>
              </div>
            ) : disconnectPreview ? (
              disconnectPreview.file_count === 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-3">
                    <Info className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-bold">Disconnect Storage Account</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This storage account contains no {BRAND.name}-managed files. You can safely disconnect it immediately.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setDisconnectModalOpen(false)} className="flex-1 border-slate-200 text-slate-600 text-xs">
                      Cancel
                    </Button>
                    <Button onClick={handleDisconnectOnly} disabled={disconnecting} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">
                      {disconnecting ? "Disconnecting..." : "Disconnect Immediately"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-bold">Guided Safe Account Removal</h3>
                  </div>

                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between text-slate-700">
                      <span>Files Managed:</span>
                      <span className="font-bold text-amber-700">{disconnectPreview.file_count} files</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Folders:</span>
                      <span className="font-bold text-blue-700">{disconnectPreview.folder_count} folders</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Storage Used:</span>
                      <span className="font-bold text-purple-700">{formatStorage(disconnectPreview.used_storage)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Choose one of the following guided options for removing <strong>{selectedAccount?.nickname}</strong>:
                  </p>

                  <div className="space-y-2.5 text-xs">
                    <div
                      onClick={handleDisconnectOnly}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-blue-200 rounded-xl cursor-pointer transition-all space-y-1"
                    >
                      <span className="font-bold text-blue-700 block">Option 1: Disconnect Only (Recommended)</span>
                      <p className="text-slate-500 leading-normal text-[11px]">
                        Unlinks account from {BRAND.name}. {BRAND.workspaceFolder} workspace folder remains safe on Google Drive.
                      </p>
                    </div>

                    <div
                      onClick={() => setRemovalStep("CONFIRM_PURGE")}
                      className="p-3.5 bg-slate-50 hover:bg-red-50 border border-red-200 rounded-xl cursor-pointer transition-all space-y-1"
                    >
                      <span className="font-bold text-red-600 block">Option 2: Permanent Purge & Disconnect</span>
                      <p className="text-slate-500 leading-normal text-[11px]">
                        Permanently deletes <code className="text-red-700 font-mono">{BRAND.workspaceFolder}</code> on Google Drive before unlinking.
                      </p>
                    </div>
                  </div>

                  <Button variant="outline" onClick={() => setDisconnectModalOpen(false)} className="w-full border-slate-200 text-slate-600 text-xs">
                    Cancel
                  </Button>
                </div>
              )
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
