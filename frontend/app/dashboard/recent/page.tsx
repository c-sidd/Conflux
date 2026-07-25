"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Clock, File as FileIcon, Folder as FolderIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function RecentPage() {
  const [data, setData] = useState<{ all_files: any[]; all_folders: any[] }>({ all_files: [], all_folders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/v1/recent/")
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 GB";
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const handleDownload = async (fileItem: any) => {
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

  return (
    <div className="flex-1 overflow-auto p-8 z-10 space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-400" /> Recent Activity
        </h2>
        <p className="text-zinc-400 text-sm mt-1">Files and folders modified recently in your workspace.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : data.all_files.length === 0 && data.all_folders.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
          <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No recent activity</h3>
          <p className="text-zinc-500">Uploaded or modified files will appear here.</p>
        </div>
      ) : (
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Size</th>
                <th className="p-4 font-semibold">Last Modified</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {data.all_files.map(fi => (
                <tr key={fi.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="p-4 flex items-center gap-3 font-medium text-zinc-200">
                    <FileIcon className="w-5 h-5 text-purple-400 shrink-0" />
                    <span>{fi.name}</span>
                  </td>
                  <td className="p-4 text-zinc-400 text-sm">{formatSize(fi.size)}</td>
                  <td className="p-4 text-zinc-400 text-xs">{new Date(fi.updated_at).toLocaleString()}</td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant="outline" onClick={() => handleDownload(fi)} className="border-zinc-800 text-zinc-300 hover:text-white">
                      <Download className="w-3.5 h-3.5 mr-1" /> Download
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
