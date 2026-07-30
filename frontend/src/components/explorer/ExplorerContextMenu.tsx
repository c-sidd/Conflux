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

  return (
    <div
      style={{ top: y, left: x }}
      className="fixed z-50 w-48 bg-white dark:bg-[#22223B] border border-slate-200 dark:border-[#4A4E69]/40 rounded-2xl shadow-2xl p-1.5 text-xs text-[#0F172A] dark:text-[#F2E9E4] space-y-0.5 select-none"
    >
      {!isFile ? (
        <button
          onClick={() => {
            setCurrentFolderId(item.id);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-[#4A4E69]/40 text-[#2563EB] font-semibold cursor-pointer"
        >
          <FolderOpen className="w-4 h-4" /> Open Folder
        </button>
      ) : (
        <button
          onClick={() => {
            onOpenPreview();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#4A4E69]/40 font-semibold cursor-pointer"
        >
          <FolderOpen className="w-4 h-4 text-[#2563EB]" /> Preview File
        </button>
      )}

      <a
        href={downloadUrl}
        download
        onClick={onClose}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#4A4E69]/40 font-semibold cursor-pointer text-[#0F172A] dark:text-[#F2E9E4]"
      >
        <Download className="w-4 h-4 text-emerald-500" /> {isFile ? "Download" : "Download ZIP"}
      </a>

      <button
        onClick={() => {
          onOpenRename();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#4A4E69]/40 font-semibold cursor-pointer"
      >
        <Edit3 className="w-4 h-4 text-purple-500" /> Rename
      </button>

      {isFile && (
        <button
          onClick={() => {
            toggleFavorite(item);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#4A4E69]/40 font-semibold cursor-pointer"
        >
          <Star className={`w-4 h-4 ${item.is_favorite ? "text-amber-500 fill-current" : "text-slate-400"}`} />
          {item.is_favorite ? "Unstar" : "Add to Starred"}
        </button>
      )}

      <button
        onClick={() => {
          onOpenProperties();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#4A4E69]/40 font-semibold cursor-pointer"
      >
        <Info className="w-4 h-4 text-slate-500" /> Properties
      </button>

      <div className="border-t border-slate-100 dark:border-[#4A4E69]/40 my-1" />

      <button
        onClick={() => {
          toggleSelection(`${target.type}-${item.id}`);
          deleteSelected();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold cursor-pointer"
      >
        <Trash2 className="w-4 h-4" /> Delete
      </button>
    </div>
  );
}
