"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Star, File as FileIcon, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/empty-state";
import FilePreviewModal from "@/components/file-preview-modal";

export default function FavoritesPage() {
  const [favoriteFiles, setFavoriteFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<any | null>(null);

  const loadFavorites = async () => {
    try {
      const data: any = await fetchApi("/api/v1/files/");
      const filesList: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setFavoriteFiles(filesList.filter((f: any) => f.is_favorite && !f.is_trashed));
    } catch (e) {
      console.error(e);
      setFavoriteFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleUnfavorite = async (id: number) => {
    try {
      await fetchApi(`/api/v1/files/${id}/favorite/`, { method: "POST" });
      loadFavorites();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadFile = async (fileItem: any) => {
    try {
      const token = localStorage.getItem("dcs_access_token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${API_BASE}/api/v1/files/${fileItem.id}/download/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileItem.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert("Failed to download file");
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <header className="border-b border-slate-200/80 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500" /> Starred Favorites
        </h2>
        <p className="text-xs text-slate-500 mt-1">Important files starred for quick one-click access.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : favoriteFiles.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No starred favorites"
          description="Click the star icon next to any file to add it to your favorites list."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="p-3.5 font-bold">Name</th>
                <th className="p-3.5 font-bold">Size</th>
                <th className="p-3.5 font-bold">Storage Account</th>
                <th className="p-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {favoriteFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 flex items-center gap-2.5 font-semibold text-slate-900">
                    <Star
                      onClick={() => handleUnfavorite(file.id)}
                      className="w-4 h-4 text-amber-500 fill-amber-500 cursor-pointer"
                    />
                    <FileIcon className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate max-w-xs">{file.name}</span>
                  </td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">{formatSize(file.size)}</td>
                  <td className="p-3.5 text-slate-500">{file.storage_account?.nickname}</td>
                  <td className="p-3.5 text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => setPreviewFile(file)} className="h-7 text-xs text-slate-600">
                      <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                    </Button>
                    <Button size="sm" onClick={() => handleDownloadFile(file)} className="h-7 text-xs bg-blue-600 text-white">
                      <Download className="w-3.5 h-3.5 mr-1" /> Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownloadFile}
      />
    </div>
  );
}
