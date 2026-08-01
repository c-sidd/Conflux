import React from "react";
import { useExplorer } from "./ExplorerContext";
import { API_BASE_URL } from "@/api/client";
import {
  Folder, FileText, Image as ImageIcon, Film, Archive, Star, Download, ArrowUpDown
} from "lucide-react";
import { FileItem } from "@/types";

interface ExplorerListProps {
  onOpenRename?: (item: { type: "file" | "folder"; data: any }) => void;
  onOpenProperties?: (item: { type: "file" | "folder"; data: any }) => void;
  onOpenPreview?: (file: FileItem) => void;
}

export function ExplorerList({ onOpenRename, onOpenProperties, onOpenPreview }: ExplorerListProps) {
  const {
    files, folders, currentFolderId, selectedIds, toggleSelection,
    setCurrentFolderId, toggleFavorite, searchQuery, filter, sortField, setSortField
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
    if (bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (!mimeType) return <FileText className="w-5 h-5 text-file-icon shrink-0" />;
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-image-icon shrink-0" />;
    if (mimeType.includes("pdf")) return <FileText className="w-5 h-5 text-pdf-icon shrink-0" />;
    if (mimeType.startsWith("video/")) return <Film className="w-5 h-5 text-video-icon shrink-0" />;
    if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar") || mimeType.includes("compressed")) {
      return <Archive className="w-5 h-5 text-archive-icon shrink-0" />;
    }
    return <FileText className="w-5 h-5 text-file-icon shrink-0" />;
  };

  return (
    <div className="p-4 space-y-6 cfx-animate-in">
      <div className="bg-bg-surface border border-border rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--shadow-sm)]">
        <table className="w-full text-left text-[var(--font-size-caption)] border-collapse">
          <thead>
            <tr className="bg-bg-sunken border-b border-border text-text-muted font-bold uppercase text-[var(--font-size-label)] tracking-wider h-10 select-none">
              <th className="py-2 px-4 w-10 text-center">
                <span className="sr-only">Select</span>
              </th>
              <th
                onClick={() => setSortField("name")}
                className="py-2 px-4 cursor-pointer hover:text-text-primary transition-colors duration-[var(--duration-fast)]"
              >
                <div className="flex items-center gap-1">
                  <span>Name</span>
                  {sortField === "name" && <ArrowUpDown className="w-3 h-3 text-primary" />}
                </div>
              </th>
              <th className="py-2 px-4 w-32">Owner</th>
              <th
                onClick={() => setSortField("updated_at")}
                className="py-2 px-4 w-36 cursor-pointer hover:text-text-primary transition-colors duration-[var(--duration-fast)]"
              >
                <div className="flex items-center gap-1">
                  <span>Last Modified</span>
                  {sortField === "updated_at" && <ArrowUpDown className="w-3 h-3 text-primary" />}
                </div>
              </th>
              <th
                onClick={() => setSortField("size")}
                className="py-2 px-4 w-28 cursor-pointer hover:text-text-primary transition-colors duration-[var(--duration-fast)]"
              >
                <div className="flex items-center gap-1">
                  <span>File Size</span>
                  {sortField === "size" && <ArrowUpDown className="w-3 h-3 text-primary" />}
                </div>
              </th>
              <th className="py-2 px-4 w-20 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* FOLDERS SECTION */}
            {filteredFolders.length > 0 && (
              <>
                <tr className="bg-bg-sunken">
                  <td colSpan={6} className="py-1.5 px-4 text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">
                    Folders ({filteredFolders.length})
                  </td>
                </tr>
                {filteredFolders.map((folder) => {
                  const itemKey = `folder-${folder.id}`;
                  const isSelected = selectedIds.has(itemKey);
                  return (
                    <tr
                      key={folder.id}
                      onClick={(e) => toggleSelection(itemKey, e.ctrlKey || e.metaKey)}
                      onDoubleClick={() => setCurrentFolderId(folder.id)}
                      className={`h-12 hover:bg-bg-sunken transition-colors duration-[var(--duration-fast)] cursor-pointer select-none ${
                        isSelected ? "bg-bg-selected font-bold text-primary" : ""
                      }`}
                    >
                      <td className="py-2 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer accent-[var(--color-primary)]"
                        />
                      </td>
                      <td className="py-2 px-4 font-bold text-text-primary flex items-center gap-3 h-12">
                        <Folder className="w-5 h-5 text-folder-icon shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </td>
                      <td className="py-2 px-4 text-text-secondary font-medium">Me</td>
                      <td className="py-2 px-4 text-text-secondary">{new Date(folder.updated_at).toLocaleDateString()}</td>
                      <td className="py-2 px-4 text-text-muted font-mono">—</td>
                      <td className="py-2 px-4 text-right">
                        <a
                          href={`${API_BASE_URL}/api/v1/folders/${folder.id}/download-zip/${token ? `?token=${token}` : ""}`}
                          onClick={(e) => e.stopPropagation()}
                          download
                          title="Download Folder ZIP"
                          className="p-1.5 text-text-muted hover:text-primary inline-block rounded-[var(--radius-md)] hover:bg-bg-surface transition-colors duration-[var(--duration-fast)]"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </>
            )}

            {/* FILES SECTION */}
            {filteredFiles.length > 0 && (
              <>
                <tr className="bg-bg-sunken">
                  <td colSpan={6} className="py-1.5 px-4 text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">
                    Files ({filteredFiles.length})
                  </td>
                </tr>
                {filteredFiles.map((file) => {
                  const itemKey = `file-${file.id}`;
                  const isSelected = selectedIds.has(itemKey);
                  return (
                    <tr
                      key={file.id}
                      onClick={(e) => toggleSelection(itemKey, e.ctrlKey || e.metaKey)}
                      onDoubleClick={() => onOpenPreview && onOpenPreview(file)}
                      className={`h-12 hover:bg-bg-sunken transition-colors duration-[var(--duration-fast)] cursor-pointer select-none ${
                        isSelected ? "bg-bg-selected font-bold text-primary" : ""
                      }`}
                    >
                      <td className="py-2 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer accent-[var(--color-primary)]"
                        />
                      </td>
                      <td className="py-2 px-4 text-text-primary font-medium flex items-center gap-3 h-12">
                        {getFileIcon(file.mime_type)}
                        <span className="truncate max-w-sm" title={file.name}>
                          {file.name}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-text-secondary font-medium">Me</td>
                      <td className="py-2 px-4 text-text-secondary">{new Date(file.updated_at).toLocaleDateString()}</td>
                      <td className="py-2 px-4 text-text-primary font-mono font-medium">{formatSize(file.size)}</td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(file);
                            }}
                            className={`p-1.5 rounded-[var(--radius-md)] hover:bg-bg-surface transition-colors duration-[var(--duration-fast)] ${
                              file.is_favorite ? "text-brand-gold" : "text-text-muted hover:text-brand-gold"
                            }`}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                          <a
                            href={`${API_BASE_URL}/api/v1/files/${file.id}/download/${token ? `?token=${token}` : ""}`}
                            onClick={(e) => e.stopPropagation()}
                            download
                            title="Download File"
                            className="p-1.5 text-text-muted hover:text-primary rounded-[var(--radius-md)] hover:bg-bg-surface transition-colors duration-[var(--duration-fast)]"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
