"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { 
  Folder as FolderIcon, FileText, Image as ImageIcon, Video as VideoIcon, 
  FileSpreadsheet, File as GenericFileIcon, UploadCloud, Plus, MoreVertical, Trash2, 
  HardDrive, Download, ChevronRight, ArrowLeft, Eye, Edit2, Move, Copy, Star,
  LayoutList, LayoutGrid, RotateCcw, Check, X, Loader2, RefreshCw, ChevronUp, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface UploadTask {
  id: string;
  file: File;
  status: "pending" | "uploading" | "completed" | "error";
  progress: number;
  error?: string;
}

export default function StorageExplorer({ folderId = null }: { folderId?: number | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: "Root" }]);
  
  // Default to List View (Google Drive Standard)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Selection state
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

  // Multi-File Upload Review Modal & Queue State
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadTask[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Undo Toast Queue
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null);

  const loadData = async () => {
    try {
      const [statsData, foldersData, filesData] = await Promise.all([
        fetchApi("/api/v1/dashboard/stats/"),
        fetchApi("/api/v1/folders/"),
        fetchApi("/api/v1/files/"),
      ]);
      setStats(statsData?.data || statsData);
      setFolders(Array.isArray(foldersData) ? foldersData : (foldersData?.data || []));
      setFiles(Array.isArray(filesData) ? filesData : (filesData?.data || []));
    } catch (e) {
      console.error(e);
      setFolders([]);
      setFiles([]);
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
        setBreadcrumbs([{ id: null, name: "My Workspace" }]);
        return;
      }
      try {
        const chain: any[] = await fetchApi(`/api/v1/folders/${folderId}/breadcrumb/`);
        const formattedChain: BreadcrumbItem[] = [
          { id: null, name: "My Workspace" },
          ...chain.map((item: any) => ({ id: item.id, name: item.name }))
        ];
        setBreadcrumbs(formattedChain);
      } catch (err) {
        console.error("Failed to load breadcrumbs:", err);
        setBreadcrumbs([{ id: null, name: "My Workspace" }]);
      }
    };

    fetchBreadcrumbs();
    setSelectedFileIds([]);
    setSelectedFolderIds([]);
  }, [folderId]);

  // Desktop Keyboard Shortcuts Listener
  const handleExplorerKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setPropertiesItem(null);
      setPreviewFile(null);
      setRenamingItem(null);
      setPendingFiles([]);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "n") {
      e.preventDefault();
      setIsFolderDialogOpen(true);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      fileInputRef.current?.click();
      return;
    }
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

  // Multiple File Selection Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;
    setPendingFiles(rawFiles);
  };

  // Process Multi-file Upload Queue (Google Drive Style Background Flow)
  const executeBatchUpload = async () => {
    if (pendingFiles.length === 0) return;

    const newTasks: UploadTask[] = pendingFiles.map((file, idx) => ({
      id: `${Date.now()}-${idx}`,
      file,
      status: "pending",
      progress: 0,
    }));

    setUploadQueue(prev => [...newTasks, ...prev]);
    setPendingFiles([]);
    setIsQueueOpen(true);

    for (const task of newTasks) {
      setUploadQueue(prev => prev.map(t => t.id === task.id ? { ...t, status: "uploading", progress: 30 } : t));

      const formData = new FormData();
      formData.append("file", task.file);
      if (folderId) {
        formData.append("folder", folderId.toString());
      }

      try {
        await fetchApi("/api/v1/files/", {
          method: "POST",
          body: formData,
        });

        setUploadQueue(prev => prev.map(t => t.id === task.id ? { ...t, status: "completed", progress: 100 } : t));
        loadData();
      } catch (err: any) {
        setUploadQueue(prev => prev.map(t => t.id === task.id ? { ...t, status: "error", error: err.message || "Upload failed" } : t));
      }
    }
  };

  const handleRetryUpload = async (task: UploadTask) => {
    setUploadQueue(prev => prev.map(t => t.id === task.id ? { ...t, status: "uploading", progress: 30, error: undefined } : t));

    const formData = new FormData();
    formData.append("file", task.file);
    if (folderId) {
      formData.append("folder", folderId.toString());
    }

    try {
      await fetchApi("/api/v1/files/", {
        method: "POST",
        body: formData,
      });

      setUploadQueue(prev => prev.map(t => t.id === task.id ? { ...t, status: "completed", progress: 100 } : t));
      loadData();
    } catch (err: any) {
      setUploadQueue(prev => prev.map(t => t.id === task.id ? { ...t, status: "error", error: err.message || "Upload failed" } : t));
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
    if (!bytes || bytes === 0) return "—";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const getFileIcon = (file: any) => {
    const mime = file.mime_type?.toLowerCase() || "";
    const name = file.name?.toLowerCase() || "";
    if (mime.includes("pdf") || name.endsWith(".pdf")) return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
    if (mime.includes("image") || name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return <ImageIcon className="w-5 h-5 text-emerald-500 shrink-0" />;
    if (mime.includes("video") || name.match(/\.(mp4|mov|avi|mkv)$/)) return <VideoIcon className="w-5 h-5 text-indigo-500 shrink-0" />;
    if (mime.includes("sheet") || mime.includes("excel") || name.match(/\.(xlsx|xls|csv)$/)) return <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />;
    if (mime.includes("document") || mime.includes("word") || name.match(/\.(docx|doc|txt)$/)) return <FileText className="w-5 h-5 text-blue-500 shrink-0" />;
    return <GenericFileIcon className="w-5 h-5 text-slate-400 shrink-0" />;
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
  const currentFolderName = breadcrumbs[breadcrumbs.length - 1]?.name || "My Workspace";

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
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto shadow-xs">
          <HardDrive className="w-8 h-8 text-slate-400" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-bold text-slate-900">No cloud storage connected</h2>
          <p className="text-slate-500 text-xs leading-relaxed">
            {BRAND.name} pools multiple cloud accounts into one virtual workspace. Connect your first Google Drive account to activate the explorer.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/storage")} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all">
          Connect Storage Provider
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-4">
      {/* 1. Synchronized Breadcrumb Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-1 text-xs">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={item.id ?? "root"} className="flex items-center gap-1 shrink-0">
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
            title="List View (Google Drive Standard)"
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

      {/* 2. Action Toolbar */}
      <header className="flex items-center justify-between gap-4 flex-wrap pb-2">
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
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
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
              multiple
              onChange={handleFileSelect}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Upload Files
            </Button>
          </div>
        </div>
      </header>

      {/* 3. Unified Google Drive-Style Explorer Table */}
      {visibleFolders.length === 0 && visibleFiles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
          <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No files or folders in this location</h3>
          <p className="text-slate-400 text-xs mt-1">Upload multiple files or create folders to organize your workspace.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60 h-10">
                <th className="pl-4 pr-2 w-10">
                  <input
                    type="checkbox"
                    checked={selectedFileIds.length === visibleFiles.length && visibleFiles.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedFileIds(visibleFiles.map(f => f.id));
                      else setSelectedFileIds([]);
                    }}
                    className="accent-blue-600 cursor-pointer rounded"
                  />
                </th>
                <th className="px-3">Name</th>
                <th className="px-3 w-28">Owner</th>
                <th className="px-3 w-36">Last Modified</th>
                <th className="px-3 w-28 font-mono">File Size</th>
                <th className="px-3 w-36">Storage Drive</th>
                <th className="pr-4 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {/* FOLDERS LIST FIRST */}
              {visibleFolders.map((folder) => {
                const isSelected = selectedFolderIds.includes(folder.id);
                return (
                  <tr
                    key={`folder-${folder.id}`}
                    onClick={() => {
                      if (isSelected) setSelectedFolderIds(selectedFolderIds.filter(id => id !== folder.id));
                      else setSelectedFolderIds([...selectedFolderIds, folder.id]);
                    }}
                    onDoubleClick={() => handleNavigate(folder.id)}
                    className={`h-12 transition-colors cursor-pointer ${
                      isSelected ? "bg-[#E8F0FE]" : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <td className="pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedFolderIds([...selectedFolderIds, folder.id]);
                          else setSelectedFolderIds(selectedFolderIds.filter(id => id !== folder.id));
                        }}
                        className="accent-blue-600 cursor-pointer rounded"
                      />
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-3">
                        <FolderIcon className="w-5 h-5 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-900 truncate max-w-sm">{folder.name}</span>
                      </div>
                    </td>
                    <td className="px-3 text-slate-500 font-medium">Me</td>
                    <td className="px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(folder.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="px-3 text-slate-400 font-mono text-[11px]">—</td>
                    <td className="px-3 text-slate-500 font-medium">Conflux Workspace</td>
                    <td className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="bg-white border-slate-200 text-slate-700 text-xs rounded-xl">
                          <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={() => handleNavigate(folder.id)}>
                            <Eye className="w-3.5 h-3.5 mr-2 text-blue-600" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={() => setPropertiesItem(folder)}>
                            <Eye className="w-3.5 h-3.5 mr-2" /> Properties
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={() => handleDownloadFolderZip(folder)}>
                            <Download className="w-3.5 h-3.5 mr-2" /> Download ZIP
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={() => { setRenamingItem({ type: "folder", id: folder.id, name: folder.name }); setRenameValue(folder.name); }}>
                            <Edit2 className="w-3.5 h-3.5 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={() => setMoveCopyTarget({ mode: "move_folder", item: folder })}>
                            <Move className="w-3.5 h-3.5 mr-2" /> Move
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => handleDeleteFolder(folder)}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Move to Trash
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}

              {/* FILES LIST SECOND */}
              {visibleFiles.map((file) => {
                const isSelected = selectedFileIds.includes(file.id);
                return (
                  <tr
                    key={`file-${file.id}`}
                    onClick={() => {
                      if (isSelected) setSelectedFileIds(selectedFileIds.filter(id => id !== file.id));
                      else setSelectedFileIds([...selectedFileIds, file.id]);
                    }}
                    onDoubleClick={() => setPreviewFile(file)}
                    className={`h-12 transition-colors cursor-pointer ${
                      isSelected ? "bg-[#E8F0FE]" : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <td className="pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedFileIds([...selectedFileIds, file.id]);
                          else setSelectedFileIds(selectedFileIds.filter(id => id !== file.id));
                        }}
                        className="accent-blue-600 cursor-pointer rounded"
                      />
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-3">
                        <Star
                          onClick={(e) => { e.stopPropagation(); handleToggleFavorite(file.id); }}
                          className={`w-3.5 h-3.5 cursor-pointer transition-colors shrink-0 ${file.is_favorite ? "text-amber-500 fill-amber-500" : "text-slate-300 hover:text-amber-500"}`}
                        />
                        {getFileIcon(file)}
                        <span className="font-semibold text-slate-900 truncate max-w-sm">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-3 text-slate-500 font-medium">Me</td>
                    <td className="px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(file.updated_at || file.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="px-3 text-slate-600 font-mono text-[11px]">{formatSize(file.size)}</td>
                    <td className="px-3 text-slate-500 truncate max-w-[130px] font-medium">{file.storage_account?.nickname || 'Google Drive'}</td>
                    <td className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="bg-white border-slate-200 text-slate-700 text-xs rounded-xl">
                          <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={() => setPreviewFile(file)}>
                            <Eye className="w-3.5 h-3.5 mr-2 text-blue-600" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-slate-100 cursor-pointer" onClick={() => handleDownloadFile(file)}>
                            <Download className="w-3.5 h-3.5 mr-2" /> Download
                          </DropdownMenuItem>
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
      )}

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

      {/* Multi-File Upload Pre-flight Review Modal */}
      <Dialog open={pendingFiles.length > 0} onOpenChange={() => setPendingFiles([])}>
        <DialogContent className="bg-white border border-slate-200 text-slate-900 max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Upload {pendingFiles.length} {pendingFiles.length === 1 ? "File" : "Files"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {pendingFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between pt-2 text-xs">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">{file.name}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">{formatSize(file.size)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setPendingFiles([])} className="flex-1 border-slate-200 text-slate-600 text-xs">
                Cancel
              </Button>
              <Button onClick={executeBatchUpload} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs">
                Upload {pendingFiles.length} {pendingFiles.length === 1 ? "File" : "Files"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Drive Style Background Upload Queue Drawer (Bottom-Right) */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in slide-in-from-bottom-2 duration-180">
          <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold">
              <UploadCloud className="w-4 h-4 text-blue-400" />
              <span>
                {uploadQueue.some(t => t.status === "uploading") 
                  ? `Uploading ${uploadQueue.filter(t => t.status === "completed").length} of ${uploadQueue.length} items`
                  : `${uploadQueue.filter(t => t.status === "completed").length} uploads complete`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsQueueOpen(!isQueueOpen)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                {isQueueOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button onClick={() => setUploadQueue([])} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isQueueOpen && (
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 p-2 text-xs">
              {uploadQueue.map(task => (
                <div key={task.id} className="p-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {task.status === "uploading" && <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
                    {task.status === "completed" && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {task.status === "error" && <X className="w-4 h-4 text-red-600 shrink-0" />}
                    {task.status === "pending" && <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />}
                    <span className="font-semibold text-slate-800 truncate">{task.file.name}</span>
                  </div>
                  <div className="shrink-0">
                    {task.status === "error" && (
                      <Button size="sm" variant="ghost" onClick={() => handleRetryUpload(task)} className="h-6 text-[10px] text-red-600 hover:bg-red-50 p-1">
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry
                      </Button>
                    )}
                    {task.status === "completed" && <span className="text-[10px] font-bold text-emerald-600">Done</span>}
                    {task.status === "uploading" && <span className="text-[10px] font-mono text-blue-600">{task.progress}%</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Undo Toast Notification (8-second Window) */}
      {undoToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white rounded-2xl px-4 py-3 shadow-xl flex items-center justify-between gap-4 text-xs animate-in slide-in-from-bottom-2 fade-in duration-180 max-w-sm border border-slate-800">
          <span className="truncate max-w-[200px]">Moved <strong className="text-white">{undoToast.name}</strong> to trash.</span>
          <Button size="sm" onClick={handleUndo} className="bg-blue-600 hover:bg-blue-500 text-white h-7 text-xs font-semibold px-3 shrink-0">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Undo
          </Button>
        </div>
      )}
    </div>
  );
}
