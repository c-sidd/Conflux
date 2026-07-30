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
import { FilePreviewModal } from "./FilePreviewModal";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/api/client";
import { FolderOpen } from "lucide-react";

function ExplorerContent() {
  const { viewMode, loading, files, folders, currentFolderId, refreshExplorer, renameItem } = useExplorer();

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
      className="flex-1 flex flex-row min-h-0 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden"
    >
      <ExplorerShortcuts />
      <ExplorerDropZone />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <OnboardingGuide />
        <ExplorerToolbar onNewFolderClick={() => setNewFolderModalOpen(true)} />
        <ExplorerBreadcrumb />

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading workspace files...</div>
          ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 text-blue-500 flex items-center justify-center">
                <FolderOpen className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Folder is empty</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Drag & drop files here or create subfolders to get started.</p>
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

      {propertiesTarget && (
        <ExplorerProperties item={propertiesTarget} onClose={() => setPropertiesTarget(null)} />
      )}

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
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <Input
                autoFocus
                placeholder="Folder Name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setNewFolderModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                  Create Folder
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Rename Item</h3>
            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setRenameModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
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
