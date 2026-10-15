import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { TrashItem } from '../../types';
import { AccountBadge } from '../../components/ui/AccountBadge';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyTrashIllustration } from '../../components/ui/Illustrations';
import { AlertCircle, RotateCcw } from 'lucide-react';

export const TrashPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [deletingPermanentlyItem, setDeletingPermanentlyItem] = useState<TrashItem | null>(null);

  const { data: trashItems = [], isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: () => api.trash.list(50),
  });

  const restoreMutation = useMutation({
    mutationFn: (fileId: string) => api.files.restore(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const deletePermanentMutation = useMutation({
    mutationFn: (fileId: string) => api.files.deletePermanently(fileId),
    onSuccess: () => {
      setDeletingPermanentlyItem(null);
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null || bytes === undefined) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Trash</h1>
        <p className="text-sm text-slate-500 mt-1">
          Items in trash are backed by each Google Drive provider trash. Restoring checks live permissions.
        </p>
      </div>

      {isLoading ? (
        <div className="py-6">
          <TableSkeleton rows={6} />
        </div>
      ) : trashItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 mt-6 p-8 flex flex-col items-center">
          <EmptyTrashIllustration className="w-44 h-auto mb-4" />
          <h3 className="text-base font-semibold text-slate-800">Trash is Empty</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Files moved to trash from any connected Google Drive account will be accessible here for restoration.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Source Account</th>
                  <th className="py-3 px-4">Trashed Date</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {trashItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900 truncate max-w-[240px]">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <AccountBadge email={item.source_account_email} />
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {item.trashed_at ? new Date(item.trashed_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {formatFileSize(item.size_bytes)}
                    </td>
                    <td className="py-3 px-4">
                      {item.recoverable ? (
                        <Badge variant="success">Recoverable</Badge>
                      ) : (
                        <Badge variant="danger">Restore Unavailable</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => restoreMutation.mutate(item.id)}
                          isLoading={restoreMutation.isPending && restoreMutation.variables === item.id}
                          className="text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Restore
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingPermanentlyItem(item)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          Delete Forever
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permanent Deletion Dialog */}
      <Modal
        isOpen={!!deletingPermanentlyItem}
        onClose={() => setDeletingPermanentlyItem(null)}
        title="Permanently Delete File"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold">This action cannot be undone.</p>
              <p className="mt-1 text-xs text-red-700">
                <span className="font-medium text-red-900">{deletingPermanentlyItem?.name}</span> will be permanently and irreversibly removed from Google Drive ({deletingPermanentlyItem?.source_account_email}).
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeletingPermanentlyItem(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deletingPermanentlyItem && deletePermanentMutation.mutate(deletingPermanentlyItem.id)}
              isLoading={deletePermanentMutation.isPending}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
