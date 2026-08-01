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
    <div className="flex items-center gap-1 text-[var(--font-size-caption)] font-medium text-text-secondary px-4 py-2.5 bg-bg-sunken border-b border-border">
      <button
        onClick={() => setCurrentFolderId(null)}
        className="flex items-center gap-1 text-text-muted hover:text-primary cursor-pointer transition-colors duration-[var(--duration-fast)]"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Root Storage</span>
      </button>

      {chain.map((item, idx) => (
        <React.Fragment key={item.id}>
          <ChevronRight className="w-3.5 h-3.5 text-text-disabled" />
          <button
            onClick={() => setCurrentFolderId(item.id)}
            className={`flex items-center gap-1 cursor-pointer transition-colors duration-[var(--duration-fast)] ${
              idx === chain.length - 1
                ? "text-primary font-bold"
                : "text-text-muted hover:text-primary"
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-brand-gold" />
            <span>{item.name}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
