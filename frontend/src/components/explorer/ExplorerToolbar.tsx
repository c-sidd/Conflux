import React from "react";
import { useExplorer, FilterType, SortField } from "./ExplorerContext";
import {
  LayoutGrid, List, Search, Upload, Plus, Filter, Image, FileText, Star, ArrowUpDown
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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-bg-surface border-b border-border transition-colors duration-[var(--duration-normal)]">
      <div className="flex flex-1 items-center gap-2">
        <Button onClick={onNewFolderClick}>
          <Plus className="w-4 h-4 mr-1" /> New Folder
        </Button>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
          <Input
            placeholder="Search drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8"
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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-[var(--font-size-caption)] font-medium transition-all duration-[var(--duration-normal)] cursor-pointer ${
                  active
                    ? "bg-primary-light text-primary border border-primary/20 font-bold"
                    : "text-text-secondary hover:bg-primary-light hover:text-primary"
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
        <div className="flex items-center gap-1 text-[var(--font-size-caption)] text-text-primary bg-bg-sunken border border-border rounded-[var(--radius-lg)] px-2.5 py-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="bg-transparent font-medium focus:outline-hidden cursor-pointer text-[var(--font-size-caption)]"
          >
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="updated_at">Last Modified</option>
          </select>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center border border-border rounded-[var(--radius-lg)] p-0.5 bg-bg-sunken">
          <button
            onClick={() => setViewMode("list")}
            title="List View"
            className={`p-1.5 rounded-[var(--radius-md)] transition-all duration-[var(--duration-normal)] cursor-pointer ${viewMode === "list" ? "bg-bg-surface text-primary shadow-[var(--shadow-xs)] font-bold" : "text-text-muted hover:text-text-secondary"}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            title="Grid View"
            className={`p-1.5 rounded-[var(--radius-md)] transition-all duration-[var(--duration-normal)] cursor-pointer ${viewMode === "grid" ? "bg-bg-surface text-primary shadow-[var(--shadow-xs)] font-bold" : "text-text-muted hover:text-text-secondary"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Button */}
        <label className="cursor-pointer inline-flex items-center justify-center rounded-[var(--radius-lg)] text-[var(--font-size-caption)] font-semibold bg-primary hover:bg-primary-hover active:bg-primary-active text-white px-3.5 py-1.5 transition-all duration-[var(--duration-normal)] shadow-[var(--shadow-sm)] active:scale-[0.98]">
          <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload File
          <input type="file" multiple onChange={handleFileInput} className="hidden" />
        </label>
      </div>
    </div>
  );
}
