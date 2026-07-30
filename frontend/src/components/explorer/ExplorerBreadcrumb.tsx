import React from "react";
import { useExplorer } from "./ExplorerContext";
import { ChevronRight, Home, Folder } from "lucide-react";

export function ExplorerBreadcrumb() {
  const { currentFolderId, setCurrentFolderId, folders } = useExplorer();

  const getBreadcrumbChain = () => {
    if (!currentFolderId) return [];
    const chain: { id: number; name: string }[] = [];
    let curr = folders.find((f) => f.id === currentFolderId);
    while (curr) {
      chain.unshift({ id: curr.id, name: curr.name });
      curr = folders.find((f) => f.id === curr?.parent);
    }
    return chain;
  };

  const chain = getBreadcrumbChain();

  return (
    <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
      <button
        onClick={() => setCurrentFolderId(null)}
        className="flex items-center gap-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Root Storage</span>
      </button>

      {chain.map((item, idx) => (
        <React.Fragment key={item.id}>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button
            onClick={() => setCurrentFolderId(item.id)}
            className={`flex items-center gap-1 cursor-pointer ${
              idx === chain.length - 1
                ? "text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-amber-500" />
            <span>{item.name}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
