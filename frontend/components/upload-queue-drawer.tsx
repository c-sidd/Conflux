"use client";

import { X, UploadCloud, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface QueueItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "queued" | "uploading" | "completed" | "error";
  error?: string;
  fileObj: File;
}

interface UploadQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: QueueItem[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

export default function UploadQueueDrawer({ isOpen, onClose, queue, onRetry, onCancel }: UploadQueueDrawerProps) {
  if (!isOpen || queue.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-blue-400" />
          <h4 className="font-bold text-white text-sm">Upload Queue ({queue.length})</h4>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {queue.map(item => (
          <div key={item.id} className="bg-zinc-950 p-3 rounded-2xl border border-zinc-850 space-y-2 text-xs">
            <div className="flex justify-between items-center gap-2">
              <span className="font-medium text-zinc-200 truncate max-w-[200px]">{item.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                {item.status === "completed" && <CheckCircle className="w-4 h-4 text-green-400" />}
                {item.status === "error" && (
                  <button type="button" onClick={() => onRetry(item.id)} className="text-amber-400 hover:text-amber-300">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button type="button" onClick={() => onCancel(item.id)} className="text-zinc-500 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${item.status === "completed" ? "bg-green-500" : item.status === "error" ? "bg-red-500" : "bg-blue-500"}`}
                style={{ width: `${item.progress}%` }}
              ></div>
            </div>

            {item.error && <p className="text-[10px] text-red-400">{item.error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
