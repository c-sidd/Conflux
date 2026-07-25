"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { 
  Folder as FolderIcon, File as FileIcon, UploadCloud, Plus, MoreVertical, Trash2, 
  HardDrive, Download, ChevronRight, Activity, ArrowLeft, Eye, Edit2, Move, Copy, Star,
  LayoutGrid, LayoutList, RotateCcw, ShieldAlert, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import PropertiesPanel from "@/components/properties-panel";
import FilePreviewModal from "@/components/file-preview-modal";
import MoveCopyModal from "@/components/move-copy-modal";
import { BRAND } from "@/lib/brand";

interface BreadcrumbItem {
  id: number | null;
  name: string;
}

interface UndoToast {
  id: string;
  name: string;
  type: "file" | "folder";
  itemId: number;
  timerId: any;
}

export default function StorageExplorer({ folderId = null }: { folderId?: number | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: "Root" }]);
  
  // View mode (List / Grid)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Selection
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);

  // Properties & Previews
  const [propertiesItem, setPropertiesItem] = useState<any | null>(null);
  const [previewFile, setPreviewFile] = useState<any | null>(null);

  // Move & Copy Modal State
  const [moveCopyTarget, setMoveCopyTarget] = useState<{ mode: "move_file" | "copy_file" | "move_folder" | "bulk_move"; item?: any } | null>(null);

  // Modals & Dialogs
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  // Inline Rename
  const [renamingItem, setRenamingItem] = useState<{ type: "file" | "folder"; id: number; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Upload Simulation & Queue
  const [pendingFile, setPendingFile] = useState<any>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Undo Toast Queue
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null);

  const loadData = async () => {
    try {
      const [statsData, foldersData, filesData, activitiesData] = await Promise.all([
        fetchApi("/api/v1/dashboard/stats/"),
        fetchApi("/api/v1/folders/"),
        fetchApi("/api/v1/files/"),
        fetchApi("/api/v1/storage/activities/"),
      ]);
      setStats(statsData);
      setFolders(foldersData);
      setFiles(filesData);
      setActivities(activitiesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch breadcrumb chain
  useEffect(() => {
    const fetchBreadcrumbs = async () => {
      if (!folderId) {
        setBreadcrumbs([{ id: null, name: "Root" }]);
        return;
      }
      try {
        const chain: any[] = await fetchApi(`/api/v1/folders/${folderId}/breadcrumb/`);
        const formattedChain: BreadcrumbItem[] = [
          { id: null, name: "Root" },
          ...chain.map((item: any) => ({ id: item.id, name: item.name }))
        ];
        setBreadcrumbs(formattedChain);
      } catch (err) {
        console.error("Failed to load breadcrumbs:", err);
        setBreadcrumbs([{ id: null, name: "Root" }]);
      }
    };

    fetchBreadcrumbs();
    setSelectedFileIds([]);
    setSelectedFolderIds([]);
  }, [folderId]);

  // Desktop Keyboard Shortcuts Listener
  const handleExplorerKeyDown = useCallback((e: KeyboardEvent) => {
    // Esc: close dialogs
    if (e.key === "Escape") {
      setPropertiesItem(null);
      setPreviewFile(null);
      setRenamingItem(null);
      setPendingFile(null);
      return;
    }
    // Ctrl+Shift+N: New folder
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "n") {
      e.preventDefault();
      setIsFolderDialogOpen(true);
      return;
    }
    // Ctrl+U: Upload file
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      fileInputRef.current?.click();
      return;
    }
    // Backspace: Navigate to parent folder
    if (e.key === "Backspace" && document.activeElement?.tagName !== "INPUT") {
      if (breadcrumbs.length > 1) {
        const prevId = breadcrumbs.length > 2 ? breadcrumbs[breadcrumbs.length - 2].id : null;
        handleNavigate(prevId);
      }
    }
  }, [breadcrumbs]);

  useEffect(() => {
    window.addEventListener("keydown", handleExplorerKeyDown);
    return () => window.removeEventListener("keydown", handleExplorerKeyDown);
  }, [handleExplorerKeyDown]);

  const handleNavigate = (targetId: number | null) => {
    if (targetId === null) {
      router.push("/dashboard");
    } else {
      router.push(`/dashboard/folder/${targetId}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await fetchApi("/api/v1/folders/", {
        method: "POST",
        body: JSON.stringify({
          name: newFolderName,
          parent: folderId
        }),
      });
      setNewFolderName("");
      setIsFolderDialogOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Pre-flight duplicate check & simulation
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dupCheck = await fetchApi("/api/v1/files/check-duplicate/", {
        method: "POST",
        body: JSON.stringify({ name: file.name, folder_id: folderId, size: file.size })
      });

      if (dupCheck.exists) {
        if (!confirm(`"${file.name}" already exists in this folder. Upload anyway?`)) {
          return;
        }
      }
    } catch (err) {
      console.error("Duplicate check note:", err);
    }

    setPendingFile(file);

    try {
      const simResult = await fetchApi("/api/v1/files/simulate/", {
        method: "POST",
        body: JSON.stringify({ name: file.name, size: file.size })
      });
      setSimulation(simResult);
    } catch (e: any) {
      alert(e.message || "Simulation failed. Do you have connected drives?");
      setPendingFile(null);
    }
  };

  const executeUpload = async () => {
    if (!pendingFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", pendingFile);
    if (folderId) {
      formData.append("folder", folderId.toString());
    }

    try {
      await fetchApi("/api/v1/files/", {
        method: "POST",
        body: formData,
      });
      setPendingFile(null);
      setSimulation(null);
      loadData();
    } catch (e: any) {
      alert(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (fileItem: any) => {
    setDownloadingId(fileItem.id);
    try {
      const token = localStorage.getItem("dcs_access_token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${API_BASE}/api/v1/files/${fileItem.id}/download/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Download request failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileItem.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(e.message || "Failed to download file");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadFolderZip = async (folderItem: any) => {
    try {
      const token = localStorage.getItem("dcs_access_token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${API_BASE}/api/v1/folders/${folderItem.id}/download-zip/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderItem.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert("Failed to download folder ZIP");
    }
  };

  // Soft Delete with 8-second Undo Toast
  const handleDeleteFile = async (fileItem: any) => {
    try {
      await fetchApi(`/api/v1/files/${fileItem.id}/`, { method: "DELETE" });
      loadData();

      if (undoToast?.timerId) clearTimeout(undoToast.timerId);
      const timerId = setTimeout(() => setUndoToast(null), 8000);
      setUndoToast({
        id: `file-${fileItem.id}`,
        name: fileItem.name,
        type: "file",
        itemId: fileItem.id,
        timerId
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFolder = async (folderItem: any) => {
    try {
      await fetchApi(`/api/v1/folders/${folderItem.id}/`, { method: "DELETE" });
      if (folderId === folderItem.id) {
        router.push("/dashboard");
      } else {
        loadData();
      }

      if (undoToast?.timerId) clearTimeout(undoToast.timerId);
      const timerId = setTimeout(() => setUndoToast(null), 8000);
      setUndoToast({
        id: `folder-${folderItem.id}`,
        name: folderItem.name,
        type: "folder",
        itemId: folderItem.id,
        timerId
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    try {
      if (undoToast.type === "file") {
        await fetchApi(`/api/v1/files/${undoToast.itemId}/restore/`, { method: "POST" });
      } else {
        await fetchApi(`/api/v1/folders/${undoToast.itemId}/restore/`, { method: "POST" });
      }
      if (undoToast.timerId) clearTimeout(undoToast.timerId);
      setUndoToast(null);
      loadData();
    } catch (e) {
      alert("Failed to undo deletion");
    }
  };

  const handleToggleFavorite = async (fileId: number) => {
    try {
      await fetchApi(`/api/v1/files/${fileId}/favorite/`, { method: "POST" });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteRename = async () => {
    if (!renamingItem || !renameValue.trim()) return;
    try {
      if (renamingItem.type === "file") {
        await fetchApi(`/api/v1/files/${renamingItem.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ name: renameValue })
        });
      } else {
        await fetchApi(`/api/v1/folders/${renamingItem.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ name: renameValue })
        });
      }
      setRenamingItem(null);
      loadData();
    } catch (e) {
      alert("Failed to rename item");
    }
  };

  const handleConfirmMoveCopy = async (targetFolderId: number | null) => {
    if (!moveCopyTarget) return;
    try {
      const { mode, item } = moveCopyTarget;
      if (mode === "move_file") {
        await fetchApi(`/api/v1/files/${item.id}/move/`, {
          method: "POST",
          body: JSON.stringify({ folder_id: targetFolderId })
        });
      } else if (mode === "copy_file") {
        await fetchApi(`/api/v1/files/${item.id}/copy/`, {
          method: "POST",
          body: JSON.stringify({ folder_id: targetFolderId })
        });
      } else if (mode === "move_folder") {
        await fetchApi(`/api/v1/folders/${item.id}/move/`, {
          method: "POST",
          body: JSON.stringify({ parent_id: targetFolderId })
        });
      } else if (mode === "bulk_move") {
        await fetchApi(`/api/v1/files/bulk-move/`, {
          method: "POST",
          body: JSON.stringify({ file_ids: selectedFileIds, folder_id: targetFolderId })
        });
        setSelectedFileIds([]);
      }
      setMoveCopyTarget(null);
      loadData();
    } catch (e: any) {
      alert(e.message || "Operation failed");
    }
  };

  // Bulk Action Helpers
  const handleBulkDelete = async () => {
    if (!confirm(`Move ${selectedFileIds.length} files to trash?`)) return;
    try {
      await fetchApi("/api/v1/files/bulk-delete/", {
        method: "POST",
        body: JSON.stringify({ file_ids: selectedFileIds })
      });
      setSelectedFileIds([]);
      loadData();
    } catch (e) {
      alert("Bulk delete failed");
    }
  };

  const handleBulkDownload = async () => {
    try {
      const token = localStorage.getItem("dcs_access_token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${API_BASE}/api/v1/files/bulk-download/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ file_ids: selectedFileIds })
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${BRAND.name}_Bulk_Download.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert("Bulk download failed");
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const visibleFolders = folders.filter(f => {
    if (folderId) return f.parent === folderId;
    return !f.parent;
  });

  const visibleFiles = files.filter(f => {
    if (folderId) return f.folder === folderId;
    return !f.folder;
  });

  const totalDrives = stats?.connected_drives || 0;
  const currentFolderName = breadcrumbs[breadcrumbs.length - 1]?.name || "Root";

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FCFCFD]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (totalDrives === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto shadow-sm">
          <HardDrive className="w-8 h-8 text-slate-400" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-bold text-slate-900">No cloud storage connected</h2>
          <p className="text-slate-500 text-xs leading-relaxed">
            {BRAND.name} pools multiple cloud accounts into one virtual workspace. Connect your first Google Drive account to activate the explorer.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/storage")} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all">
          Connect Storage Provider
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Hierarchy Step 2: Synchronized Breadcrumb Bar */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={item.id ?? "root"} className="flex items-center gap-2 shrink-0">
                {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                {isLast ? (
                  <span className="text-slate-900 font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {item.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className="text-slate-500 hover:text-slate-900 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {item.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-400 hover:text-slate-700"}`}
            title="List View"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-400 hover:text-slate-700"}`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hierarchy Step 3: Command Toolbar */}
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {folderId && (
            <Button size="icon" variant="outline" className="h-9 w-9 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100" onClick={() => {
              const prevId = breadcrumbs.length > 2 ? breadcrumbs[breadcrumbs.length - 2].id : null;
              handleNavigate(prevId);
            }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {folderId ? currentFolderName : "My Workspace"}
            </h2>
            <p className="text-xs text-slate-400">
              {visibleFolders.length} folders, {visibleFiles.length} files
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Multi-select Batch Toolbar */}
          {selectedFileIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs text-blue-700 animate-in fade-in">
              <span className="font-bold">{selectedFileIds.length} selected</span>
              <Button size="sm" variant="ghost" onClick={handleBulkDownload} className="h-7 text-xs text-blue-700 hover:bg-blue-100">
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMoveCopyTarget({ mode: "bulk_move" })} className="h-7 text-xs text-blue-700 hover:bg-blue-100">
                <Move className="w-3.5 h-3.5 mr-1" /> Move
              </Button>
              <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="h-7 text-xs text-red-600 hover:bg-red-100">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            </div>
          )}

          <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> New Folder
              </Button>
            } />
            <DialogContent className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900">Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="py-3">
                <Input 
                  placeholder="Folder Name" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 text-xs"
                />
              </div>
              <Button onClick={handleCreateFolder} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                Create Folder
              </Button>
            </DialogContent>
          </Dialog>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white mr-1.5"></div>
              ) : (
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
              )}
              Upload File
            </Button>
          </div>
        </div>
      </header>

      {/* Hierarchy Step 4: Folders First Section */}
      {visibleFolders.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Folders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {visibleFolders.map(folder => (
              <Card
                key={folder.id}
                onClick={() => handleNavigate(folder.id)}
                className="bg-white border-slate-200 p-3.5 flex items-center justify-between hover:border-blue-300 hover:bg-slate-50/50 transition-all cursor-pointer group shadow-2xs rounded-xl"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FolderIcon className="w-6 h-6 text-blue-600 shrink-0" />
                  <span className="font-semibold text-xs text-slate-900 truncate">{folder.name}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  } />
                  <DropdownMenuContent align="end" className="bg-white border-slate-200 text-slate-700 text-xs rounded-xl">
                    <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); setPropertiesItem(folder); }}>
                      <Eye className="w-3.5 h-3.5 mr-2" /> Properties
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDownloadFolderZip(folder); }}>
                      <Download className="w-3.5 h-3.5 mr-2" /> Download ZIP
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); setRenamingItem({ type: "folder", id: folder.id, name: folder.name }); setRenameValue(folder.name); }}>
                      <Edit2 className="w-3.5 h-3.5 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); setMoveCopyTarget({ mode: "move_folder", item: folder }); }}>
                      <Move className="w-3.5 h-3.5 mr-2" /> Move
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Move to Trash
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Hierarchy Step 5: Files Second Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Files {folderId ? `in "${currentFolderName}"` : ""}
        </h3>

        {visibleFiles.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
            <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No files in this location</h3>
            <p className="text-slate-400 text-xs mt-1">Upload files to store them inside {BRAND.name}.</p>
          </div>
        ) : viewMode === "list" ? (
          /* LIST VIEW TABLE */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedFileIds.length === visibleFiles.length && visibleFiles.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedFileIds(visibleFiles.map(f => f.id));
                        else setSelectedFileIds([]);
                      }}
                      className="accent-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-3 font-bold">Name</th>
                  <th className="p-3 font-bold">Size</th>
                  <th className="p-3 font-bold">Storage Drive</th>
                  <th className="p-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {visibleFiles.map(file => {
                  const isSelected = selectedFileIds.includes(file.id);
                  return (
                    <tr key={file.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? "bg-blue-50/60" : ""}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedFileIds([...selectedFileIds, file.id]);
                            else setSelectedFileIds(selectedFileIds.filter(id => id !== file.id));
                          }}
                          className="accent-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 flex items-center gap-2.5">
                        <Star
                          onClick={() => handleToggleFavorite(file.id)}
                          className={`w-3.5 h-3.5 cursor-pointer transition-colors ${file.is_favorite ? "text-amber-500 fill-amber-500" : "text-slate-300 hover:text-amber-500"}`}
                        />
                        <FileIcon className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="font-semibold text-slate-900 truncate max-w-xs">{file.name}</span>
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px]">{formatSize(file.size)}</td>
                      <td className="p-3 text-slate-500 truncate max-w-[120px]">{file.storage_account?.nickname || 'Google Drive'}</td>
                      <td className="p-3 text-right flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setPreviewFile(file)} className="h-7 text-xs text-slate-600 hover:text-slate-900">
                          <Eye className="w-3.5 h-3.5 mr-1 text-slate-400" /> Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-slate-600 hover:text-slate-900"
                          disabled={downloadingId === file.id}
                          onClick={() => handleDownloadFile(file)}
                        >
                          <Download className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {downloadingId === file.id ? "Downloading..." : "Download"}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="bg-white border-slate-200 text-slate-700 text-xs rounded-xl">
                            <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={() => setPropertiesItem(file)}>
                              <Eye className="w-3.5 h-3.5 mr-2" /> Properties
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={() => { setRenamingItem({ type: "file", id: file.id, name: file.name }); setRenameValue(file.name); }}>
                              <Edit2 className="w-3.5 h-3.5 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={() => setMoveCopyTarget({ mode: "move_file", item: file })}>
                              <Move className="w-3.5 h-3.5 mr-2" /> Move
                            </DropdownMenuItem>
                            <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={() => setMoveCopyTarget({ mode: "copy_file", item: file })}>
                              <Copy className="w-3.5 h-3.5 mr-2" /> Copy
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => handleDeleteFile(file)}>
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Move to Trash
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* GRID VIEW CARDS */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleFiles.map(file => (
              <Card key={file.id} className="bg-white border-slate-200 p-4 space-y-3 hover:border-blue-300 transition-all shadow-2xs rounded-xl">
                <div className="flex justify-between items-start">
                  <FileIcon className="w-8 h-8 text-purple-600" />
                  <Star
                    onClick={() => handleToggleFavorite(file.id)}
                    className={`w-4 h-4 cursor-pointer transition-colors ${file.is_favorite ? "text-amber-500 fill-amber-500" : "text-slate-300 hover:text-amber-500"}`}
                  />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-900 truncate">{file.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{formatSize(file.size)}</p>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setPreviewFile(file)} className="flex-1 text-[11px] h-7 border-slate-200 text-slate-700">
                    Preview
                  </Button>
                  <Button size="sm" onClick={() => handleDownloadFile(file)} className="flex-1 text-[11px] h-7 bg-blue-600 text-white">
                    Download
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Properties Drawer */}
      <PropertiesPanel
        item={propertiesItem}
        isOpen={!!propertiesItem}
        onClose={() => setPropertiesItem(null)}
        onDownload={handleDownloadFile}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownloadFile}
      />

      {/* Move & Copy Modal */}
      <MoveCopyModal
        isOpen={!!moveCopyTarget}
        onClose={() => setMoveCopyTarget(null)}
        onConfirm={handleConfirmMoveCopy}
        title={moveCopyTarget?.mode.includes("move") ? "Move Item" : "Copy File"}
        actionLabel={moveCopyTarget?.mode.includes("move") ? "Move Here" : "Copy Here"}
      />

      {/* Inline Rename Dialog */}
      <Dialog open={!!renamingItem} onOpenChange={() => setRenamingItem(null)}>
        <DialogContent className="bg-white border border-slate-200 text-slate-900 max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Rename {renamingItem?.type === "file" ? "File" : "Folder"}</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="New Name"
              className="bg-slate-50 border-slate-200 text-slate-900 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRenamingItem(null)} className="flex-1 border-slate-200 text-slate-600 text-xs">
              Cancel
            </Button>
            <Button onClick={handleExecuteRename} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
              Save Name
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Undo Toast Notification (8-second Window) */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl px-4 py-2.5 shadow-xl flex items-center gap-3 text-xs animate-in slide-in-from-bottom duration-200">
          <span>Moved <strong>{undoToast.name}</strong> to trash.</span>
          <Button size="sm" onClick={handleUndo} className="bg-blue-600 hover:bg-blue-500 text-white h-7 text-xs font-semibold px-3">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Undo
          </Button>
        </div>
      )}

      {/* Pre-flight Upload Simulation Modal */}
      <Dialog open={!!pendingFile && !!simulation} onOpenChange={() => { setPendingFile(null); setSimulation(null); }}>
        <DialogContent className="bg-white border border-slate-200 text-slate-900 max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Intelligent Storage Placement</DialogTitle>
          </DialogHeader>
          {simulation && (
            <div className="space-y-5 py-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">File Selected:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">{pendingFile?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File Size:</span>
                  <span className="font-bold text-slate-900">{formatSize(pendingFile?.size)}</span>
                </div>
                <div className="h-px bg-slate-200"></div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Drive:</span>
                  <span className="font-bold text-blue-600">{simulation.nickname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Placement Reason:</span>
                  <span className="text-blue-700 font-semibold">Most Available Quota ({formatSize(simulation.current_free)})</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-slate-200 text-slate-600 text-xs" onClick={() => { setPendingFile(null); setSimulation(null); }}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs" onClick={executeUpload}>
                  {uploading ? "Uploading..." : "Confirm Upload"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
