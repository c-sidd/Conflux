import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/client";
import { FileItem } from "@/types";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function TrashPage() {
  const [trashedFiles, setTrashedFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrash = async () => {
    try {
      const res = await apiClient.get("/api/v1/trash/");
      setTrashedFiles(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const handleRestore = async (id: number) => {
    try {
      await apiClient.post(`/api/v1/trash/${id}/restore/`);
      loadTrash();
    } catch (e: any) {
      alert(e.message || "Failed to restore file.");
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm("Permanently delete this file? This action cannot be undone.")) return;
    try {
      await apiClient.delete(`/api/v1/trash/${id}/permanent/`);
      loadTrash();
    } catch (e: any) {
      alert(e.message || "Failed to delete file.");
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center gap-2">
        <Trash2 className="w-5 h-5 text-red-500" />
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Trash Bin</h1>
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 text-center py-12">Loading trashed files...</div>
      ) : trashedFiles.length === 0 ? (
        <Card className="p-8 text-center space-y-3 max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Trash Bin is Empty</h3>
          <p className="text-xs text-slate-500">Deleted files will appear here for temporary recovery.</p>
        </Card>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Deleted At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trashedFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{file.name}</td>
                  <td className="py-2.5 px-4 text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</td>
                  <td className="py-2.5 px-4 text-slate-500">{new Date(file.updated_at).toLocaleDateString()}</td>
                  <td className="py-2.5 px-4 text-right space-x-2">
                    <Button onClick={() => handleRestore(file.id)} variant="outline" size="sm" className="text-xs text-blue-600">
                      <RotateCcw className="w-3 h-3 mr-1" /> Restore
                    </Button>
                    <Button onClick={() => handlePermanentDelete(file.id)} variant="ghost" size="sm" className="text-xs text-red-600">
                      Delete Forever
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
