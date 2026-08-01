import React, { useState, useEffect } from "react";
import { useExplorer } from "./ExplorerContext";
import { Upload } from "lucide-react";

export function ExplorerDropZone() {
  const { uploadFiles } = useExplorer();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        uploadFiles(Array.from(e.dataTransfer.files));
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [uploadFiles]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-50 bg-primary/85 backdrop-blur-sm border-4 border-dashed border-white/50 flex flex-col items-center justify-center text-white text-center p-6 space-y-4 cfx-animate-in">
      <div className="w-20 h-20 rounded-[var(--radius-full)] bg-white/15 flex items-center justify-center animate-bounce">
        <Upload className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-[var(--font-size-h2)] font-extrabold tracking-tight">Drop files here to upload to Conflux</h2>
      <p className="text-[var(--font-size-body)] font-medium text-white/75">Your files will be automatically stored across your connected Google Drive accounts.</p>
    </div>
  );
}
