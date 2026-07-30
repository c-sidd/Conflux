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
    <div className="fixed bottom-6 right-6 z-50 w-84 bg-white dark:bg-[#22223B] border border-[#E2E8F0] dark:border-[#4A4E69]/40 text-[#0F172A] dark:text-[#F2E9E4] rounded-2xl shadow-2xl overflow-hidden text-xs select-none">
      <div className="p-3 bg-[#F8FAFC] dark:bg-[#111111] border-b border-[#E2E8F0] dark:border-[#4A4E69]/40 flex items-center justify-between font-bold">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-[#2563EB] animate-pulse" />
          <span>Uploads ({activeUploads} active, {completedUploads} done)</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(!minimized)} className="p-1 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white">
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="max-h-64 overflow-y-auto divide-y divide-[#E2E8F0] dark:divide-[#4A4E69]/30 p-2 space-y-2">
          {queue.map((item) => (
            <div key={item.id} className="p-2 space-y-1.5 bg-[#F8FAFC] dark:bg-[#4A4E69]/20 rounded-xl border border-[#E2E8F0] dark:border-[#4A4E69]/40">
              <div className="flex items-center justify-between text-[#0F172A] dark:text-[#F2E9E4]">
                <span className="font-semibold truncate max-w-[180px]" title={item.name}>
                  {item.name}
                </span>
                <div className="flex items-center gap-1">
                  {item.status === "completed" && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                  {item.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                  {item.status === "uploading" && (
                    <button onClick={() => onCancel(item.id)} className="text-[#94A3B8] hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {item.status === "uploading" && (
                <>
                  <div className="h-1.5 w-full bg-[#E2E8F0] dark:bg-[#22223B] rounded-full overflow-hidden">
                    <div className="h-full bg-[#2563EB] rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#475569] dark:text-[#C9ADA7] font-mono">
                    <span>{item.progress}% • {formatBytes((item.size * item.progress) / 100)} / {formatBytes(item.size)}</span>
                    <span>{item.speedMBps.toFixed(1)} MB/s • ETA: {item.etaSeconds}s</span>
                  </div>
                </>
              )}

              {item.status === "completed" && (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Uploaded successfully ({formatBytes(item.size)})
                </div>
              )}

              {item.status === "error" && (
                <div className="flex items-center justify-between text-[10px] text-red-600 dark:text-red-400 pt-1">
                  <span>{item.errorMsg || "Upload failed"}</span>
                  <Button onClick={() => onRetry(item.id)} variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-[#2563EB] hover:bg-blue-50">
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
