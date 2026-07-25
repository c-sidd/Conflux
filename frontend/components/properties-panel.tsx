"use client";

import { X, HardDrive, File as FileIcon, Folder as FolderIcon, Calendar, Hash, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

interface PropertiesPanelProps {
  item: any | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (item: any) => void;
}

export default function PropertiesPanel({ item, isOpen, onClose, onDownload }: PropertiesPanelProps) {
  if (!isOpen || !item) return null;

  const isFolder = !item.mime_type && item.name && !item.size;

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 GB";
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(2)} GB (${bytes.toLocaleString()} bytes)`;
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="space-y-6 overflow-y-auto pr-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2 truncate">
            {isFolder ? <FolderIcon className="w-5 h-5 text-blue-400 shrink-0" /> : <FileIcon className="w-5 h-5 text-purple-400 shrink-0" />}
            Properties
          </h3>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Item Title */}
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Name</p>
          <p className="text-sm font-semibold text-white break-all">{item.name}</p>
        </div>

        {/* Details Grid */}
        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider block">Type</span>
            <span className="text-zinc-300 font-mono">{item.mime_type || (isFolder ? "Folder" : "Unknown")}</span>
          </div>

          {!isFolder && (
            <div className="space-y-1">
              <span className="text-zinc-500 font-semibold uppercase tracking-wider block">Size</span>
              <span className="text-zinc-300">{formatSize(item.size)}</span>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Created
            </span>
            <span className="text-zinc-300">{new Date(item.created_at).toLocaleString()}</span>
          </div>

          <div className="space-y-1">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Modified
            </span>
            <span className="text-zinc-300">{new Date(item.updated_at).toLocaleString()}</span>
          </div>

          {item.storage_account && (
            <div className="space-y-1 border-t border-zinc-800 pt-3">
              <span className="text-zinc-500 font-semibold uppercase tracking-wider block flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-blue-400" /> Storage Drive
              </span>
              <span className="text-blue-400 font-semibold block">{item.storage_account.nickname}</span>
              <span className="text-zinc-400 text-[11px] block">{item.storage_account.provider_email}</span>
            </div>
          )}

          <div className="space-y-1 border-t border-zinc-800 pt-3">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider block">Workspace Path</span>
            <code className="text-blue-300 bg-zinc-950 px-2 py-1 rounded block text-[11px] break-all">
              {BRAND.workspaceFolder} / {item.name}
            </code>
          </div>

          {item.checksum && (
            <div className="space-y-1">
              <span className="text-zinc-500 font-semibold uppercase tracking-wider block flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> MD5 Checksum
              </span>
              <span className="text-zinc-400 font-mono text-[10px] break-all block">{item.checksum}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-zinc-800 flex gap-2">
        {!isFolder && onDownload && (
          <Button onClick={() => onDownload(item)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download
          </Button>
        )}
        {item.web_view_link && (
          <Button variant="outline" onClick={() => window.open(item.web_view_link, "_blank")} className="border-zinc-800 text-zinc-300 hover:text-white text-xs">
            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Drive
          </Button>
        )}
      </div>
    </div>
  );
}
