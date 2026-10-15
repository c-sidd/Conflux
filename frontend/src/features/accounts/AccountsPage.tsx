import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { ConnectedAccount } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyAccountsIllustration } from '../../components/ui/Illustrations';
import {
  AlertCircle,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [disconnectingAccount, setDisconnectingAccount] = useState<ConnectedAccount | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.list(),
  });

  const connectMutation = useMutation({
    mutationFn: () => api.accounts.authorizeGoogle(),
    onSuccess: (data) => {
      // Redirect to Google OAuth authorization URL
      window.location.href = data.authorization_url;
    },
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: string) => api.accounts.sync(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) => api.accounts.disconnect(accountId),
    onSuccess: () => {
      setDisconnectingAccount(null);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const formatBytes = (bytes: number | null) => {
    if (bytes === null || bytes === undefined) return 'Unknown';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const getQuotaPercentage = (used: number | null, total: number | null) => {
    if (!used || !total || total === 0) return 0;
    return Math.min(100, Math.round((used / total) * 100));
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Connected Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your connected Google Drive storage accounts.
          </p>
        </div>
        <Button
          onClick={() => connectMutation.mutate()}
          isLoading={connectMutation.isPending}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Connect Google Account
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full"></div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 mt-6 p-8 flex flex-col items-center">
          <EmptyAccountsIllustration className="w-48 h-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No Google Accounts Connected</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            Connect your first Google Drive account to start viewing, browsing, and organizing all your files in one place.
          </p>
          <Button onClick={() => connectMutation.mutate()} isLoading={connectMutation.isPending} size="lg">
            Connect Your First Google Drive
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {accounts.map((acc) => {
            const quotaPct = getQuotaPercentage(acc.quota.quota_used_bytes, acc.quota.quota_total_bytes);
            return (
              <div
                key={acc.id}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {acc.email ? acc.email[0].toUpperCase() : 'G'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm truncate max-w-[200px]" title={acc.email || ''}>
                          {acc.email || 'Google Account'}
                        </h4>
                        <span className="text-xs text-slate-400">Google Drive Storage</span>
                      </div>
                    </div>
                    {acc.connection_status === 'CONNECTED' ? (
                      <Badge variant="success">Connected</Badge>
                    ) : acc.connection_status === 'NEEDS_REAUTH' ? (
                      <Badge variant="warning">Needs Attention</Badge>
                    ) : (
                      <Badge variant="danger">Error</Badge>
                    )}
                  </div>

                  {/* Storage Quota bar */}
                  <div className="mt-6 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Storage Used</span>
                      <span className="font-medium text-slate-900">
                        {formatBytes(acc.quota.quota_used_bytes)} / {formatBytes(acc.quota.quota_total_bytes)} ({quotaPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          quotaPct > 90 ? 'bg-red-500' : quotaPct > 75 ? 'bg-amber-500' : 'bg-brand-600'
                        }`}
                        style={{ width: `${quotaPct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span>
                      Last Synced:{' '}
                      {acc.last_successful_sync_at
                        ? new Date(acc.last_successful_sync_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Never'}
                    </span>
                    {acc.quota.quota_observed_at && (
                      <span>Updated {new Date(acc.quota.quota_observed_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-brand-600"
                    onClick={() => syncMutation.mutate(acc.id)}
                    isLoading={syncMutation.isPending && syncMutation.variables === acc.id}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Sync Now
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => setDisconnectingAccount(acc)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Disconnect
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      <Modal
        isOpen={!!disconnectingAccount}
        onClose={() => setDisconnectingAccount(null)}
        title="Disconnect Google Account"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">Are you sure you want to disconnect this account?</p>
              <p className="mt-1 text-xs text-amber-700">
                Conflux will immediately cease accessing <span className="font-medium">{disconnectingAccount?.email}</span>. Existing files in Google Drive will remain completely untouched.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDisconnectingAccount(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => disconnectingAccount && disconnectMutation.mutate(disconnectingAccount.id)}
              isLoading={disconnectMutation.isPending}
            >
              Disconnect Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
