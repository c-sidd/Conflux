import React, { useState } from "react";
import { Upload, CheckCircle, AlertCircle, X, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UploadQueueItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  speedMBps: number;
  etaSeconds: number;
  status: "uploading" | "completed" | "error";
  errorMsg?: string;
}

interface UploadQueueProps {
  queue: UploadQueueItem[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onClose: () => void;
}

export function ExplorerUploadQueue({ queue, onCancel, onRetry, onClose }: UploadQueueProps) {
  const [minimized, setMinimized] = useState(false);

  if (queue.length === 0) return null;

  const activeUploads = queue.filter((q) => q.status === "uploading").length;
  const completedUploads = queue.filter((q) => q.status === "completed").length;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-84 bg-bg-surface border border-border text-text-primary rounded-[var(--radius-xl)] shadow-[var(--shadow-float)] overflow-hidden text-[var(--font-size-caption)] select-none cfx-slide-up">
      <div className="p-3 bg-bg-sunken border-b border-border flex items-center justify-between font-bold">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary cfx-pulse" />
          <span>Uploads ({activeUploads} active, {completedUploads} done)</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(!minimized)} className="p-1 text-text-muted hover:text-text-primary transition-colors duration-[var(--duration-fast)]">
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-danger transition-colors duration-[var(--duration-fast)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="max-h-64 overflow-y-auto divide-y divide-border p-2 space-y-2">
          {queue.map((item) => (
            <div key={item.id} className="p-2.5 space-y-1.5 bg-bg-sunken rounded-[var(--radius-lg)] border border-border">
              <div className="flex items-center justify-between">
                <span className="font-medium truncate max-w-[180px]" title={item.name}>
                  {item.name}
                </span>
                <div className="flex items-center gap-1">
                  {item.status === "completed" && <CheckCircle className="w-3.5 h-3.5 text-success" />}
                  {item.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-danger" />}
                  {item.status === "uploading" && (
                    <button onClick={() => onCancel(item.id)} className="text-text-muted hover:text-danger transition-colors duration-[var(--duration-fast)]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {item.status === "uploading" && (
                <>
                  <div className="h-1.5 w-full bg-neutral-light rounded-[var(--radius-full)] overflow-hidden">
                    <div className="h-full bg-primary rounded-[var(--radius-full)] transition-all duration-300" style={{ width: `${item.progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[var(--font-size-label)] text-text-muted font-mono">
                    <span>{item.progress}% • {formatBytes((item.size * item.progress) / 100)} / {formatBytes(item.size)}</span>
                    <span>{item.speedMBps.toFixed(1)} MB/s • ETA: {item.etaSeconds}s</span>
                  </div>
                </>
              )}

              {item.status === "completed" && (
                <div className="text-[var(--font-size-label)] text-success font-medium">
                  Uploaded successfully ({formatBytes(item.size)})
                </div>
              )}

              {item.status === "error" && (
                <div className="flex items-center justify-between text-[var(--font-size-label)] text-danger pt-1">
                  <span>{item.errorMsg || "Upload failed"}</span>
                  <Button onClick={() => onRetry(item.id)} variant="ghost" size="sm" className="h-5 px-1.5 text-[var(--font-size-label)] text-primary hover:bg-primary-light">
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
