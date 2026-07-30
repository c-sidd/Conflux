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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-xs">
      <div className="flex items-center gap-2 font-bold border-r border-slate-700 pr-3">
        <CheckSquare className="w-4 h-4 text-blue-400" />
        <span>{selectedIds.size} Selected</span>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleBatchDownload} variant="ghost" size="sm" className="text-xs text-slate-200 hover:text-white">
          <Download className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> Download ZIP
        </Button>
        <Button onClick={deleteSelected} variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-300">
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Move to Trash
        </Button>
      </div>

      <div className="border-l border-slate-700 pl-2 flex items-center gap-1">
        <button onClick={selectAll} className="px-2 py-1 text-slate-400 hover:text-white font-semibold">
          Select All
        </button>
        <button onClick={clearSelection} className="p-1 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
