import React from "react";
import { ExplorerProvider, useExplorer } from "@/components/explorer/ExplorerContext";
import { ExplorerGrid } from "@/components/explorer/ExplorerGrid";
import { Star } from "lucide-react";

function FavoritesContent() {
  const { setFilter } = useExplorer();
  React.useEffect(() => {
    setFilter("favorites");
  }, [setFilter]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      <div className="p-4 bg-white border-b border-slate-200/80 flex items-center gap-2">
        <Star className="w-5 h-5 text-amber-500 fill-current" />
        <h1 className="text-sm font-bold text-slate-900">Starred Files</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ExplorerGrid />
      </div>
    </div>
  );
}

export function FavoritesPage() {
  return (
    <ExplorerProvider>
      <FavoritesContent />
    </ExplorerProvider>
  );
}
