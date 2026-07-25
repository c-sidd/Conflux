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
    if (!bytes || bytes === 0) return "0 B";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-slate-200 shadow-xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
      <div className="p-5 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {isFolder ? <FolderIcon className="w-4 h-4 text-blue-600" /> : <FileIcon className="w-4 h-4 text-purple-600" />}
            Properties
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Name</span>
            <span className="font-bold text-slate-900 text-sm block break-all">{item.name}</span>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Type</span>
            <span className="text-slate-700 font-semibold block">{isFolder ? "Virtual Folder" : item.mime_type || "File"}</span>
          </div>

          {!isFolder && (
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Size</span>
              <span className="text-slate-900 font-mono font-bold block">{formatSize(item.size)}</span>
            </div>
          )}

          {item.storage_account && (
            <div className="space-y-1 border-t border-slate-100 pt-3">
              <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-blue-600" /> Storage Drive
              </span>
              <span className="text-blue-600 font-bold block">{item.storage_account.nickname}</span>
              <span className="text-slate-500 text-[11px] block">{item.storage_account.provider_email}</span>
            </div>
          )}

          <div className="space-y-1 border-t border-slate-100 pt-3">
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Workspace Path</span>
            <code className="text-blue-700 bg-slate-100 px-2 py-1 rounded block text-[11px] break-all font-mono border border-slate-200">
              {BRAND.workspaceFolder} / {item.name}
            </code>
          </div>

          {item.checksum && (
            <div className="space-y-1 border-t border-slate-100 pt-3">
              <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px] flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> MD5 Checksum
              </span>
              <span className="text-slate-600 font-mono text-[10px] break-all block bg-slate-50 p-2 rounded border border-slate-200">{item.checksum}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50">
        {!isFolder && onDownload && (
          <Button onClick={() => onDownload(item)} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download File
          </Button>
        )}
        <Button variant="outline" onClick={onClose} className="w-full border-slate-200 text-slate-600 text-xs">
          Close Panel
        </Button>
      </div>
    </div>
  );
}
