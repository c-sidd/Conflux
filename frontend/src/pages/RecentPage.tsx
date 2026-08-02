import React from "react";
import { useExplorer } from "@/components/explorer/ExplorerContext";
import { ExplorerList } from "@/components/explorer/ExplorerList";
import { Clock } from "lucide-react";

export function RecentPage() {
  const { setFilter, setSortField } = useExplorer();

  React.useEffect(() => {
    setFilter("all");
    setSortField("updated_at");
  }, [setFilter, setSortField]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg-canvas">
      <div className="p-4 bg-bg-surface border-b border-border flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        <h1 className="text-[var(--font-size-subtitle)] font-bold text-text-primary">Recent Files</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ExplorerList />
      </div>
    </div>
  );
}
