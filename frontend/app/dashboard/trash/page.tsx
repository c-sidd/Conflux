"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Trash2, RotateCcw, File as FileIcon, Folder as FolderIcon, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TrashPage() {
  const [items, setItems] = useState<{ files: any[]; folders: any[] }>({ files: [], folders: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTrash = async () => {
    try {
      const data = await fetchApi("/api/v1/trash/");
      setItems(data);
    } catch (e) {
      console.error("Failed to load trash", e);
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

  const handlePermanentDeleteFile = async (id: number) => {
    if (!confirm("Permanently delete this file? This action cannot be undone.")) return;
    try {
      await fetchApi(`/api/v1/files/${id}/permanent-delete/`, { method: "DELETE" });
      loadTrash();
    } catch (e) {
      alert("Failed to delete file permanently");
    }
  };

  const handlePermanentDeleteFolder = async (id: number) => {
    if (!confirm("Permanently delete this folder and its contents? This action cannot be undone.")) return;
    try {
      await fetchApi(`/api/v1/folders/${id}/permanent-delete/`, { method: "DELETE" });
      loadTrash();
    } catch (e) {
      alert("Failed to delete folder permanently");
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Are you sure you want to empty the trash? All items will be PERMANENTLY deleted from Google Drive.")) return;
    setActionLoading(true);
    try {
      const res = await fetchApi("/api/v1/trash/empty/", { method: "POST" });
      alert(res.message || "Trash emptied successfully");
      loadTrash();
    } catch (e: any) {
      alert(e.message || "Failed to empty trash");
    } finally {
      setActionLoading(false);
    }
  };

  const totalItems = items.files.length + items.folders.length;

  return (
    <div className="flex-1 overflow-auto p-8 z-10 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-red-400" /> Trash
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Soft-deleted items stay here until permanently purged.</p>
        </div>

        {totalItems > 0 && (
          <Button
            onClick={handleEmptyTrash}
            disabled={actionLoading}
            variant="destructive"
            className="bg-red-600 hover:bg-red-500 font-semibold shadow-lg"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Empty Trash
          </Button>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : totalItems === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
          <Trash2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">Trash is empty</h3>
          <p className="text-zinc-500">Items moved to trash will appear here.</p>
        </div>
      ) : (
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Deleted At</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {/* Folders */}
              {items.folders.map(f => (
                <tr key={`folder-${f.id}`} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="p-4 flex items-center gap-3 font-medium text-zinc-200">
                    <FolderIcon className="w-5 h-5 text-blue-400 shrink-0" />
                    <span>{f.name}</span>
                  </td>
                  <td className="p-4 text-zinc-400 text-sm">Folder</td>
                  <td className="p-4 text-zinc-500 text-xs">{new Date(f.updated_at).toLocaleString()}</td>
                  <td className="p-4 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestoreFolder(f.id)} className="border-zinc-800 text-zinc-300 hover:text-white">
                      <RotateCcw className="w-4 h-4 mr-1.5" /> Restore
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handlePermanentDeleteFolder(f.id)}>
                      Delete Forever
                    </Button>
                  </td>
                </tr>
              ))}

              {/* Files */}
              {items.files.map(fi => (
                <tr key={`file-${fi.id}`} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="p-4 flex items-center gap-3 font-medium text-zinc-200">
                    <FileIcon className="w-5 h-5 text-purple-400 shrink-0" />
                    <span>{fi.name}</span>
                  </td>
                  <td className="p-4 text-zinc-400 text-sm truncate max-w-[150px]">{fi.mime_type || 'File'}</td>
                  <td className="p-4 text-zinc-500 text-xs">{new Date(fi.updated_at).toLocaleString()}</td>
                  <td className="p-4 text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestoreFile(fi.id)} className="border-zinc-800 text-zinc-300 hover:text-white">
                      <RotateCcw className="w-4 h-4 mr-1.5" /> Restore
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handlePermanentDeleteFile(fi.id)}>
                      Delete Forever
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
