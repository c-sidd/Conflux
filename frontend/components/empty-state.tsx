"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed p-8 space-y-4 max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto shadow-xl">
        <Icon className="w-8 h-8 text-zinc-500" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button onClick={onAction} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg">
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
