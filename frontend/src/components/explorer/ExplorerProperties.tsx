import React from "react";
import { API_BASE_URL } from "@/api/client";
import { X, FileText, Folder, HardDrive, Calendar, Database, Hash, Download, Trash2, Mail, ShieldCheck } from "lucide-react";
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

  const detailRow = "flex items-center justify-between text-[var(--font-size-caption)]";
  const detailLabel = "flex items-center gap-1.5 text-text-secondary";
  const detailValue = "font-semibold text-text-primary";

  return (
    <div className="w-80 bg-bg-surface border-l border-border p-5 space-y-5 text-[var(--font-size-caption)] text-text-primary shrink-0 overflow-y-auto select-none cfx-animate-in">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-bold text-text-primary text-[var(--font-size-subtitle)]">Item Details</h3>
        <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors duration-[var(--duration-fast)]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center space-y-3 py-2">
        <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-primary-light border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-[var(--shadow-xs)]">
          {isFile ? <FileText className="w-7 h-7" /> : <Folder className="w-7 h-7 text-brand-gold" />}
        </div>
        <div>
          <h4 className="font-bold text-text-primary text-[var(--font-size-caption)] truncate max-w-full" title={data.name}>
            {data.name}
          </h4>
          <p className="text-[var(--font-size-label)] text-text-muted mt-0.5">{isFile ? data.mime_type || "Document File" : "Virtual Folder"}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href={downloadUrl}
          download
          onClick={handleDownloadClick}
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-[var(--font-size-caption)] font-semibold py-2 rounded-[var(--radius-lg)] transition-all duration-[var(--duration-normal)] shadow-[var(--shadow-sm)] active:scale-[0.98]"
        >
          <Download className="w-3.5 h-3.5" /> Download
        </a>
        {onDelete && (
          <Button onClick={onDelete} variant="outline" size="sm" className="border-danger/30 text-danger hover:bg-danger-light">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-4 divide-y divide-border">
        {/* Storage Account Details */}
        <div className="pt-3 space-y-2">
          <span className="text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">Cloud Storage Location</span>
          
          <div className={detailRow}>
            <span className={detailLabel}><HardDrive className="w-3.5 h-3.5 text-primary" /> Provider:</span>
            <span className={detailValue}>Google Drive</span>
          </div>

          <div className={detailRow}>
            <span className={detailLabel}><Mail className="w-3.5 h-3.5 text-primary" /> Google Account:</span>
            <span className={`${detailValue} truncate max-w-[130px]`} title={data.storage_account?.provider_email}>
              {data.storage_account?.provider_email || "Connected Account"}
            </span>
          </div>

          <div className={detailRow}>
            <span className={detailLabel}><ShieldCheck className="w-3.5 h-3.5 text-success" /> Account Name:</span>
            <span className={detailValue}>{data.storage_account?.nickname || "Primary Drive"}</span>
          </div>
        </div>

        {/* Technical Metadata */}
        <div className="pt-3 space-y-2">
          <span className="text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">Technical Attributes</span>
          <div className={detailRow}>
            <span className={detailLabel}><Database className="w-3.5 h-3.5" /> File Size:</span>
            <span className="font-mono font-bold text-text-primary">{isFile ? formatSize(data.size) : "—"}</span>
          </div>
          {data.provider_file_id && (
            <div className={`${detailRow} pt-1`}>
              <span className={detailLabel}><Hash className="w-3.5 h-3.5" /> Drive ID:</span>
              <span className="font-mono text-[var(--font-size-label)] truncate max-w-[130px]">{data.provider_file_id}</span>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="pt-3 space-y-2">
          <span className="text-[var(--font-size-label)] font-bold text-text-muted uppercase tracking-wider">Timestamps</span>
          <div className={detailRow}>
            <span className={detailLabel}><Calendar className="w-3.5 h-3.5" /> Modified:</span>
            <span className="font-medium text-text-primary">{new Date(data.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
