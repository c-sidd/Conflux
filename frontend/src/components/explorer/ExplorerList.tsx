import React from "react";
import { useExplorer } from "./ExplorerContext";
import { API_BASE_URL } from "@/api/client";
import {
  Folder, FileText, Image as ImageIcon, Film, FileSpreadsheet, Star, Download
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
    setCurrentFolderId, toggleFavorite, searchQuery, filter
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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (!mimeType) return <FileText className="w-5 h-5 text-[#2563EB] shrink-0" />;
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-emerald-500 shrink-0" />;
    if (mimeType.includes("pdf")) return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
    if (mimeType.startsWith("video/")) return <Film className="w-5 h-5 text-purple-500 shrink-0" />;
    if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
    }
    return <FileText className="w-5 h-5 text-[#2563EB] shrink-0" />;
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold uppercase text-[10px] tracking-wider h-10">
              <th className="py-2 px-4 w-10 text-center">
                <span className="sr-only">Select</span>
              </th>
              <th className="py-2 px-4">Name</th>
              <th className="py-2 px-4 w-32">Owner</th>
              <th className="py-2 px-4 w-36">Last Modified</th>
              <th className="py-2 px-4 w-28">File Size</th>
              <th className="py-2 px-4 w-20 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {/* FOLDERS SECTION */}
            {filteredFolders.length > 0 && (
              <>
                <tr className="bg-[#F8FAFC]">
                  <td colSpan={6} className="py-1.5 px-4 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
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
                      className={`h-12 hover:bg-[#F8FAFC] transition-colors cursor-pointer select-none border-b border-[#E2E8F0] ${
                        isSelected ? "bg-[#DBEAFE] font-bold text-[#2563EB]" : ""
                      }`}
                    >
                      <td className="py-2 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-4 font-bold text-[#0F172A] flex items-center gap-3 h-12">
                        <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </td>
                      <td className="py-2 px-4 text-[#475569] font-medium">Me</td>
                      <td className="py-2 px-4 text-[#475569]">{new Date(folder.updated_at).toLocaleDateString()}</td>
                      <td className="py-2 px-4 text-[#94A3B8] font-mono">—</td>
                      <td className="py-2 px-4 text-right">
                        <a
                          href={`${API_BASE_URL}/api/v1/folders/${folder.id}/download-zip/${token ? `?token=${token}` : ""}`}
                          onClick={(e) => e.stopPropagation()}
                          download
                          title="Download Folder ZIP"
                          className="p-1.5 text-[#94A3B8] hover:text-[#2563EB] inline-block rounded-lg hover:bg-white"
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
                <tr className="bg-[#F8FAFC]">
                  <td colSpan={6} className="py-1.5 px-4 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
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
                      className={`h-12 hover:bg-[#F8FAFC] transition-colors cursor-pointer select-none border-b border-[#E2E8F0] ${
                        isSelected ? "bg-[#DBEAFE] font-bold text-[#2563EB]" : ""
                      }`}
                    >
                      <td className="py-2 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-4 text-[#0F172A] font-medium flex items-center gap-3 h-12">
                        {getFileIcon(file.mime_type)}
                        <span className="truncate max-w-sm" title={file.name}>
                          {file.name}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-[#475569] font-medium">Me</td>
                      <td className="py-2 px-4 text-[#475569]">{new Date(file.updated_at).toLocaleDateString()}</td>
                      <td className="py-2 px-4 text-[#0F172A] font-mono font-medium">{formatSize(file.size)}</td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(file);
                            }}
                            className={`p-1.5 rounded-lg hover:bg-white ${
                              file.is_favorite ? "text-amber-400" : "text-[#94A3B8] hover:text-amber-400"
                            }`}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                          <a
                            href={`${API_BASE_URL}/api/v1/files/${file.id}/download/${token ? `?token=${token}` : ""}`}
                            onClick={(e) => e.stopPropagation()}
                            download
                            title="Download File"
                            className="p-1.5 text-[#94A3B8] hover:text-[#2563EB] rounded-lg hover:bg-white"
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
