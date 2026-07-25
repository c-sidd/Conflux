"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Trash2, RotateCcw, AlertTriangle, File as FileIcon, Folder as FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/empty-state";

export default function TrashPage() {
  const [trashedItems, setTrashedItems] = useState<{ files: any[]; folders: any[]; total_items: number }>({ files: [], folders: [], total_items: 0 });
  const [loading, setLoading] = useState(true);

  const loadTrash = async () => {
    try {
      const data = await fetchApi("/api/v1/trash/");
      const raw = data?.data || data || {};
      setTrashedItems({
        files: Array.isArray(raw.files) ? raw.files : [],
        folders: Array.isArray(raw.folders) ? raw.folders : [],
        total_items: raw.total_items || (raw.files?.length || 0) + (raw.folders?.length || 0)
      });
    } catch (e) {
      console.error(e);
      setTrashedItems({ files: [], folders: [], total_items: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const handleRestoreFile = async (id: number) => {
    try {
      await fetchApi(`/api/v1/files/${id}/restore/`, { method: "POST" });
      loadTrash();
    } catch (e) {
      alert("Failed to restore file");
    }
  };

  const handleRestoreFolder = async (id: number) => {
    try {
      await fetchApi(`/api/v1/folders/${id}/restore/`, { method: "POST" });
      loadTrash();
    } catch (e) {
      alert("Failed to restore folder");
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Permanently delete all items in Trash? This cannot be undone.")) return;
    try {
      await fetchApi("/api/v1/trash/empty/", { method: "POST" });
      loadTrash();
    } catch (e) {
      alert("Failed to empty trash");
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <header className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Trash2 className="w-6 h-6 text-red-600" /> Trash Bin
          </h2>
          <p className="text-xs text-slate-500 mt-1">Soft-deleted files and folders. Restore anytime or delete permanently.</p>
        </div>
        {trashedItems.total_items > 0 && (
          <Button onClick={handleEmptyTrash} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-xl">
            <AlertTriangle className="w-4 h-4 mr-1.5" /> Empty Trash
          </Button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : trashedItems.total_items === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          description="Items moved to trash will remain here until permanently deleted."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="p-3.5 font-bold">Item Name</th>
                <th className="p-3.5 font-bold">Type</th>
                <th className="p-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trashedItems.folders.map((folder) => (
                <tr key={`folder-${folder.id}`} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 flex items-center gap-2.5 font-semibold text-slate-900">
                    <FolderIcon className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate max-w-xs">{folder.name}</span>
                  </td>
                  <td className="p-3.5 text-slate-500">Folder</td>
                  <td className="p-3.5 text-right">
                    <Button size="sm" onClick={() => handleRestoreFolder(folder.id)} className="h-7 text-xs bg-blue-600 text-white">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                    </Button>
                  </td>
                </tr>
              ))}
              {trashedItems.files.map((file) => (
                <tr key={`file-${file.id}`} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 flex items-center gap-2.5 font-semibold text-slate-900">
                    <FileIcon className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate max-w-xs">{file.name}</span>
                  </td>
                  <td className="p-3.5 text-slate-500">{file.mime_type || "File"}</td>
                  <td className="p-3.5 text-right">
                    <Button size="sm" onClick={() => handleRestoreFile(file.id)} className="h-7 text-xs bg-blue-600 text-white">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
