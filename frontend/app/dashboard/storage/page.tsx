"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { HardDrive, Plus, RefreshCw, Trash2, Edit2, Check, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function StorageAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [testingId, setTestingId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

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
    if (bytes === 0) return "0 GB";
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const handleConnectGoogle = () => {
    const clientId = "819289186607-o1kr7vq1vnacd6ef79664skvao6euol0.apps.googleusercontent.com";
    const redirectUri = `${window.location.origin}/dashboard/storage/callback`;
    const scope = "openid email profile https://www.googleapis.com/auth/drive.file";
    
    // Force consent and account selection to ensure refresh token is always returned
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=select_account%20consent`;
      
    window.location.href = oauthUrl;
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm("Are you sure you want to disconnect this storage account? This will not delete files from Google Drive, but DCS will no longer manage them.")) return;
    try {
      await fetchApi(`/api/storage/accounts/${id}/`, { method: "DELETE" });
      loadAccounts();
    } catch (e) {
      alert("Failed to disconnect account");
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

  return (
    <div className="flex-1 overflow-auto p-8 z-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Storage Accounts</h2>
          <p className="text-zinc-400 text-sm mt-1">Connect and manage the cloud drives that power DCS</p>
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
          <p className="text-zinc-500 mb-6">You must connect at least one Google Drive account to start storing files.</p>
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
                      onClick={() => handleDisconnect(acc.id)}
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
    </div>
  );
}
