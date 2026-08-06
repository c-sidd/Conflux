import React from "react";
import { apiClient } from "@/api/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileItem, FolderItem } from "@/types";
import { Trash2, RotateCcw, Folder, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export function TrashPage() {
  const queryClient = useQueryClient();

  const { data: trashData = { files: [], folders: [] }, isLoading: loading } = useQuery({
    queryKey: ["trash"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/trash/");
      if (Array.isArray(res.data)) {
        return { files: res.data, folders: [] };
      }
      return {
        files: res.data.files || [],
        folders: res.data.folders || [],
      };
    },
  });

  const trashedFiles = trashData.files;
  const trashedFolders = trashData.folders;

  const handleRestore = async (id: number, type: "file" | "folder") => {
    try {
      await apiClient.post(`/api/v1/trash/${id}/restore/`, { type });
      toast.success(`${type === "folder" ? "Folder" : "File"} restored successfully!`);
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to restore item.");
    }
  };

  const handlePermanentDelete = async (id: number, type: "file" | "folder") => {
    if (!confirm("Permanently delete this item? This action cannot be undone.")) return;
    try {
      await apiClient.delete(`/api/v1/trash/${id}/permanent/?type=${type}`);
      toast.success(`${type === "folder" ? "Folder" : "File"} deleted permanently.`);
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete item.");
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Are you sure you want to empty the trash bin? All items will be permanently erased.")) return;
    try {
      await apiClient.post("/api/v1/trash/empty/");
      toast.success("Trash emptied successfully.");
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to empty trash.");
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const totalItems = trashedFiles.length + trashedFolders.length;

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto cfx-animate-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-[var(--radius-lg)] bg-danger-light text-danger border border-danger/20">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[var(--font-size-h3)] font-extrabold text-text-primary tracking-tight">Trash Bin</h1>
            <p className="text-[var(--font-size-caption)] text-text-muted">Items in trash can be restored or permanently purged.</p>
          </div>
        </div>

        {totalItems > 0 && (
          <Button onClick={handleEmptyTrash} variant="danger" size="sm">
            <Trash2 className="w-4 h-4 mr-1.5" /> Empty Trash
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-[var(--font-size-caption)] text-text-muted text-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-[var(--radius-full)] cfx-spin mx-auto mb-2" />
          Loading trashed items...
        </div>
      ) : totalItems === 0 ? (
        <Card className="p-8 text-center space-y-3 max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-bg-sunken text-text-muted flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-[var(--font-size-subtitle)] font-bold text-text-primary">Trash Bin is Empty</h3>
          <p className="text-[var(--font-size-caption)] text-text-muted">Deleted files and folders will appear here for temporary recovery.</p>
        </Card>
      ) : (
        <div className="bg-bg-surface border border-border rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-sm)]">
          <table className="w-full text-left text-[var(--font-size-caption)] border-collapse">
            <thead>
              <tr className="bg-bg-sunken border-b border-border text-text-muted font-bold uppercase text-[var(--font-size-label)] tracking-wider h-10">
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4 w-28">Type</th>
                <th className="py-2.5 px-4 w-28">Size</th>
                <th className="py-2.5 px-4 w-36">Deleted Date</th>
                <th className="py-2.5 px-4 w-48 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Trashed Folders */}
              {trashedFolders.map((folder: FolderItem) => (
                <tr key={`folder-${folder.id}`} className="hover:bg-bg-sunken transition-colors duration-[var(--duration-fast)]">
                  <td className="py-2.5 px-4 font-bold text-text-primary flex items-center gap-2.5">
                    <Folder className="w-4 h-4 text-brand-gold shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </td>
                  <td className="py-2.5 px-4 text-text-secondary font-medium">Folder</td>
                  <td className="py-2.5 px-4 text-text-muted font-mono">—</td>
                  <td className="py-2.5 px-4 text-text-muted">{new Date(folder.updated_at).toLocaleDateString()}</td>
                  <td className="py-2.5 px-4 text-right space-x-2">
                    <Button onClick={() => handleRestore(folder.id, "folder")} variant="default" size="sm">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                    </Button>
                    <Button onClick={() => handlePermanentDelete(folder.id, "folder")} variant="outline" size="sm" className="text-danger border-danger/30 hover:bg-danger-light">
                      Delete Forever
                    </Button>
                  </td>
                </tr>
              ))}

              {/* Trashed Files */}
              {trashedFiles.map((file: FileItem) => (
                <tr key={`file-${file.id}`} className="hover:bg-bg-sunken transition-colors duration-[var(--duration-fast)]">
                  <td className="py-2.5 px-4 font-bold text-text-primary flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </td>
                  <td className="py-2.5 px-4 text-text-secondary font-medium">{file.mime_type?.split("/")[1]?.toUpperCase() || "File"}</td>
                  <td className="py-2.5 px-4 text-text-primary font-mono font-medium">{formatSize(file.size)}</td>
                  <td className="py-2.5 px-4 text-text-muted">{new Date(file.updated_at).toLocaleDateString()}</td>
                  <td className="py-2.5 px-4 text-right space-x-2">
                    <Button onClick={() => handleRestore(file.id, "file")} variant="default" size="sm">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                    </Button>
                    <Button onClick={() => handlePermanentDelete(file.id, "file")} variant="outline" size="sm" className="text-danger border-danger/30 hover:bg-danger-light">
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
