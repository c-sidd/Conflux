import React from "react";
import { useExplorer } from "./ExplorerContext";
import { API_BASE_URL } from "@/api/client";
import { Folder, FileText, Image as ImageIcon, Film, Archive, Star, HardDrive, Download } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ExplorerGrid() {
  const {
    files, folders, currentFolderId, selectedIds, toggleSelection,
    setCurrentFolderId, toggleFavorite, searchQuery, filter, sortField
  } = useExplorer();

  const token = localStorage.getItem("conflux_access_token") || "";

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

  // Multi-attribute sorting implementation
  const sortItems = <T extends { name: string; size?: number; updated_at: string }>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      if (sortField === "name") {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      } else if (sortField === "size") {
        const sizeA = a.size || 0;
        const sizeB = b.size || 0;
        return sizeB - sizeA;
      } else if (sortField === "updated_at") {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      return 0;
    });
  };

  filteredFolders = sortItems(filteredFolders);
  filteredFiles = sortItems(filteredFiles);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (!mimeType) return <FileText className="w-8 h-8 text-file-icon" />;
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-8 h-8 text-image-icon" />;
    if (mimeType.includes("pdf")) return <FileText className="w-8 h-8 text-pdf-icon" />;
    if (mimeType.startsWith("video/")) return <Film className="w-8 h-8 text-video-icon" />;
    if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar") || mimeType.includes("compressed")) {
      return <Archive className="w-8 h-8 text-archive-icon" />;
    }
    return <FileText className="w-8 h-8 text-file-icon" />;
  };

  return (
    <div className="p-4 space-y-6 cfx-animate-in">
      {filteredFolders.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">Folders ({filteredFolders.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredFolders.map((folder) => {
              const itemKey = `folder-${folder.id}`;
              const isSelected = selectedIds.has(itemKey);
              return (
                <Card
                  key={folder.id}
                  onClick={(e) => toggleSelection(itemKey, e.ctrlKey || e.metaKey)}
                  onDoubleClick={() => setCurrentFolderId(folder.id)}
                  className={`p-3 cursor-pointer select-none hover:shadow-[var(--shadow-md)] ${
                    isSelected
                      ? "bg-bg-selected border-primary shadow-[var(--shadow-sm)] ring-1 ring-primary/20"
                      : "hover:border-border-strong"
                  }`}
                >
                  <div className="flex items-center justify-between overflow-hidden">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Folder className="w-5 h-5 text-folder-icon shrink-0" />
                      <span className={`text-[var(--font-size-caption)] font-semibold truncate ${isSelected ? "text-primary font-bold" : "text-text-primary"}`}>
                        {folder.name}
                      </span>
                    </div>
                    <a
                      href={`${API_BASE_URL}/api/v1/folders/${folder.id}/download-zip/${token ? `?token=${token}` : ""}`}
                      onClick={(e) => e.stopPropagation()}
                      download
                      title="Download Folder ZIP"
                      className="p-1 text-text-muted hover:text-primary transition-colors duration-[var(--duration-fast)]"
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
        <div className="space-y-2.5">
          <h3 className="text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">Files ({filteredFiles.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFiles.map((file) => {
              const itemKey = `file-${file.id}`;
              const isSelected = selectedIds.has(itemKey);
              return (
                <Card
                  key={file.id}
                  onClick={(e) => toggleSelection(itemKey, e.ctrlKey || e.metaKey)}
                  className={`p-4 cursor-pointer select-none space-y-3 hover:shadow-[var(--shadow-md)] ${
                    isSelected
                      ? "bg-bg-selected border-primary shadow-[var(--shadow-sm)] ring-1 ring-primary/20"
                      : "hover:border-border-strong"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-[var(--radius-lg)] bg-bg-sunken border border-border-subtle">
                      {getFileIcon(file.mime_type)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(file);
                      }}
                      className={`p-1 transition-colors duration-[var(--duration-fast)] ${file.is_favorite ? "text-brand-gold" : "text-text-disabled hover:text-brand-gold"}`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  <div>
                    <h4 className={`text-[var(--font-size-caption)] font-bold truncate ${isSelected ? "text-primary" : "text-text-primary"}`} title={file.name}>
                      {file.name}
                    </h4>
                    <div className="flex items-center justify-between text-[var(--font-size-label)] text-text-muted mt-1">
                      <span>{formatSize(file.size)}</span>
                      <span>{new Date(file.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[var(--font-size-label)] text-text-muted">
                    <span className="flex items-center gap-1 text-text-secondary font-medium truncate">
                      <HardDrive className="w-3 h-3 text-secondary shrink-0" />
                      {file.storage_account?.nickname || "Google Drive"}
                    </span>
                    <a
                      href={`${API_BASE_URL}/api/v1/files/${file.id}/download/${token ? `?token=${token}` : ""}`}
                      onClick={(e) => e.stopPropagation()}
                      download
                      title="Download File"
                      className="p-1 text-text-muted hover:text-primary transition-colors duration-[var(--duration-fast)]"
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
