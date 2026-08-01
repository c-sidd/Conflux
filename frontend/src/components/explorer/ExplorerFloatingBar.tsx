import React from "react";
import { useExplorer } from "./ExplorerContext";
import { API_BASE_URL } from "@/api/client";
import { Download, Trash2, X, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExplorerFloatingBar() {
  const { selectedIds, selectAll, clearSelection, deleteSelected, files } = useExplorer();

  if (selectedIds.size === 0) return null;

  const handleBatchDownload = () => {
    const selectedFileIds = files
      .filter((f) => selectedIds.has(`file-${f.id}`))
      .map((f) => f.id);

    if (selectedFileIds.length === 0) return;

    fetch(`${API_BASE_URL}/api/v1/files/bulk-download/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("conflux_access_token")}`,
      },
      body: JSON.stringify({ file_ids: selectedFileIds }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Conflux_Bulk_Download.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-primary border border-primary-hover text-white px-5 py-3 rounded-[var(--radius-2xl)] shadow-[var(--shadow-float)] flex items-center gap-4 text-[var(--font-size-caption)] cfx-slide-up">
      <div className="flex items-center gap-2 font-extrabold border-r border-white/25 pr-3">
        <CheckSquare className="w-4 h-4 text-brand-gold" />
        <span className="text-white">{selectedIds.size} Selected</span>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleBatchDownload} variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/20 font-bold">
          <Download className="w-3.5 h-3.5 mr-1.5 text-brand-gold" /> Download ZIP
        </Button>
        <Button onClick={deleteSelected} variant="ghost" size="sm" className="text-red-200 hover:text-white hover:bg-red-500/30 font-bold">
          <Trash2 className="w-3.5 h-3.5 mr-1.5 text-red-300" /> Move to Trash
        </Button>
      </div>

      <div className="border-l border-white/25 pl-2 flex items-center gap-1">
        <button onClick={selectAll} className="px-2 py-1 text-white/90 hover:text-white font-extrabold cursor-pointer transition-colors duration-[var(--duration-fast)]">
          Select All
        </button>
        <button onClick={clearSelection} className="p-1 text-white/80 hover:text-white cursor-pointer transition-colors duration-[var(--duration-fast)]">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
