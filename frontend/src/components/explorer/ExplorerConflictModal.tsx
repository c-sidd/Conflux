import React from "react";
import { AlertTriangle, Copy, Replace, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConflictModalProps {
  filename: string;
  onReplace: () => void;
  onKeepBoth: () => void;
  onSkip: () => void;
}

export function ExplorerConflictModal({ filename, onReplace, onKeepBoth, onSkip }: ConflictModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-bg-surface rounded-[var(--radius-2xl)] p-6 border border-border shadow-[var(--shadow-modal)] space-y-5 text-center cfx-scale-in">
        <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-warning-light border border-warning/20 text-warning flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-[var(--font-size-subtitle)] font-bold text-text-primary">Duplicate File Detected</h3>
          <p className="text-[var(--font-size-caption)] text-text-secondary leading-relaxed">
            A file named <strong className="text-text-primary">{filename}</strong> already exists in this folder.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Button onClick={onReplace} className="w-full">
            <Replace className="w-3.5 h-3.5 mr-1.5" /> Replace Existing File
          </Button>
          <Button onClick={onKeepBoth} variant="outline" className="w-full">
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Keep Both (Append Number)
          </Button>
          <Button onClick={onSkip} variant="ghost" className="w-full text-text-muted">
            <SkipForward className="w-3.5 h-3.5 mr-1.5" /> Skip File
          </Button>
        </div>
      </div>
    </div>
  );
}
