import React from "react";
import { useExplorer } from "./ExplorerContext";
import { API_BASE_URL } from "@/api/client";
import { FolderOpen, Download, Edit3, Star, Trash2, Info } from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  target: { type: "file" | "folder"; id: number; data: any };
  onClose: () => void;
  onOpenProperties: () => void;
  onOpenRename: () => void;
  onOpenPreview: () => void;
}

export function ExplorerContextMenu({ x, y, target, onClose, onOpenProperties, onOpenRename, onOpenPreview }: ContextMenuProps) {
  const { setCurrentFolderId, toggleFavorite, deleteSelected, toggleSelection } = useExplorer();
  const token = localStorage.getItem("conflux_access_token") || "";

  React.useEffect(() => {
    const handleOutsideClick = () => onClose();
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [onClose]);

  const isFile = target.type === "file";
  const item = target.data;

  const downloadUrl = isFile
    ? `${API_BASE_URL}/api/v1/files/${item.id}/download/${token ? `?token=${token}` : ""}`
    : `${API_BASE_URL}/api/v1/folders/${item.id}/download-zip/${token ? `?token=${token}` : ""}`;

  const menuItemBase = "w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-[var(--font-size-caption)] font-medium cursor-pointer transition-colors duration-[var(--duration-fast)]";

  return (
    <div
      style={{ top: y, left: x }}
      className="fixed z-50 w-52 bg-bg-surface border border-border rounded-[var(--radius-xl)] shadow-[var(--shadow-float)] p-1.5 text-text-primary space-y-0.5 select-none cfx-scale-in"
    >
      {!isFile ? (
        <button
          onClick={() => { setCurrentFolderId(item.id); onClose(); }}
          className={`${menuItemBase} text-primary hover:bg-primary-light`}
        >
          <FolderOpen className="w-4 h-4" /> Open Folder
        </button>
      ) : (
        <button
          onClick={() => { onOpenPreview(); onClose(); }}
          className={`${menuItemBase} hover:bg-bg-sunken`}
        >
          <FolderOpen className="w-4 h-4 text-primary" /> Preview File
        </button>
      )}

      <a
        href={downloadUrl}
        download
        onClick={onClose}
        className={`${menuItemBase} hover:bg-bg-sunken`}
      >
        <Download className="w-4 h-4 text-success" /> {isFile ? "Download" : "Download ZIP"}
      </a>

      <button
        onClick={() => { onOpenRename(); onClose(); }}
        className={`${menuItemBase} hover:bg-bg-sunken`}
      >
        <Edit3 className="w-4 h-4 text-secondary" /> Rename
      </button>

      {isFile && (
        <button
          onClick={() => { toggleFavorite(item); onClose(); }}
          className={`${menuItemBase} hover:bg-bg-sunken`}
        >
          <Star className={`w-4 h-4 ${item.is_favorite ? "text-brand-gold fill-current" : "text-text-muted"}`} />
          {item.is_favorite ? "Unstar" : "Add to Starred"}
        </button>
      )}

      <button
        onClick={() => { onOpenProperties(); onClose(); }}
        className={`${menuItemBase} hover:bg-bg-sunken`}
      >
        <Info className="w-4 h-4 text-accent" /> Properties
      </button>

      <div className="border-t border-border my-1" />

      <button
        onClick={() => { toggleSelection(`${target.type}-${item.id}`); deleteSelected(); onClose(); }}
        className={`${menuItemBase} text-danger hover:bg-danger-light`}
      >
        <Trash2 className="w-4 h-4" /> Delete
      </button>
    </div>
  );
}
