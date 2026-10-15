import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { FileOperation } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { AlertTriangle, Clock } from 'lucide-react';

export const OperationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [confirmingOp, setConfirmingOp] = useState<FileOperation | null>(null);

  const { data: opData, isLoading } = useQuery({
    queryKey: ['operations'],
    queryFn: () => api.operations.list(50),
    refetchInterval: 3000, // auto-poll active operations
  });

  const operations = opData?.items || [];

  const confirmRemovalMutation = useMutation({
    mutationFn: (operationId: string) => api.operations.confirmSourceRemoval(operationId),
    onSuccess: () => {
      setConfirmingOp(null);
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (operationId: string) => api.operations.cancel(operationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
  });

  const getStatusBadge = (status: FileOperation['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'AWAITING_CONFIRMATION':
        return <Badge variant="warning">Awaiting Confirmation</Badge>;
      case 'RUNNING':
        return <Badge variant="info">Running</Badge>;
      case 'QUEUED':
        return <Badge variant="neutral">Queued</Badge>;
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      case 'PARTIAL':
        return <Badge variant="warning">Partially Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Operations Center</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor asynchronous transfers, sync jobs, and confirm cross-account source deletions.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full"></div>
        </div>
      ) : operations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 mt-6 p-8">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Operations Recorded</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Long-running background operations like uploads, cross-account transfers, and sync jobs will be tracked here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="py-3 px-4">Operation Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4">Details / Errors</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {operations.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {op.operation_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(op.status)}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {op.progress_total > 0 ? `${op.progress_percentage}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(op.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-[250px] truncate">
                      {op.safe_error_message || (op.status === 'AWAITING_CONFIRMATION' ? 'Destination copy verified. Confirmation required to remove source.' : '—')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {op.status === 'AWAITING_CONFIRMATION' && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setConfirmingOp(op)}
                        >
                          Confirm Removal
                        </Button>
                      )}
                      {(op.status === 'QUEUED' || op.status === 'RUNNING') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelMutation.mutate(op.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cross-Account Move Source Removal Confirmation Dialog */}
      <Modal
        isOpen={!!confirmingOp}
        onClose={() => setConfirmingOp(null)}
        title="Confirm Source Removal (Cross-Account Move)"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold">Destination verification succeeded!</p>
              <p className="mt-1 text-xs text-amber-800">
                The file has been successfully copied and verified in the destination Google Drive account.
              </p>
              <p className="mt-2 text-xs font-medium text-amber-900">
                Are you sure you want to permanently remove the source file from the source Google Drive account? This completes the cross-account move.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirmingOp(null)}>
              Keep Both Copies
            </Button>
            <Button
              variant="danger"
              onClick={() => confirmingOp && confirmRemovalMutation.mutate(confirmingOp.id)}
              isLoading={confirmRemovalMutation.isPending}
            >
              Confirm & Remove Source
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
