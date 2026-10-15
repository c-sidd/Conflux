import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, HardDrive, Info, UploadCloud, X } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId?: string;
  defaultAccountId?: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  currentFolderId,
  defaultAccountId,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [destinationAccount, setDestinationAccount] = useState<string>(defaultAccountId || 'auto');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.list(),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setError(null);
      setStatusMessage('Analyzing account capacity & determining placement...');
      setUploadProgress(20);

      // 1. Initiate upload with placement decision
      const initResp = await api.uploads.initiate({
        name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        destination_account_id: destinationAccount === 'auto' ? undefined : destinationAccount,
        parent_file_id: currentFolderId,
      });

      setStatusMessage(`Destination chosen: ${initResp.destination_account_email} (${initResp.placement_reason})`);
      setUploadProgress(50);

      // 2. Upload file content
      setStatusMessage('Transferring data to Google Drive...');
      const completedOp = await api.uploads.complete(initResp.operation_id, file);

      setUploadProgress(100);
      setStatusMessage('Upload verified and complete!');
      return completedOp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1200);
    },
    onError: (err: any) => {
      setError(err.message || 'Upload failed');
      setStatusMessage('');
      setUploadProgress(0);
    },
  });

  const handleReset = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setError(null);
    setStatusMessage('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload to Google Drive" maxWidth="md">
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Destination Account Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Destination Account
          </label>
          <select
            value={destinationAccount}
            onChange={(e) => setDestinationAccount(e.target.value)}
            disabled={uploadMutation.isPending}
            className="w-full text-sm rounded-lg border-slate-300 border py-2 px-3 focus:ring-brand-500 focus:border-brand-500 bg-white"
          >
            <option value="auto">Automatic (Best-Fit based on remaining capacity)</option>
            {accounts
              .filter((a) => a.connection_status === 'CONNECTED')
              .map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.email} ({acc.quota.quota_used_bytes && acc.quota.quota_total_bytes ? `${((acc.quota.quota_total_bytes - acc.quota.quota_used_bytes)/(1024*1024*1024)).toFixed(1)} GB free` : 'Manual'})
                </option>
              ))}
          </select>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Automatic placement automatically balances storage across your connected drives.
          </p>
        </div>

        {/* Drag & Drop Area */}
        {!selectedFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100"
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
            />
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-800">
              Click to select or drag and drop a file here
            </p>
            <p className="text-xs text-slate-500 mt-1">Supports all document and media formats</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 truncate">
                <HardDrive className="w-5 h-5 text-brand-600 flex-shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-medium text-slate-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              {!uploadMutation.isPending && (
                <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {uploadProgress > 0 && (
              <div className="space-y-1.5 pt-2">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                {statusMessage && (
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    {uploadProgress === 100 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    {statusMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={uploadMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selectedFile || uploadMutation.isPending}
            isLoading={uploadMutation.isPending}
            onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
          >
            Start Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
};
