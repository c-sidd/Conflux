import React from "react";
import { API_BASE_URL } from "@/api/client";
import { X, FileText, Folder, HardDrive, Calendar, Database, Hash, Download, Trash2, Mail, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PropertiesProps {
  item: { type: "file" | "folder"; data: any };
  onClose: () => void;
  onDelete?: () => void;
}

export function ExplorerProperties({ item, onClose, onDelete }: PropertiesProps) {
  const isFile = item.type === "file";
  const data = item.data;

  const token = localStorage.getItem("conflux_access_token") || "";

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const downloadUrl = isFile
    ? `${API_BASE_URL}/api/v1/files/${data.id}/download/${token ? `?token=${token}` : ""}`
    : `${API_BASE_URL}/api/v1/folders/${data.id}/download-zip/${token ? `?token=${token}` : ""}`;

  const handleDownloadClick = () => {
    toast.info(isFile ? "Preparing file download..." : "Generating folder ZIP archive...");
  };

  return (
    <div className="w-80 bg-white dark:bg-[#22223B] border-l border-[#E2E8F0] dark:border-[#4A4E69]/40 p-5 space-y-5 text-xs text-[#0F172A] dark:text-[#F2E9E4] shrink-0 overflow-y-auto select-none">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#4A4E69]/40 pb-3">
        <h3 className="font-bold text-[#0F172A] dark:text-white text-sm">Item Details & Storage</h3>
        <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center space-y-3 py-2">
        <div className="w-14 h-14 rounded-2xl bg-[#DBEAFE] dark:bg-[#4A4E69]/20 border border-[#2563EB]/20 text-[#2563EB] dark:text-[#F2E9E4] flex items-center justify-center mx-auto shadow-2xs">
          {isFile ? <FileText className="w-7 h-7 text-[#2563EB]" /> : <Folder className="w-7 h-7 text-amber-500" />}
        </div>
        <div>
          <h4 className="font-bold text-[#0F172A] dark:text-white text-xs truncate max-w-full" title={data.name}>
            {data.name}
          </h4>
          <p className="text-[11px] text-[#475569] dark:text-[#C9ADA7] mt-0.5">{isFile ? data.mime_type || "Document File" : "Virtual Folder"}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href={downloadUrl}
          download
          onClick={handleDownloadClick}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" /> Download
        </a>
        {onDelete && (
          <Button onClick={onDelete} variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-4 divide-y divide-[#E2E8F0] dark:divide-[#4A4E69]/30">
        {/* Storage Account Transparency Details */}
        <div className="pt-3 space-y-2">
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Cloud Storage Location</span>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#475569] dark:text-[#C9ADA7]"><HardDrive className="w-3.5 h-3.5 text-[#2563EB]" /> Provider:</span>
            <span className="font-bold text-[#0F172A] dark:text-white">Google Drive</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#475569] dark:text-[#C9ADA7]"><Mail className="w-3.5 h-3.5 text-[#2563EB]" /> Google Account:</span>
            <span className="font-semibold text-[#0F172A] dark:text-white truncate max-w-[130px]" title={data.storage_account?.provider_email}>
              {data.storage_account?.provider_email || "Connected Account"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#475569] dark:text-[#C9ADA7]"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Account Name:</span>
            <span className="font-semibold">{data.storage_account?.nickname || "Primary Drive"}</span>
          </div>
        </div>

        {/* Technical File Metadata */}
        <div className="pt-3 space-y-2">
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Technical Attributes</span>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#475569] dark:text-[#C9ADA7]"><Database className="w-3.5 h-3.5" /> File Size:</span>
            <span className="font-mono font-bold text-[#0F172A] dark:text-white">{isFile ? formatSize(data.size) : "—"}</span>
          </div>
          {data.provider_file_id && (
            <div className="flex items-center justify-between pt-1">
              <span className="flex items-center gap-1.5 text-[#475569] dark:text-[#C9ADA7]"><Hash className="w-3.5 h-3.5" /> Drive ID:</span>
              <span className="font-mono text-[10px] truncate max-w-[130px]">{data.provider_file_id}</span>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="pt-3 space-y-2">
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Timestamps</span>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#475569] dark:text-[#C9ADA7]"><Calendar className="w-3.5 h-3.5" /> Modified:</span>
            <span className="font-medium text-[#0F172A] dark:text-white">{new Date(data.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
