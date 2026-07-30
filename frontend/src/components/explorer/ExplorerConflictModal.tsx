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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">Duplicate File Detected</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            A file named <strong className="text-slate-800">{filename}</strong> already exists in this folder.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Button onClick={onReplace} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-xl">
            <Replace className="w-3.5 h-3.5 mr-1.5" /> Replace Existing File
          </Button>
          <Button onClick={onKeepBoth} variant="outline" className="w-full border-slate-200 text-slate-700 text-xs py-2 rounded-xl">
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Keep Both (Append Number)
          </Button>
          <Button onClick={onSkip} variant="ghost" className="w-full text-slate-500 hover:text-slate-800 text-xs py-2">
            <SkipForward className="w-3.5 h-3.5 mr-1.5" /> Skip File
          </Button>
        </div>
      </div>
    </div>
  );
}
