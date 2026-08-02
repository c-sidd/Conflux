import React from "react";
import { useExplorer } from "@/components/explorer/ExplorerContext";
import { ExplorerGrid } from "@/components/explorer/ExplorerGrid";
import { Star } from "lucide-react";

export function FavoritesPage() {
  const { setFilter } = useExplorer();

  React.useEffect(() => {
    setFilter("favorites");
  }, [setFilter]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg-canvas">
      <div className="p-4 bg-bg-surface border-b border-border flex items-center gap-2">
        <Star className="w-5 h-5 text-brand-gold fill-current" />
        <h1 className="text-[var(--font-size-subtitle)] font-bold text-text-primary">Starred Files</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ExplorerGrid />
      </div>
    </div>
  );
}
