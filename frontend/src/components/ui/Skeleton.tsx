import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  return (
    <div className="w-full space-y-3 py-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3 bg-white rounded-lg border border-slate-100">
          <div className="h-5 w-5 bg-slate-200 rounded"></div>
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-100 rounded w-1/4"></div>
          <div className="h-4 bg-slate-100 rounded w-1/6"></div>
          <div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div>
        </div>
      ))}
    </div>
  );
};
