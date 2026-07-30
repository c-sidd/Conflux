import React, { useState } from "react";
import { ExplorerProvider, useExplorer } from "./ExplorerContext";
import { ExplorerToolbar } from "./ExplorerToolbar";
import { ExplorerBreadcrumb } from "./ExplorerBreadcrumb";
import { ExplorerGrid } from "./ExplorerGrid";
import { ExplorerList } from "./ExplorerList";
import { ExplorerFloatingBar } from "./ExplorerFloatingBar";
import { ExplorerProperties } from "./ExplorerProperties";
import { ExplorerShortcuts } from "./ExplorerShortcuts";
import { ExplorerDropZone } from "./ExplorerDropZone";
import { ExplorerContextMenu } from "./ExplorerContextMenu";
import { ExplorerUploadQueue } from "./ExplorerUploadQueue";
import { FilePreviewModal } from "./FilePreviewModal";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/api/client";
import emptyFolderIllustration from "@/assets/illustrations/empty-folder.svg";

function ExplorerContent() {
  const {
    viewMode, loading, files, folders, currentFolderId, selectedIds,
    uploadQueue, cancelUpload, retryUpload, clearUploadQueue,
    refreshExplorer, renameItem, deleteSelected
  } = useExplorer();

  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<any>(null);
  const [renameValue, setRenameValue] = useState("");

  const [propertiesTarget, setPropertiesTarget] = useState<any>(null);
  const [previewTarget, setPreviewTarget] = useState<any>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target: any } | null>(null);

  const filteredFolders = folders.filter((f) => f.parent === currentFolderId && !f.is_trashed);
  const filteredFiles = files.filter((f) => f.folder === currentFolderId && !f.is_trashed);

  // Auto select active properties item if single selection
  React.useEffect(() => {
    if (selectedIds.size === 1) {
      const firstKey = Array.from(selectedIds)[0];
      const [type, idStr] = firstKey.split("-");
      const id = parseInt(idStr, 10);
      if (type === "folder") {
        const found = folders.find((f) => f.id === id);
        if (found) setPropertiesTarget({ type: "folder", data: found });
      } else if (type === "file") {
        const found = files.find((fi) => fi.id === id);
        if (found) setPropertiesTarget({ type: "file", data: found });
      }
    }
  }, [selectedIds, files, folders]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await apiClient.post("/api/v1/folders/", { name: newFolderName.trim(), parent: currentFolderId });
      setNewFolderName("");
      setNewFolderModalOpen(false);
      refreshExplorer();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await renameItem(renameTarget.data, renameValue.trim());
      setRenameModalOpen(false);
      setRenameTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="flex-1 flex flex-row min-h-0 bg-slate-50 dark:bg-[#22223B] text-[#22223B] dark:text-[#F2E9E4] overflow-hidden"
    >
      <ExplorerShortcuts />
      <ExplorerDropZone />

      {/* Center Explorer Panel */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <OnboardingGuide />
        <ExplorerToolbar onNewFolderClick={() => setNewFolderModalOpen(true)} />
        <ExplorerBreadcrumb />

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
              <img src={emptyFolderIllustration} alt="Folder is empty" className="w-44 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#22223B] dark:text-white">Workspace Folder is Empty</h3>
                <p className="text-xs text-[#9A8C98]">Drag & drop files here or click "New Folder" above to get started.</p>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div onContextMenu={(e) => e.preventDefault()}>
              <ExplorerGrid />
            </div>
          ) : (
            <div onContextMenu={(e) => e.preventDefault()}>
              <ExplorerList
                onOpenRename={(target) => {
                  setRenameTarget(target);
                  setRenameValue(target.data.name);
                  setRenameModalOpen(true);
                }}
                onOpenProperties={(target) => setPropertiesTarget(target)}
                onOpenPreview={(file) => setPreviewTarget(file)}
              />
            </div>
          )}
        </div>

        <ExplorerFloatingBar />
      </div>

      {/* Right Properties Panel */}
      {propertiesTarget && (
        <ExplorerProperties
          item={propertiesTarget}
          onClose={() => setPropertiesTarget(null)}
          onDelete={() => {
            deleteSelected();
            setPropertiesTarget(null);
          }}
        />
      )}

      {/* Upload Queue Monitor */}
      <ExplorerUploadQueue
        queue={uploadQueue}
        onCancel={cancelUpload}
        onRetry={retryUpload}
        onClose={clearUploadQueue}
      />

      {contextMenu && (
        <ExplorerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          onClose={() => setContextMenu(null)}
          onOpenProperties={() => setPropertiesTarget(contextMenu.target)}
          onOpenRename={() => {
            setRenameTarget(contextMenu.target);
            setRenameValue(contextMenu.target.data.name);
            setRenameModalOpen(true);
          }}
          onOpenPreview={() => setPreviewTarget(contextMenu.target.data)}
        />
      )}

      {previewTarget && (
        <FilePreviewModal file={previewTarget} onClose={() => setPreviewTarget(null)} />
      )}

      {newFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#22223B] rounded-2xl p-5 border border-slate-200 dark:border-[#4A4E69]/60 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#22223B] dark:text-white">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <Input
                autoFocus
                placeholder="Folder Name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-[#4A4E69]/30 border-slate-200 dark:border-[#4A4E69]"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setNewFolderModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                  Create Folder
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#22223B] rounded-2xl p-5 border border-slate-200 dark:border-[#4A4E69]/60 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#22223B] dark:text-white">Rename Item</h3>
            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-[#4A4E69]/30 border-slate-200 dark:border-[#4A4E69]"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setRenameModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                  Save Name
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function Explorer() {
  return (
    <ExplorerProvider>
      <ExplorerContent />
    </ExplorerProvider>
  );
}
