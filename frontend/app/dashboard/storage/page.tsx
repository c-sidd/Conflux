"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { HardDrive, Plus, RefreshCw, Trash2, Edit2, Check, X, ShieldAlert, Loader2, Info, AlertTriangle } from "lucide-react";
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
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Guided removal step states
  const [removalStep, setRemovalStep] = useState<"SELECT" | "CONFIRM_PURGE">("SELECT");
  const [confirmText, setConfirmText] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      const data = await fetchApi("/api/storage/accounts/");
      setAccounts(data);
    } catch (e) {
      console.error("Failed to load accounts", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const formatStorage = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 GB";
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const handleConnectGoogle = () => {
    const clientId = "819289186607-o1kr7vq1vnacd6ef79664skvao6euol0.apps.googleusercontent.com";
    const redirectUri = `${window.location.origin}/dashboard/storage/callback`;
    const scope = "openid email profile https://www.googleapis.com/auth/drive";
    
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=select_account%20consent`;
      
    window.location.href = oauthUrl;
  };

  const openDisconnectModal = async (account: any) => {
    setLoadingPreview(true);
    setDisconnectModalOpen(true);
    setRemovalStep("SELECT");
    setConfirmText("");
    setConfirmChecked(false);
    setErrorMessage(null);

    try {
      const preview = await fetchApi(`/api/storage/accounts/${account.id}/disconnect-preview/`);
      setDisconnectPreview(preview);
    } catch (e) {
      console.error("Failed to fetch disconnect preview", e);
      setDisconnectPreview({
        account_id: account.id,
        nickname: account.nickname,
        provider_email: account.provider_email,
        file_count: 0,
        folder_count: 0,
        used_storage: account.used_storage,
        workspace_folder_name: "DCS_Workspace"
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Case 1 & Option 1: Disconnect Only
  const handleDisconnectOnly = async () => {
    if (!disconnectPreview) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchApi(`/api/storage/accounts/${disconnectPreview.account_id}/?mode=disconnect_only`, {
        method: "DELETE",
      });
      alert(res.message || "Storage account disconnected. Files remain safely stored in Google Drive.");
      setDisconnectModalOpen(false);
      setDisconnectPreview(null);
      loadAccounts();
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to disconnect account.");
    } finally {
      setActionLoading(false);
    }
  };

  // Option 2: Delete Workspace & Disconnect (Destructive)
  const handlePurgeAndDisconnect = async () => {
    if (!disconnectPreview) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchApi(`/api/storage/accounts/${disconnectPreview.account_id}/purge-and-disconnect/`, {
        method: "POST",
      });
      alert(res.message || "DCS Workspace deleted successfully. Storage account disconnected.");
      setDisconnectModalOpen(false);
      setDisconnectPreview(null);
      loadAccounts();
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to delete DCS Workspace from Google Drive.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRename = async (id: number) => {
    if (!editNickname.trim()) return;
    try {
      await fetchApi(`/api/storage/accounts/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ nickname: editNickname }),
      });
      setEditingId(null);
      loadAccounts();
    } catch (e) {
      alert("Failed to rename account");
    }
  };

  const handleTestConnection = async (id: number) => {
    setTestingId(id);
    try {
      const res = await fetchApi(`/api/storage/accounts/${id}/test-connection/`, { method: "POST" });
      alert(res.message);
      loadAccounts();
    } catch (e: any) {
      alert(e.message || "Failed to test connection");
      loadAccounts();
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncQuota = async (id: number) => {
    setSyncingId(id);
    try {
      await fetchApi(`/api/storage/accounts/${id}/sync-quota/`, { method: "POST" });
      loadAccounts();
    } catch (e) {
      alert("Failed to sync quota");
    } finally {
      setSyncingId(null);
    }
  };

  const getHealthBadgeColor = (status: string) => {
    switch (status) {
      case "healthy": return "bg-green-500/10 text-green-400 border-green-500/20";
      case "quota_full": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "expired_token":
      case "unauthorized": return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const isDeleteConfirmed = confirmText.trim() === "DELETE" || confirmChecked;

  return (
    <div className="flex-1 overflow-auto p-8 z-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Storage Accounts</h2>
          <p className="text-zinc-400 text-sm mt-1">Connect and manage cloud drives that power DCS</p>
        </div>
        <Button onClick={handleConnectGoogle} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg cursor-pointer">
          <Plus className="w-4 h-4 mr-2" />
          Connect Google Drive
        </Button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
          <HardDrive className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No storage accounts connected</h3>
          <p className="text-zinc-500 mb-6">Connect at least one Google Drive account to start storing files.</p>
          <Button onClick={handleConnectGoogle} className="bg-blue-600 hover:bg-blue-700 text-white">
            Connect First Account
          </Button>
        </div>
      ) : (
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                <th className="p-4 font-semibold">Nickname</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Provider</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 font-semibold">Used</th>
                <th className="p-4 font-semibold">Remaining</th>
                <th className="p-4 font-semibold">Health</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {accounts.map(acc => (
                <tr key={acc.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="p-4 font-medium text-zinc-200">
                    {editingId === acc.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editNickname}
                          onChange={(e) => setEditNickname(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-white h-8 w-40"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400" onClick={() => handleRename(acc.id)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{acc.nickname}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => {
                          setEditingId(acc.id);
                          setEditNickname(acc.nickname);
                        }}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-zinc-400 text-sm">{acc.provider_email}</td>
                  <td className="p-4 text-zinc-500 text-sm capitalize">{acc.provider}</td>
                  <td className="p-4 text-zinc-400 text-sm">{formatStorage(acc.total_storage)}</td>
                  <td className="p-4 text-zinc-400 text-sm">{formatStorage(acc.used_storage)}</td>
                  <td className="p-4 text-zinc-400 text-sm">{formatStorage(acc.free_storage)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getHealthBadgeColor(acc.health_status)}`}>
                      {acc.health_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-white"
                      disabled={testingId === acc.id}
                      onClick={() => handleTestConnection(acc.id)}
                    >
                      {testingId === acc.id ? "Testing..." : "Test Health"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-white"
                      disabled={syncingId === acc.id}
                      onClick={() => handleSyncQuota(acc.id)}
                    >
                      {syncingId === acc.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openDisconnectModal(acc)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Guided Safe Removal Workflow Modal */}
      {disconnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            {loadingPreview ? (
              <div className="py-12 text-center text-zinc-400 space-y-3">
                <Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-500" />
                <p className="text-sm font-medium">Analyzing storage account contents...</p>
              </div>
            ) : disconnectPreview ? (
              <>
                {/* CASE 1: NO DCS MANAGED FILES */}
                {disconnectPreview.file_count === 0 ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3 text-blue-400">
                      <Info className="w-7 h-7 flex-shrink-0" />
                      <div>
                        <h3 className="text-lg font-bold text-white">Disconnect Storage Account</h3>
                        <p className="text-xs text-zinc-400">{disconnectPreview.provider_email}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-sm space-y-2">
                      <p className="text-zinc-300 font-medium">This storage account contains no DCS-managed files.</p>
                      <p className="text-zinc-500 text-xs">You can safely disconnect this account without affecting any files.</p>
                    </div>

                    {errorMessage && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                        {errorMessage}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => setDisconnectModalOpen(false)}
                        className="flex-1 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={actionLoading}
                        onClick={handleDisconnectOnly}
                        className="flex-1 bg-red-600 hover:bg-red-500 font-semibold"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Disconnect"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* CASE 2: DCS MANAGED FILES EXIST */
                  <>
                    {removalStep === "SELECT" ? (
                      <div className="space-y-5">
                        <div className="flex items-center gap-3 text-amber-400">
                          <ShieldAlert className="w-8 h-8 flex-shrink-0" />
                          <div>
                            <h3 className="text-lg font-bold text-white">Storage Account Contains Data</h3>
                            <p className="text-xs text-zinc-400">This Google Drive account still contains DCS-managed files.</p>
                          </div>
                        </div>

                        {/* Account Summary Metrics */}
                        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-xs space-y-2.5">
                          <div className="flex justify-between border-b border-zinc-850 pb-2">
                            <span className="text-zinc-400">Provider Email:</span>
                            <span className="font-semibold text-zinc-200">{disconnectPreview.provider_email}</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-850 pb-2">
                            <span className="text-zinc-400">Active Files:</span>
                            <span className="font-bold text-amber-400">{disconnectPreview.file_count} files</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-850 pb-2">
                            <span className="text-zinc-400">Folders:</span>
                            <span className="font-bold text-blue-400">{disconnectPreview.folder_count} folders</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Storage Used:</span>
                            <span className="font-bold text-purple-400">{formatStorage(disconnectPreview.used_storage)}</span>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Removing this storage account without deleting the workspace will leave those files in Google Drive but {BRAND.name} will no longer manage them. Choose one of the following options:
                        </p>

                        {/* Guided Removal Options */}
                        <div className="space-y-3">
                          {/* OPTION 1 */}
                          <div
                            onClick={handleDisconnectOnly}
                            className="p-4 bg-zinc-950 hover:bg-zinc-850 border border-blue-500/30 rounded-2xl cursor-pointer transition-all space-y-1 group"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-blue-400 text-sm">Option 1: Disconnect Only</span>
                              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                                Recommended
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-normal">
                              Remove storage account from {BRAND.name}. {BRAND.workspaceFolder} workspace and all files remain untouched in Google Drive. You can reconnect later to restore management.
                            </p>
                          </div>

                          {/* OPTION 2 */}
                          <div
                            onClick={() => setRemovalStep("CONFIRM_PURGE")}
                            className="p-4 bg-zinc-950 hover:bg-red-950/20 border border-red-500/30 rounded-2xl cursor-pointer transition-all space-y-1 group"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-red-400 text-sm">Option 2: Delete {BRAND.workspaceFolder} Workspace & Disconnect</span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-normal">
                              Permanently delete <code className="text-red-300">{BRAND.workspaceFolder}</code> workspace and all files inside it on Google Drive, then remove the storage account. Never touches any other Google Drive files.
                            </p>
                          </div>
                        </div>

                        {errorMessage && (
                          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                            {errorMessage}
                          </div>
                        )}

                        <div className="pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDisconnectModalOpen(false)}
                            className="w-full border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                          >
                            Option 3: Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* STEP 2: CONFIRMATION FOR DESTRUCTIVE PURGE */
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-red-400">
                          <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                          <div>
                            <h3 className="text-lg font-bold text-white">Confirm Workspace Deletion</h3>
                            <p className="text-xs text-red-300">Permanent deletion of Google Drive files</p>
                          </div>
                        </div>

                        <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl space-y-2 text-xs text-red-200">
                          <p className="font-semibold">
                            Warning: {BRAND.name} Workspace (<code className="text-white bg-red-950 px-1 py-0.5 rounded">{BRAND.workspaceFolder}</code>) and all {disconnectPreview.file_count} managed files inside it will be PERMANENTLY deleted from Google Drive.
                          </p>
                          <p className="text-zinc-400">This action cannot be undone.</p>
                        </div>

                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1">
                              Type <strong className="text-white">DELETE</strong> to confirm:
                            </label>
                            <Input
                              type="text"
                              value={confirmText}
                              onChange={(e) => setConfirmText(e.target.value)}
                              placeholder="Type DELETE"
                              className="bg-zinc-950 border-zinc-800 text-white font-mono text-sm"
                            />
                          </div>

                          <div className="flex items-start gap-2 pt-1">
                            <input
                              type="checkbox"
                              id="confirm-check"
                              checked={confirmChecked}
                              onChange={(e) => setConfirmChecked(e.target.checked)}
                              className="mt-0.5 accent-red-500 cursor-pointer"
                            />
                            <label htmlFor="confirm-check" className="text-xs text-zinc-300 cursor-pointer select-none leading-normal">
                              I understand that DCS Workspace and all managed files will be permanently deleted.
                            </label>
                          </div>
                        </div>

                        {errorMessage && (
                          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                            {errorMessage}
                          </div>
                        )}

                        <div className="flex gap-3 pt-3">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => setRemovalStep("SELECT")}
                            className="flex-1 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                          >
                            Back
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={!isDeleteConfirmed || actionLoading}
                            onClick={handlePurgeAndDisconnect}
                            className="flex-1 bg-red-600 hover:bg-red-500 font-semibold"
                          >
                            {actionLoading ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Purging Drive...
                              </span>
                            ) : (
                              "Permanently Delete & Disconnect"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
