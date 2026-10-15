import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  id?: string;
  name: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem, index: number) => void;
  rootLabel?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  onNavigate,
  rootLabel = 'My Drive',
}) => {
  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-600 mb-4" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate({ name: rootLabel }, -1)}
        className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-200 hover:text-slate-900 transition-colors font-medium"
      >
        <Home className="h-4 w-4" />
        <span>{rootLabel}</span>
      </button>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.id || index}>
            <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <button
              onClick={() => onNavigate(item, index)}
              disabled={isLast}
              className={`px-1.5 py-1 rounded max-w-[180px] truncate transition-colors ${
                isLast
                  ? 'text-slate-900 font-semibold cursor-default'
                  : 'hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {item.name}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
