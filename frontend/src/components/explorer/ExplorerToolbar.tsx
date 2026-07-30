import React from "react";
import { useExplorer, FilterType, SortField } from "./ExplorerContext";
import {
  LayoutGrid, List, Search, Upload, Plus, Folder, Filter, Image, FileText, Star, ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ExplorerToolbar({ onNewFolderClick }: { onNewFolderClick: () => void }) {
  const {
    viewMode, setViewMode, filter, setFilter, sortField, setSortField,
    searchQuery, setSearchQuery, uploadFiles
  } = useExplorer();

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const filters: { type: FilterType; label: string; icon: any }[] = [
    { type: "all", label: "All Items", icon: Filter },
    { type: "images", label: "Images", icon: Image },
    { type: "pdf", label: "PDFs", icon: FileText },
    { type: "favorites", label: "Starred", icon: Star },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="flex flex-1 items-center gap-2">
        <Button onClick={onNewFolderClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs">
          <Plus className="w-4 h-4 mr-1" /> New Folder
        </Button>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input
            placeholder="Search drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs h-8"
          />
        </div>

        <div className="hidden lg:flex items-center gap-1">
          {filters.map((f) => {
            const Icon = f.icon;
            const active = filter === f.type;
            return (
              <button
                key={f.type}
                onClick={() => setFilter(f.type)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Sort Selector */}
        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="bg-transparent font-semibold focus:outline-hidden cursor-pointer text-xs"
          >
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="updated_at">Last Modified</option>
          </select>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-800">
          <button
            onClick={() => setViewMode("list")}
            title="List View"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "list" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs" : "text-slate-400"}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            title="Grid View"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "grid" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs" : "text-slate-400"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Button */}
        <label className="cursor-pointer inline-flex items-center justify-center rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 transition-colors shadow-2xs">
          <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload File
          <input type="file" multiple onChange={handleFileInput} className="hidden" />
        </label>
      </div>
    </div>
  );
}
