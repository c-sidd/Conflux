"use client";

import { useEffect, useState, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { 
  Folder as FolderIcon, File as FileIcon, UploadCloud, Plus, MoreVertical, Trash2, 
  HardDrive, Download, ChevronRight, Activity, ArrowLeft, Eye, Edit2, Move, Copy, Star, CheckSquare, Square, RotateCcw
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
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  
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

    // Check duplicate
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

      // Trigger Undo Toast
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
      a.download = "DCS_Bulk_Download.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert("Bulk download failed");
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 GB";
    const gb = bytes / 1024 / 1024 / 1024;
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
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (totalDrives === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto shadow-xl">
          <HardDrive className="w-8 h-8 text-zinc-500" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">No storage accounts connected</h2>
          <p className="text-zinc-500 text-sm">
            DCS combines multiple cloud drives into one unified storage pool. Connect your first Google Drive account to start uploading.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/storage")} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold shadow-lg">
          Connect Google Drive
        </Button>
      </div>
    );
  }

  const overallPercentage = stats?.total_storage > 0 ? (stats.used_storage / stats.total_storage * 100) : 0;

  return (
    <div className="flex-1 overflow-auto p-8 z-10 space-y-8">
      {/* Header with Dynamic Breadcrumb Navigation */}
      <header className="flex items-center justify-between">
        <div className="space-y-2 max-w-2xl overflow-hidden">
          <nav className="flex items-center gap-1.5 text-sm text-zinc-400 overflow-x-auto whitespace-nowrap pb-1 no-scrollbar">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={item.id ?? "root"} className="flex items-center gap-1.5 shrink-0">
                  {index > 0 && <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />}
                  {isLast ? (
                    <span className="text-white font-bold bg-zinc-850 px-2 py-0.5 rounded-md text-sm border border-zinc-800">
                      {item.name}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className="hover:text-white transition-colors font-medium px-1.5 py-0.5 rounded hover:bg-zinc-800/50"
                    >
                      {item.name}
                    </button>
                  )}
                </div>
              );
            })}
          </nav>

          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            {folderId ? (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => {
                  const prevId = breadcrumbs.length > 2 ? breadcrumbs[breadcrumbs.length - 2].id : null;
                  handleNavigate(prevId);
                }}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {currentFolderName}
              </>
            ) : (
              "My Storage Workspace"
            )}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Multi-select Batch Toolbar */}
          {selectedFileIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-950/60 border border-blue-500/40 px-3 py-1.5 rounded-xl text-xs text-blue-200 animate-in fade-in">
              <span className="font-semibold">{selectedFileIds.length} selected</span>
              <Button size="sm" variant="ghost" onClick={handleBulkDownload} className="h-7 text-xs text-blue-300 hover:text-white">
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMoveCopyTarget({ mode: "bulk_move" })} className="h-7 text-xs text-blue-300 hover:text-white">
                <Move className="w-3.5 h-3.5 mr-1" /> Move
              </Button>
              <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="h-7 text-xs text-red-400 hover:text-red-300">
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            </div>
          )}

          <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                <Plus className="w-4 h-4 mr-2" /> New Folder
              </Button>
            } />
            <DialogContent className="bg-zinc-900 border border-zinc-800 text-white">
              <DialogHeader>
                <DialogTitle>Create Folder {folderId ? `in "${currentFolderName}"` : ""}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input 
                  placeholder="Folder Name" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
              </div>
              <Button onClick={handleCreateFolder} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg cursor-pointer"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              ) : (
                <UploadCloud className="w-4 h-4 mr-2" />
              )}
              Upload File
            </Button>
          </div>
        </div>
      </header>

      {/* Grid Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6 space-y-4 cursor-pointer hover:bg-zinc-900/80 transition-all" onClick={() => setIsBreakdownOpen(true)}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Total Storage</span>
            <HardDrive className="w-5 h-5 text-blue-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-extrabold text-white">{formatSize(stats?.total_storage)}</h3>
            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${overallPercentage}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Used: {formatSize(stats?.used_storage)}</span>
              <span>Remaining: {formatSize(stats?.remaining_storage)}</span>
            </div>
          </div>
        </Card>

        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6 flex flex-col justify-between cursor-pointer hover:bg-zinc-900/80 transition-all" onClick={() => router.push("/dashboard/storage")}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Connected Drives</span>
            <HardDrive className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-3xl font-extrabold text-white">{stats?.connected_drives}</h3>
        </Card>

        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6 flex justify-between gap-4">
          <div className="flex-1 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Files</span>
            <h3 className="text-2xl font-extrabold text-white mt-2">{stats?.total_files}</h3>
          </div>
          <div className="w-px bg-zinc-800"></div>
          <div className="flex-1 flex flex-col justify-between pl-4">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Folders</span>
            <h3 className="text-2xl font-extrabold text-white mt-2">{stats?.total_folders}</h3>
          </div>
        </Card>
      </section>

      {/* Main Contents Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Folders Section */}
          {visibleFolders.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Folders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleFolders.map(folder => (
                  <Card
                    key={folder.id}
                    onClick={() => handleNavigate(folder.id)}
                    className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FolderIcon className="w-8 h-8 text-blue-400 shrink-0" />
                      <span className="font-medium text-zinc-200 truncate">{folder.name}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
                        <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={(e) => { e.stopPropagation(); setPropertiesItem(folder); }}>
                          <Eye className="w-4 h-4 mr-2" /> Properties
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDownloadFolderZip(folder); }}>
                          <Download className="w-4 h-4 mr-2" /> Download ZIP
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={(e) => { e.stopPropagation(); setRenamingItem({ type: "folder", id: folder.id, name: folder.name }); setRenameValue(folder.name); }}>
                          <Edit2 className="w-4 h-4 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={(e) => { e.stopPropagation(); setMoveCopyTarget({ mode: "move_folder", item: folder }); }}>
                          <Move className="w-4 h-4 mr-2" /> Move
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 hover:bg-zinc-800 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}>
                          <Trash2 className="w-4 h-4 mr-2" /> Move to Trash
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Files Section */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Files {folderId ? `in "${currentFolderName}"` : ""}
            </h3>
            {visibleFiles.length === 0 ? (
              <div className="text-center py-16 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
                <UploadCloud className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-md font-medium text-zinc-300">No files in this location</h3>
                <p className="text-zinc-500 text-xs">Upload files to store them here.</p>
              </div>
            ) : (
              <div className="bg-zinc-900/50 backdrop-blur rounded-2xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                      <th className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedFileIds.length === visibleFiles.length && visibleFiles.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedFileIds(visibleFiles.map(f => f.id));
                            else setSelectedFileIds([]);
                          }}
                          className="accent-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-4 font-semibold">Name</th>
                      <th className="p-4 font-semibold">Size</th>
                      <th className="p-4 font-semibold">Stored In</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 text-xs">
                    {visibleFiles.map(file => {
                      const isSelected = selectedFileIds.includes(file.id);
                      return (
                        <tr key={file.id} className={`hover:bg-zinc-800/20 transition-colors group ${isSelected ? "bg-blue-950/20" : ""}`}>
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedFileIds([...selectedFileIds, file.id]);
                                else setSelectedFileIds(selectedFileIds.filter(id => id !== file.id));
                              }}
                              className="accent-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 flex items-center gap-3">
                            <Star
                              onClick={() => handleToggleFavorite(file.id)}
                              className={`w-4 h-4 cursor-pointer transition-colors ${file.is_favorite ? "text-amber-400 fill-amber-400" : "text-zinc-600 hover:text-amber-400"}`}
                            />
                            <FileIcon className="w-5 h-5 text-purple-400 shrink-0" />
                            <span className="font-medium text-zinc-200 truncate max-w-[200px]">{file.name}</span>
                          </td>
                          <td className="p-4 text-zinc-400">{formatSize(file.size)}</td>
                          <td className="p-4 text-zinc-500 truncate max-w-[120px]">{file.storage_account?.nickname || 'Google Drive'}</td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setPreviewFile(file)} className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white">
                              <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
                              disabled={downloadingId === file.id}
                              onClick={() => handleDownloadFile(file)}
                            >
                              <Download className="w-3.5 h-3.5 mr-1" />
                              {downloadingId === file.id ? "Downloading..." : "Download"}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger render={
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              } />
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => setPropertiesItem(file)}>
                                  <Eye className="w-4 h-4 mr-2" /> Properties
                                </DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => { setRenamingItem({ type: "file", id: file.id, name: file.name }); setRenameValue(file.name); }}>
                                  <Edit2 className="w-4 h-4 mr-2" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => setMoveCopyTarget({ mode: "move_file", item: file })}>
                                  <Move className="w-4 h-4 mr-2" /> Move
                                </DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => setMoveCopyTarget({ mode: "copy_file", item: file })}>
                                  <Copy className="w-4 h-4 mr-2" /> Copy
                                </DropdownMenuItem>
                                {file.web_view_link && (
                                  <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => window.open(file.web_view_link, "_blank")}>
                                    View on Drive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-red-400 hover:bg-zinc-800 cursor-pointer" onClick={() => handleDeleteFile(file)}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Move to Trash
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
            )}
          </section>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Activity Timeline</h3>
            </div>
            
            {activities.length === 0 ? (
              <p className="text-zinc-500 text-sm">No activity recorded yet.</p>
            ) : (
              <div className="space-y-4 relative border-l border-zinc-800 pl-4 ml-2">
                {activities.map(act => (
                  <div key={act.id} className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-zinc-950"></div>
                    <p className="text-xs text-zinc-500">{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    <p className="text-sm text-zinc-300 font-semibold">{act.action === 'upload' ? 'File Uploaded' : act.action === 'delete' ? 'Moved to Trash' : act.action === 'connect' ? 'Drive Connected' : act.action}</p>
                    <p className="text-xs text-zinc-500 truncate max-w-[200px]">{act.details?.filename || act.details?.folder_name || act.details?.drive_nickname}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Properties Panel Drawer */}
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
        <DialogContent className="bg-zinc-900 border border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename {renamingItem?.type === "file" ? "File" : "Folder"}</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="New Name"
              className="bg-zinc-950 border-zinc-800 text-white text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRenamingItem(null)} className="flex-1 border-zinc-800 text-zinc-300">
              Cancel
            </Button>
            <Button onClick={handleExecuteRename} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold">
              Save Name
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Undo Toast Notification (8-second Window) */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 text-xs animate-in slide-in-from-bottom duration-200">
          <span className="text-zinc-200">
            Moved <strong className="text-white">{undoToast.name}</strong> to trash.
          </span>
          <Button size="sm" onClick={handleUndo} className="bg-blue-600 hover:bg-blue-500 text-white h-7 text-xs font-semibold">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Undo
          </Button>
        </div>
      )}

      {/* Pre-flight Upload Simulation Modal */}
      <Dialog open={!!pendingFile && !!simulation} onOpenChange={() => { setPendingFile(null); setSimulation(null); }}>
        <DialogContent className="bg-zinc-900 border border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Intelligent Storage Simulation</DialogTitle>
          </DialogHeader>
          {simulation && (
            <div className="space-y-6 py-4">
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">File Selected:</span>
                  <span className="font-semibold text-zinc-200 max-w-[200px] truncate">{pendingFile?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">File Size:</span>
                  <span className="font-bold text-white">{formatSize(pendingFile?.size)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Target Folder:</span>
                  <span className="font-semibold text-blue-400">{folderId ? currentFolderName : `Root (${BRAND.workspaceFolder})`}</span>
                </div>
                <div className="h-px bg-zinc-800"></div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Selected Destination:</span>
                  <span className="font-bold text-green-400">{simulation.nickname}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Placement Reason:</span>
                  <span className="text-blue-300 font-medium">Most Free Space ({formatSize(simulation.current_free)})</span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={() => { setPendingFile(null); setSimulation(null); }}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold shadow-lg" onClick={executeUpload}>
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
