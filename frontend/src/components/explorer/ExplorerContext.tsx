import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { FileItem, FolderItem } from "@/types";

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
  setCurrentFolderId: (id: number | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortField: (field: SortField) => void;
  setFilter: (filter: FilterType) => void;
  setSearchQuery: (query: string) => void;
  toggleSelection: (id: string, isMulti?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  uploadFiles: (files: File[]) => Promise<void>;
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

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem("conflux_view_mode", mode);
  };

  useEffect(() => {
    const savedView = localStorage.getItem("conflux_view_mode") as ViewMode;
    if (savedView) setViewModeState(savedView);
  }, []);

  // Use TanStack Query for instant < 100ms cached file & folder data
  const { data: filesData = [], isLoading: filesLoading } = useQuery<FileItem[]>({
    queryKey: ["files"],
    queryFn: async () => (await apiClient.get("/api/v1/files/")).data,
  });

  const { data: foldersData = [], isLoading: foldersLoading } = useQuery<FolderItem[]>({
    queryKey: ["folders"],
    queryFn: async () => (await apiClient.get("/api/v1/folders/")).data,
  });

  const loading = filesLoading || foldersLoading;

  const refreshExplorer = () => {
    queryClient.invalidateQueries({ queryKey: ["files"] });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
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
    for (const file of newFiles) {
      const formData = new FormData();
      formData.append("file", file);
      if (currentFolderId) formData.append("folder", currentFolderId.toString());

      try {
        await apiClient.post("/api/v1/files/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (err) {
        console.error("Upload error", err);
      }
    }
    refreshExplorer();
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    for (const itemKey of ids) {
      const [type, idStr] = itemKey.split("-");
      const id = parseInt(idStr, 10);
      try {
        if (type === "folder") {
          await apiClient.delete(`/api/v1/folders/${id}/`);
        } else {
          await apiClient.delete(`/api/v1/files/${id}/`);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setSelectedIds(new Set());
    refreshExplorer();
  };

  const toggleFavorite = async (file: FileItem) => {
    // Optimistic UI update for instant feedback
    queryClient.setQueryData<FileItem[]>(["files"], (old = []) =>
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
      if (item.mime_type !== undefined) {
        await apiClient.patch(`/api/v1/files/${item.id}/`, { name: newName });
      } else {
        await apiClient.patch(`/api/v1/folders/${item.id}/`, { name: newName });
      }
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
        setCurrentFolderId,
        setViewMode,
        setSortField,
        setFilter,
        setSearchQuery,
        toggleSelection,
        selectAll,
        clearSelection,
        uploadFiles,
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
