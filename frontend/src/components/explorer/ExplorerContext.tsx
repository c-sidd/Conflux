import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { FileItem, FolderItem } from "@/types";
import { UploadQueueItem } from "./ExplorerUploadQueue";
import { toast } from "sonner";

export type ViewMode = "grid" | "list";
export type SortField = "name" | "size" | "updated_at";
export type FilterType = "all" | "images" | "pdf" | "favorites";

interface ExplorerContextType {
  files: FileItem[];
  folders: FolderItem[];
  currentFolderId: number | null;
  selectedIds: Set<string>;
  viewMode: ViewMode;
  sortField: SortField;
  filter: FilterType;
  searchQuery: string;
  loading: boolean;
  uploadQueue: UploadQueueItem[];
  setCurrentFolderId: (id: number | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortField: (field: SortField) => void;
  setFilter: (filter: FilterType) => void;
  setSearchQuery: (query: string) => void;
  toggleSelection: (id: string, isMulti?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  uploadFiles: (files: File[]) => Promise<void>;
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  clearUploadQueue: () => void;
  deleteSelected: () => Promise<void>;
  toggleFavorite: (file: FileItem) => Promise<void>;
  renameItem: (item: any, newName: string) => Promise<void>;
  refreshExplorer: () => void;
}

const ExplorerContext = createContext<ExplorerContextType | undefined>(undefined);

export function ExplorerProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewModeState] = useState<ViewMode>("list");
  const [sortField, setSortField] = useState<SortField>("name");
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem("conflux_view_mode", mode);
  };

  useEffect(() => {
    const savedView = localStorage.getItem("conflux_view_mode") as ViewMode;
    if (savedView) setViewModeState(savedView);
  }, []);

  const folderParam = currentFolderId === null ? "root" : String(currentFolderId);

  // Cache each folder independently instead of downloading the entire user's
  // virtual filesystem on every dashboard load.
  const { data: filesData = [], isLoading: filesLoading } = useQuery<FileItem[]>({
    queryKey: ["files", currentFolderId],
    queryFn: async () =>
      (await apiClient.get("/api/v1/files/", { params: { folder_id: folderParam } })).data,
  });

  const { data: foldersData = [], isLoading: foldersLoading } = useQuery<FolderItem[]>({
    queryKey: ["folders", currentFolderId],
    queryFn: async () =>
      (await apiClient.get("/api/v1/folders/", { params: { parent_id: folderParam } })).data,
  });

  const loading = filesLoading || foldersLoading;

  const refreshExplorer = () => {
    queryClient.invalidateQueries({ queryKey: ["files", currentFolderId] });
    queryClient.invalidateQueries({ queryKey: ["folders", currentFolderId] });
  };

  const toggleSelection = (id: string, isMulti = false) => {
    setSelectedIds((prev) => {
      const next = new Set(isMulti ? prev : []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set<string>();
    foldersData.filter((f) => f.parent === currentFolderId && !f.is_trashed).forEach((f) => all.add(`folder-${f.id}`));
    filesData.filter((f) => f.folder === currentFolderId && !f.is_trashed).forEach((f) => all.add(`file-${f.id}`));
    setSelectedIds(all);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const uploadFiles = async (newFiles: File[]) => {
    const CHUNK_SIZE = 2 * 1024 * 1024;
    const CHUNK_THRESHOLD = 5 * 1024 * 1024;

    for (const file of newFiles) {
      const uploadId = crypto.randomUUID();
      const newItem: UploadQueueItem = {
        id: uploadId,
        name: file.name,
        size: file.size,
        progress: 0,
        speedMBps: 0,
        etaSeconds: 0,
        status: "uploading",
      };

      setUploadQueue((prev) => [newItem, ...prev]);
      const startTime = Date.now();

      if (file.size > CHUNK_THRESHOLD) {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let success = true;

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunkBlob = file.slice(start, end);

          const formData = new FormData();
          formData.append("upload_id", uploadId);
          formData.append("chunk_index", chunkIndex.toString());
          formData.append("total_chunks", totalChunks.toString());
          formData.append("name", file.name);
          formData.append("mime_type", file.type || "application/octet-stream");
          formData.append("file", chunkBlob, file.name);
          if (currentFolderId) formData.append("folder_id", currentFolderId.toString());

          try {
            await apiClient.post("/api/v1/files/upload-chunk/", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });

            const percent = Math.round(((chunkIndex + 1) * 100) / totalChunks);
            const elapsedSeconds = (Date.now() - startTime) / 1000 || 0.1;
            const speedMBps = end / (1024 * 1024 * elapsedSeconds);
            const remainingBytes = file.size - end;
            const etaSeconds = Math.max(1, Math.round(remainingBytes / (end / elapsedSeconds || 1)));

            setUploadQueue((prev) =>
              prev.map((q) =>
                q.id === uploadId
                  ? { ...q, progress: percent, speedMBps: parseFloat(speedMBps.toFixed(1)), etaSeconds }
                  : q
              )
            );
          } catch (err: any) {
            success = false;
            setUploadQueue((prev) =>
              prev.map((q) =>
                q.id === uploadId
                  ? { ...q, status: "error", errorMsg: err.message || "Chunk upload failed" }
                  : q
              )
            );
            toast.error(`Failed to upload "${file.name}" at chunk ${chunkIndex + 1}/${totalChunks}`);
            break;
          }
        }

        if (success) {
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === uploadId ? { ...q, progress: 100, status: "completed" } : q))
          );
          toast.success(`Uploaded "${file.name}" successfully!`);
        }
      } else {
        const formData = new FormData();
        formData.append("file", file);
        if (currentFolderId) formData.append("folder", currentFolderId.toString());

        try {
          await apiClient.post("/api/v1/files/", formData, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                const elapsedSeconds = (Date.now() - startTime) / 1000 || 0.1;
                const speedMBps = progressEvent.loaded / (1024 * 1024 * elapsedSeconds);
                const remainingBytes = progressEvent.total - progressEvent.loaded;
                const etaSeconds = Math.max(1, Math.round(remainingBytes / (progressEvent.loaded / elapsedSeconds || 1)));

                setUploadQueue((prev) =>
                  prev.map((q) =>
                    q.id === uploadId
                      ? { ...q, progress: percent, speedMBps: parseFloat(speedMBps.toFixed(1)), etaSeconds }
                      : q
                  )
                );
              }
            },
          });

          setUploadQueue((prev) =>
            prev.map((q) => (q.id === uploadId ? { ...q, progress: 100, status: "completed" } : q))
          );

          toast.success(`Uploaded "${file.name}" successfully!`);
        } catch (err: any) {
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === uploadId
                ? { ...q, status: "error", errorMsg: err.message || "Upload failed" }
                : q
            )
          );
          toast.error(`Failed to upload "${file.name}"`);
        }
      }
    }
    refreshExplorer();
  };

  const cancelUpload = (id: string) => {
    setUploadQueue((prev) => prev.filter((q) => q.id !== id));
  };

  // Retry is currently a UI reset only; keeping the failed item visible is
  // preferable to falsely claiming that the upload restarted.
  const retryUpload = (id: string) => {
    setUploadQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "error", errorMsg: "Select the file again to retry." } : q))
    );
  };

  const clearUploadQueue = () => setUploadQueue([]);

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    for (const itemKey of ids) {
      const [type, idStr] = itemKey.split("-");
      const id = parseInt(idStr, 10);
      try {
        if (type === "folder") await apiClient.delete(`/api/v1/folders/${id}/`);
        else await apiClient.delete(`/api/v1/files/${id}/`);
      } catch (err) {
        console.error(err);
      }
    }
    setSelectedIds(new Set());
    refreshExplorer();
  };

  const toggleFavorite = async (file: FileItem) => {
    queryClient.setQueryData<FileItem[]>(["files", currentFolderId], (old = []) =>
      old.map((f) => (f.id === file.id ? { ...f, is_favorite: !f.is_favorite } : f))
    );
    try {
      await apiClient.post(`/api/v1/files/${file.id}/favorite/`);
    } catch (err) {
      refreshExplorer();
    }
  };

  const renameItem = async (item: any, newName: string) => {
    try {
      if (item.mime_type !== undefined) await apiClient.patch(`/api/v1/files/${item.id}/`, { name: newName });
      else await apiClient.patch(`/api/v1/folders/${item.id}/`, { name: newName });
      refreshExplorer();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ExplorerContext.Provider
      value={{
        files: filesData,
        folders: foldersData,
        currentFolderId,
        selectedIds,
        viewMode,
        sortField,
        filter,
        searchQuery,
        loading,
        uploadQueue,
        setCurrentFolderId,
        setViewMode,
        setSortField,
        setFilter,
        setSearchQuery,
        toggleSelection,
        selectAll,
        clearSelection,
        uploadFiles,
        cancelUpload,
        retryUpload,
        clearUploadQueue,
        deleteSelected,
        toggleFavorite,
        renameItem,
        refreshExplorer,
      }}
    >
      {children}
    </ExplorerContext.Provider>
  );
}

export function useExplorer() {
  const context = useContext(ExplorerContext);
  if (!context) throw new Error("useExplorer must be used within ExplorerProvider");
  return context;
}
