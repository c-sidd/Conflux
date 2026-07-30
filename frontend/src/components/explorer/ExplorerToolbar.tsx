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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white border-b border-[#E2E8F0] transition-colors">
      <div className="flex flex-1 items-center gap-2">
        <Button onClick={onNewFolderClick} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-2xs">
          <Plus className="w-4 h-4 mr-1" /> New Folder
        </Button>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
          <Input
            placeholder="Search drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-[#F8FAFC] border border-[#E2E8F0] text-xs h-8 text-[#0F172A] focus:border-[#2563EB]"
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
                    ? "bg-[#DBEAFE] text-[#2563EB] border border-[#2563EB]/30 font-bold"
                    : "text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
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
        <div className="flex items-center gap-1 text-xs text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2 py-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
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
        <div className="flex items-center border border-[#E2E8F0] rounded-xl p-0.5 bg-[#F8FAFC]">
          <button
            onClick={() => setViewMode("list")}
            title="List View"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "list" ? "bg-white text-[#2563EB] shadow-2xs font-bold" : "text-[#94A3B8]"}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            title="Grid View"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === "grid" ? "bg-white text-[#2563EB] shadow-2xs font-bold" : "text-[#94A3B8]"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Button */}
        <label className="cursor-pointer inline-flex items-center justify-center rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-1.5 transition-colors shadow-2xs">
          <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload File
          <input type="file" multiple onChange={handleFileInput} className="hidden" />
        </label>
      </div>
    </div>
  );
}
