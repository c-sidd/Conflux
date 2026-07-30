import React from "react";
import { ExplorerProvider } from "@/components/explorer/ExplorerContext";
import { ExplorerList } from "@/components/explorer/ExplorerList";
import { Clock } from "lucide-react";

export function RecentPage() {
  return (
    <ExplorerProvider>
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
        <div className="p-4 bg-white border-b border-slate-200/80 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          <h1 className="text-sm font-bold text-slate-900">Recent Files</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ExplorerList />
        </div>
      </div>
    </ExplorerProvider>
  );
}
