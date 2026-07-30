import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "@/api/client";
import { FileItem, FolderItem } from "@/types";

export type ViewMode = "grid" | "list";
export type SortField = "name" | "size" | "updated_at";
export type FilterType = "all" | "images" | "pdf" | "documents" | "favorites";

interface ExplorerContextType {
  currentFolderId: number | null;
  setCurrentFolderId: (id: number | null) => void;
  files: FileItem[];
  folders: FolderItem[];
  loading: boolean;
  refreshExplorer: () => Promise<void>;
  
  // Selection
  selectedIds: Set<string>;
  toggleSelection: (id: string, isMulti?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // View, Filter, Sort
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  sortField: SortField;
  setSortField: (field: SortField) => void;
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Actions
  uploadFiles: (files: File[]) => Promise<void>;
  deleteSelected: () => Promise<void>;
  toggleFavorite: (file: FileItem) => Promise<void>;
  renameItem: (item: FileItem | FolderItem, newName: string) => Promise<void>;
}

const ExplorerContext = createContext<ExplorerContextType | undefined>(undefined);

export function ExplorerProvider({ children }: { children: React.ReactNode }) {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewModeState] = useState<ViewMode>("grid");
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, foldersRes] = await Promise.all([
        apiClient.get("/api/v1/files/"),
        apiClient.get("/api/v1/folders/"),
      ]);
      setFiles(filesRes.data);
      setFolders(foldersRes.data);
    } catch (e) {
      console.error("Failed to load explorer items", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    setSelectedIds(new Set());
  }, [currentFolderId, loadData]);

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
    folders.filter(f => f.parent === currentFolderId && !f.is_trashed).forEach(f => all.add(`folder-${f.id}`));
    files.filter(f => f.folder === currentFolderId && !f.is_trashed).forEach(f => all.add(`file-${f.id}`));
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
        console.error(err);
      }
    }
    loadData();
  };

  const deleteSelected = async () => {
    const fileIds = files.filter((f) => selectedIds.has(`file-${f.id}`)).map((f) => f.id);
    const folderIds = folders.filter((f) => selectedIds.has(`folder-${f.id}`)).map((f) => f.id);

    if (fileIds.length > 0) {
      await apiClient.post("/api/v1/files/bulk-delete/", { file_ids: fileIds });
    }
    for (const id of folderIds) {
      await apiClient.delete(`/api/v1/folders/${id}/`);
    }
    loadData();
    setSelectedIds(new Set());
  };

  const toggleFavorite = async (file: FileItem) => {
    await apiClient.post(`/api/v1/files/${file.id}/favorite/`);
    loadData();
  };

  const renameItem = async (item: FileItem | FolderItem, newName: string) => {
    const isFile = "mime_type" in item;
    const url = isFile ? `/api/v1/files/${item.id}/` : `/api/v1/folders/${item.id}/`;
    await apiClient.patch(url, { name: newName });
    loadData();
  };

  return (
    <ExplorerContext.Provider
      value={{
        currentFolderId,
        setCurrentFolderId,
        files,
        folders,
        loading,
        refreshExplorer: loadData,
        selectedIds,
        toggleSelection,
        selectAll,
        clearSelection,
        viewMode,
        setViewMode,
        sortField,
        setSortField,
        filter,
        setFilter,
        searchQuery,
        setSearchQuery,
        uploadFiles,
        deleteSelected,
        toggleFavorite,
        renameItem,
      }}
    >
      {children}
    </ExplorerContext.Provider>
  );
}

export function useExplorer() {
  const context = useContext(ExplorerContext);
  if (!context) throw new Error("useExplorer must be used within an ExplorerProvider");
  return context;
}
