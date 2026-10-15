import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import { FileMetadata } from '../../types';
import { AccountBadge } from '../../components/ui/AccountBadge';
import { BreadcrumbItem, Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyFilesIllustration } from '../../components/ui/Illustrations';
import { UploadModal } from '../uploads/UploadModal';
import {
  Download,
  Edit2,
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  Folder,
  Image,
  Move,
  Copy,
  Star,
  Trash2,
  Upload,
  Search,
  Filter,
} from 'lucide-react';

interface FilesPageProps {
  initialAccountId?: string;
  isStarredView?: boolean;
}

export const FilesPage: React.FC<FilesPageProps> = ({
  initialAccountId,
  isStarredView = false,
}) => {
  const queryClient = useQueryClient();

  // Navigation state
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(initialAccountId);
  const [currentFolder, setCurrentFolder] = useState<{ id?: string; name: string } | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [renamingFile, setRenamingFile] = useState<FileMetadata | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [copyingFile, setCopyingFile] = useState<FileMetadata | null>(null);
  const [movingFile, setMovingFile] = useState<FileMetadata | null>(null);
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Queries
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.list(),
  });

  const { data: fileData, isLoading } = useQuery({
    queryKey: ['files', selectedAccountId, currentFolder?.id, searchQuery, isStarredView],
    queryFn: async () => {
      if (isStarredView) {
        const starred = await api.files.listStarred();
        return { items: starred, total_count: starred.length, next_page_token: null };
      }
      if (searchQuery.trim()) {
        return await api.files.search(searchQuery.trim(), selectedAccountId);
      }
      return await api.files.listUnified({
        account_id: selectedAccountId,
        parent_id: currentFolder?.id,
        is_root_only: !currentFolder?.id && !selectedAccountId,
      });
    },
  });

  const files = fileData?.items || [];

  // Mutations
  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.files.rename(id, name),
    onSuccess: () => {
      setRenamingFile(null);
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const starMutation = useMutation({
    mutationFn: ({ id, is_starred }: { id: string; is_starred: boolean }) => api.files.toggleStar(id, is_starred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const trashMutation = useMutation({
    mutationFn: (id: string) => api.files.trash(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });

  const copyMutation = useMutation({
    mutationFn: ({ id, destAccount }: { id: string; destAccount?: string }) =>
      api.files.copy(id, destAccount),
    onSuccess: () => {
      setCopyingFile(null);
      setActionSuccessMessage('File copy operation queued successfully!');
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, destAccount }: { id: string; destAccount?: string }) =>
      api.files.move(id, destAccount),
    onSuccess: (op) => {
      setMovingFile(null);
      if (op.status === 'AWAITING_CONFIRMATION') {
        setActionSuccessMessage('Cross-account copy verified! Please open Operations Center to confirm source removal.');
      } else {
        setActionSuccessMessage('File moved successfully.');
      }
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
  });

  const handleFolderClick = (file: FileMetadata) => {
    if (!file.is_folder) return;
    const newBreadcrumb: BreadcrumbItem = { id: file.provider_file_id, name: file.name };
    setBreadcrumbs([...breadcrumbs, newBreadcrumb]);
    setCurrentFolder({ id: file.provider_file_id, name: file.name });
  };

  const handleBreadcrumbNavigate = (item: BreadcrumbItem, index: number) => {
    if (index === -1) {
      setBreadcrumbs([]);
      setCurrentFolder(null);
    } else {
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
      setCurrentFolder({ id: item.id, name: item.name });
    }
  };

  const getFileIcon = (file: FileMetadata) => {
    if (file.is_folder) {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-100" />;
    }
    const mime = file.mime_type.toLowerCase();
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (mime.includes('image') || mime.includes('png') || mime.includes('jpeg')) {
      return <Image className="w-5 h-5 text-purple-600" />;
    }
    if (mime.includes('pdf') || mime.includes('document') || mime.includes('word') || mime.includes('text')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    return <FileIcon className="w-5 h-5 text-slate-400" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null || bytes === undefined) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isStarredView ? 'Starred Files' : selectedAccountId ? 'Account Files' : 'All Files'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isStarredView
              ? 'Quick access to your prioritized files'
              : selectedAccountId
              ? 'Viewing files stored in selected Google Drive account'
              : 'Unified view across all connected Google Drive accounts with clear source attribution'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Account Filter dropdown */}
          {!isStarredView && (
            <>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedAccountId || ''}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value || undefined);
                    setCurrentFolder(null);
                    setBreadcrumbs([]);
                  }}
                  className="text-sm rounded-lg border-slate-300 border py-1.5 px-3 bg-white text-slate-700 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">All Accounts (Unified)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Filter files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-sm rounded-lg border-slate-300 border py-1.5 pl-8 pr-3 bg-white text-slate-700 focus:ring-brand-500 focus:border-brand-500 w-44"
                />
              </div>
            </>
          )}

          <Button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload File
          </Button>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center justify-between">
          <span>{actionSuccessMessage}</span>
          <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Breadcrumbs */}
      {!isStarredView && (
        <Breadcrumbs
          items={breadcrumbs}
          onNavigate={handleBreadcrumbNavigate}
          rootLabel={selectedAccountId ? 'Account Root' : 'Unified Drive'}
        />
      )}

      {/* File Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-2">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16 px-4 flex flex-col items-center">
            <EmptyFilesIllustration className="w-44 h-auto mb-4" />
            <h3 className="text-base font-semibold text-slate-800">
              {searchQuery ? 'No matching files found' : isStarredView ? 'No starred files yet' : 'No files in this folder'}
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `We couldn't find anything matching "${searchQuery}". Try a different keyword.`
                : isStarredView
                ? 'Star important files to quickly access them in this unified view.'
                : 'Upload files to start managing your unified Google Drive storage.'}
            </p>
            {!searchQuery && !isStarredView && (
              <Button onClick={() => setIsUploadModalOpen(true)} size="sm" className="mt-5">
                Upload First File
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Source Account</th>
                  <th className="py-3 px-4">Last Modified</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => file.is_folder && handleFolderClick(file)}
                  >
                    {/* Star icon */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => starMutation.mutate({ id: file.id, is_starred: !file.is_starred })}
                        className={`p-1 rounded hover:bg-slate-100 ${
                          file.is_starred ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={file.is_starred ? 'Remove Star' : 'Star file'}
                      >
                        <Star className={`w-4 h-4 ${file.is_starred ? 'fill-amber-400' : ''}`} />
                      </button>
                    </td>

                    {/* File name & Icon */}
                    <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-3">
                      {getFileIcon(file)}
                      <span className="truncate max-w-[280px]" title={file.name}>
                        {file.name}
                      </span>
                    </td>

                    {/* Source Google Drive Account Label (P0 Requirement) */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <AccountBadge email={file.source_account_email} />
                    </td>

                    {/* Last Modified */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-xs">
                      {file.modified_time_provider
                        ? new Date(file.modified_time_provider).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>

                    {/* Size */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-xs">
                      {formatFileSize(file.size_bytes)}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* Download or Export */}
                        {!file.is_folder && (
                          <a
                            href={
                              file.capabilities.can_export
                                ? api.files.exportUrl(file.id)
                                : api.files.downloadUrl(file.id)
                            }
                            download
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded"
                            title={file.capabilities.can_export ? 'Export Google Doc (PDF)' : 'Download file'}
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}

                        {/* Rename */}
                        <button
                          onClick={() => {
                            setRenamingFile(file);
                            setRenameValue(file.name);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Rename file"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Copy */}
                        <button
                          onClick={() => {
                            setCopyingFile(file);
                            setTargetAccountId(file.connected_account_id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Copy file"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Move */}
                        <button
                          onClick={() => {
                            setMovingFile(file);
                            setTargetAccountId(file.connected_account_id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="Move file"
                        >
                          <Move className="w-4 h-4" />
                        </button>

                        {/* Trash */}
                        <button
                          onClick={() => trashMutation.mutate(file.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Move to trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        currentFolderId={currentFolder?.id}
        defaultAccountId={selectedAccountId}
      />

      {/* Rename Modal */}
      <Modal
        isOpen={!!renamingFile}
        onClose={() => setRenamingFile(null)}
        title="Rename Item"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (renamingFile && renameValue.trim()) {
              renameMutation.mutate({ id: renamingFile.id, name: renameValue.trim() });
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Name</label>
            <input
              type="text"
              required
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full text-sm rounded-lg border-slate-300 border py-2 px-3 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setRenamingFile(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={renameMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Copy Modal */}
      <Modal
        isOpen={!!copyingFile}
        onClose={() => setCopyingFile(null)}
        title="Copy File"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select the destination Google Drive account for copying <span className="font-semibold text-slate-900">{copyingFile?.name}</span>:
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Destination Account</label>
            <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              className="w-full text-sm rounded-lg border-slate-300 border py-2 px-3 focus:ring-brand-500 focus:border-brand-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.email} {acc.id === copyingFile?.connected_account_id ? '(Same account)' : '(Cross-account)'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCopyingFile(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => copyingFile && copyMutation.mutate({ id: copyingFile.id, destAccount: targetAccountId })}
              isLoading={copyMutation.isPending}
            >
              Copy File
            </Button>
          </div>
        </div>
      </Modal>

      {/* Move Modal */}
      <Modal
        isOpen={!!movingFile}
        onClose={() => setMovingFile(null)}
        title="Move File"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select the destination Google Drive account for moving <span className="font-semibold text-slate-900">{movingFile?.name}</span>:
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Destination Account</label>
            <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value)}
              className="w-full text-sm rounded-lg border-slate-300 border py-2 px-3 focus:ring-brand-500 focus:border-brand-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.email} {acc.id === movingFile?.connected_account_id ? '(Same account parent move)' : '(Cross-account move)'}
                </option>
              ))}
            </select>
          </div>

          {targetAccountId !== movingFile?.connected_account_id && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <span className="font-bold">Cross-Account Safety Guarantee:</span> Conflux will first copy and verify the file in the destination Google Drive. You will then be prompted to explicitly confirm before the source file is removed.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setMovingFile(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => movingFile && moveMutation.mutate({ id: movingFile.id, destAccount: targetAccountId })}
              isLoading={moveMutation.isPending}
            >
              Move File
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
