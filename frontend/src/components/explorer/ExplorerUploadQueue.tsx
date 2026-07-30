import React from "react";
import { Upload, CheckCircle, AlertCircle, X, RefreshCw } from "lucide-react";
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
  if (queue.length === 0) return null;

  const activeUploads = queue.filter((q) => q.status === "uploading").length;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl overflow-hidden text-xs">
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between font-bold">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-400 animate-pulse" />
          <span>Uploads ({activeUploads} active)</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto divide-y divide-slate-800 p-2 space-y-2">
        {queue.map((item) => (
          <div key={item.id} className="p-2 space-y-1.5 bg-slate-900/60 rounded-xl">
            <div className="flex items-center justify-between text-slate-200">
              <span className="font-semibold truncate max-w-[170px]" title={item.name}>
                {item.name}
              </span>
              <div className="flex items-center gap-1">
                {item.status === "completed" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                {item.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                {item.status === "uploading" && (
                  <button onClick={() => onCancel(item.id)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {item.status === "uploading" && (
              <>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{item.progress}% • {item.speedMBps.toFixed(1)} MB/s</span>
                  <span>ETA: {item.etaSeconds}s</span>
                </div>
              </>
            )}

            {item.status === "error" && (
              <div className="flex items-center justify-between text-[10px] text-red-400 pt-1">
                <span>{item.errorMsg || "Upload failed"}</span>
                <Button onClick={() => onRetry(item.id)} variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-blue-400">
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
