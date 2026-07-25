"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Clock, File as FileIcon, Download, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/empty-state";
import FilePreviewModal from "@/components/file-preview-modal";

export default function RecentPage() {
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<any | null>(null);

  const loadRecent = async () => {
    try {
      const data = await fetchApi("/api/v1/recent/");
      setRecentFiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

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
          <Clock className="w-6 h-6 text-purple-600" /> Recent Files
        </h2>
        <p className="text-xs text-slate-500 mt-1">Files accessed or updated recently across your unified workspace.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : recentFiles.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No recent files"
          description="Files you upload, open, or modify will appear here sorted by activity time."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="p-3.5 font-bold">Name</th>
                <th className="p-3.5 font-bold">Size</th>
                <th className="p-3.5 font-bold">Last Modified</th>
                <th className="p-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 flex items-center gap-2.5 font-semibold text-slate-900">
                    <FileIcon className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="truncate max-w-xs">{file.name}</span>
                  </td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">{formatSize(file.size)}</td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">{new Date(file.updated_at).toLocaleString()}</td>
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
