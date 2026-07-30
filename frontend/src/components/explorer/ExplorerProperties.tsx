import React from "react";
import { X, FileText, Folder, HardDrive, Calendar, Database, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertiesProps {
  item: { type: "file" | "folder"; data: any };
  onClose: () => void;
}

export function ExplorerProperties({ item, onClose }: PropertiesProps) {
  const isFile = item.type === "file";
  const data = item.data;

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 p-5 space-y-5 text-xs text-slate-800 dark:text-slate-100 shrink-0">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Item Details</h3>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center space-y-2 py-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
          {isFile ? <FileText className="w-6 h-6" /> : <Folder className="w-6 h-6 text-amber-500" />}
        </div>
        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-full" title={data.name}>
          {data.name}
        </h4>
      </div>

      <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
        <div className="pt-2 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage Details</span>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-blue-500" /> Size:</span>
            <span className="font-mono font-bold">{isFile ? formatSize(data.size) : "—"}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-1">
            <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-blue-500" /> Provider:</span>
            <span className="font-semibold">{data.storage_account?.nickname || "Google Drive"}</span>
          </div>
        </div>

        <div className="pt-2 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Technical Attributes</span>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Type:</span>
            <span className="font-mono text-[11px] truncate max-w-[140px]">{data.mime_type || (isFile ? "File" : "Folder")}</span>
          </div>
          {data.provider_file_id && (
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-1">
              <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" /> File ID:</span>
              <span className="font-mono text-[10px] truncate max-w-[130px]">{data.provider_file_id}</span>
            </div>
          )}
        </div>

        <div className="pt-2 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dates</span>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Modified:</span>
            <span>{new Date(data.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
