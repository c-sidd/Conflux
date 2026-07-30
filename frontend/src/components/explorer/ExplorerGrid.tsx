import React from "react";
import { useExplorer } from "./ExplorerContext";
import { API_BASE_URL } from "@/api/client";
import { Folder, FileText, Image as ImageIcon, Film, Archive, Star, HardDrive, Download, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ExplorerGrid() {
  const {
    files, folders, currentFolderId, selectedIds, toggleSelection,
    setCurrentFolderId, toggleFavorite, searchQuery, filter
  } = useExplorer();

  let filteredFolders = folders.filter((f) => f.parent === currentFolderId && !f.is_trashed);
  let filteredFiles = files.filter((f) => f.folder === currentFolderId && !f.is_trashed);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredFolders = folders.filter((f) => f.name.toLowerCase().includes(q) && !f.is_trashed);
    filteredFiles = files.filter((f) => f.name.toLowerCase().includes(q) && !f.is_trashed);
  }

  if (filter === "favorites") {
    filteredFiles = filteredFiles.filter((f) => f.is_favorite);
    filteredFolders = [];
  } else if (filter === "images") {
    filteredFiles = filteredFiles.filter((f) => f.mime_type?.startsWith("image/"));
    filteredFolders = [];
  } else if (filter === "pdf") {
    filteredFiles = filteredFiles.filter((f) => f.mime_type?.includes("pdf"));
    filteredFolders = [];
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="p-4 space-y-6">
      {filteredFolders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Folders ({filteredFolders.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredFolders.map((folder) => {
              const itemKey = `folder-${folder.id}`;
              const isSelected = selectedIds.has(itemKey);
              return (
                <Card
                  key={folder.id}
                  onClick={(e) => toggleSelection(itemKey, e.ctrlKey || e.metaKey)}
                  onDoubleClick={() => setCurrentFolderId(folder.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected ? "bg-blue-50/80 border-blue-400 shadow-2xs" : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between overflow-hidden">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 truncate">{folder.name}</span>
                    </div>
                    <a
                      href={`${API_BASE_URL}/api/v1/folders/${folder.id}/download-zip/`}
                      onClick={(e) => e.stopPropagation()}
                      download
                      title="Download Folder ZIP"
                      className="p-1 text-slate-400 hover:text-blue-600"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {filteredFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Files ({filteredFiles.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFiles.map((file) => {
              const itemKey = `file-${file.id}`;
              const isSelected = selectedIds.has(itemKey);
              return (
                <Card
                  key={file.id}
                  onClick={(e) => toggleSelection(itemKey, e.ctrlKey || e.metaKey)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-3 ${
                    isSelected ? "bg-blue-50/80 border-blue-400 shadow-2xs" : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <FileText className="w-8 h-8 text-blue-500" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(file);
                      }}
                      className={`p-1 ${file.is_favorite ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{formatSize(file.size)}</span>
                      <span>{new Date(file.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-500 font-semibold truncate">
                      <HardDrive className="w-3 h-3 text-blue-500 shrink-0" />
                      {file.storage_account?.nickname || "Google Drive"}
                    </span>
                    <a
                      href={`${API_BASE_URL}/api/v1/files/${file.id}/download/`}
                      onClick={(e) => e.stopPropagation()}
                      download
                      title="Download File"
                      className="p-1 text-slate-400 hover:text-blue-600"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
