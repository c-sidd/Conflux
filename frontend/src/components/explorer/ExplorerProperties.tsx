import React from "react";
import { API_BASE_URL } from "@/api/client";
import { X, FileText, Folder, HardDrive, Calendar, Database, Hash, Download, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertiesProps {
  item: { type: "file" | "folder"; data: any };
  onClose: () => void;
  onDelete?: () => void;
}

export function ExplorerProperties({ item, onClose, onDelete }: PropertiesProps) {
  const isFile = item.type === "file";
  const data = item.data;

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const downloadUrl = isFile
    ? `${API_BASE_URL}/api/v1/files/${data.id}/download/`
    : `${API_BASE_URL}/api/v1/folders/${data.id}/download-zip/`;

  return (
    <div className="w-80 bg-white dark:bg-[#22223B] border-l border-slate-200 dark:border-[#4A4E69]/40 p-5 space-y-5 text-xs text-[#22223B] dark:text-[#F2E9E4] shrink-0 overflow-y-auto select-none">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#4A4E69]/40 pb-3">
        <h3 className="font-bold text-[#22223B] dark:text-white text-sm">Item Details</h3>
        <button onClick={onClose} className="p-1 text-[#9A8C98] hover:text-[#22223B] dark:hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center space-y-3 py-2">
        <div className="w-14 h-14 rounded-2xl bg-[#4A4E69]/20 border border-[#4A4E69]/40 text-[#4A4E69] dark:text-[#F2E9E4] flex items-center justify-center mx-auto">
          {isFile ? <FileText className="w-7 h-7 text-[#4A4E69] dark:text-[#9A8C98]" /> : <Folder className="w-7 h-7 text-amber-500" />}
        </div>
        <div>
          <h4 className="font-bold text-[#22223B] dark:text-white text-xs truncate max-w-full" title={data.name}>
            {data.name}
          </h4>
          <p className="text-[11px] text-[#9A8C98] mt-0.5">{isFile ? data.mime_type || "Document File" : "Virtual Folder"}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href={downloadUrl}
          download
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#4A4E69] hover:bg-[#9A8C98] text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" /> Download
        </a>
        {onDelete && (
          <Button onClick={onDelete} variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-4 divide-y divide-slate-100 dark:divide-[#4A4E69]/30">
        <div className="pt-3 space-y-2">
          <span className="text-[10px] font-bold text-[#9A8C98] uppercase tracking-wider">Storage Metadata</span>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#C9ADA7]"><Database className="w-3.5 h-3.5" /> Size:</span>
            <span className="font-mono font-bold">{isFile ? formatSize(data.size) : "—"}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#C9ADA7]"><HardDrive className="w-3.5 h-3.5" /> Account:</span>
            <span className="font-semibold">{data.storage_account?.nickname || "Google Drive"}</span>
          </div>
        </div>

        <div className="pt-3 space-y-2">
          <span className="text-[10px] font-bold text-[#9A8C98] uppercase tracking-wider">Technical Attributes</span>
          <div className="flex items-center justify-between">
            <span className="text-[#6B7280] dark:text-[#C9ADA7]">Type:</span>
            <span className="font-mono text-[11px] truncate max-w-[140px]">{data.mime_type || (isFile ? "File" : "Folder")}</span>
          </div>
          {data.provider_file_id && (
            <div className="flex items-center justify-between pt-1">
              <span className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#C9ADA7]"><Hash className="w-3.5 h-3.5" /> Provider ID:</span>
              <span className="font-mono text-[10px] truncate max-w-[130px]">{data.provider_file_id}</span>
            </div>
          )}
        </div>

        <div className="pt-3 space-y-2">
          <span className="text-[10px] font-bold text-[#9A8C98] uppercase tracking-wider">Dates</span>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#C9ADA7]"><Calendar className="w-3.5 h-3.5" /> Last Modified:</span>
            <span>{new Date(data.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
