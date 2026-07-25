"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Folder as FolderIcon, ChevronRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MoveCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetFolderId: number | null) => void;
  title: string;
  actionLabel: string;
}

export default function MoveCopyModal({ isOpen, onClose, onConfirm, title, actionLabel }: MoveCopyModalProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchApi("/api/v1/folders/")
      .then(data => setFolders(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="font-bold text-white text-base">{title}</h3>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-zinc-400">Select destination folder:</p>

        {loading ? (
          <div className="py-8 text-center text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto bg-zinc-950 p-2 rounded-2xl border border-zinc-850 text-xs">
            <div
              onClick={() => setSelectedFolderId(null)}
              className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${selectedFolderId === null ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "hover:bg-zinc-900 text-zinc-300"}`}
            >
              <FolderIcon className="w-5 h-5 text-blue-400 shrink-0" />
              <span className="font-semibold">Root Workspace</span>
            </div>

            {folders.map(f => (
              <div
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${selectedFolderId === f.id ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "hover:bg-zinc-900 text-zinc-300"}`}
              >
                <FolderIcon className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="font-medium truncate">{f.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-800 text-zinc-300 hover:bg-zinc-800">
            Cancel
          </Button>
          <Button onClick={() => onConfirm(selectedFolderId)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold">
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
