import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "@/api/client";
import { X, Download, FileText, Loader2 } from "lucide-react";

interface FilePreviewModalProps {
  file: any;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isImage = file?.mime_type?.startsWith("image/");
  const isPdf = file?.mime_type?.includes("pdf");

  useEffect(() => {
    if (!file) return;

    let objectUrl: string | null = null;
    const controller = new AbortController();

    async function loadPreview() {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("conflux_access_token");
      if (!token) {
        setError("Your session has expired. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/files/${file.id}/download/`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Preview request failed (${response.status})`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Unable to load this file preview.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadPreview();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  if (!file) return null;

  const downloadFile = async () => {
    const token = localStorage.getItem("conflux_access_token");
    if (!token) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/files/${file.id}/download/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-overlay backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-bg-surface border border-border rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-modal)] flex flex-col cfx-scale-in">
        <div className="p-4 bg-bg-sunken border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <h3 className="font-bold text-text-primary text-[var(--font-size-subtitle)] truncate max-w-md" title={file.name}>
              {file.name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadFile}
              className="inline-flex items-center gap-1 text-[var(--font-size-caption)] font-semibold bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-normal)]"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
            <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary rounded-[var(--radius-md)] hover:bg-bg-surface transition-colors duration-[var(--duration-fast)]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-bg-sunken">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-[var(--font-size-caption)]">Loading preview...</p>
            </div>
          ) : error ? (
            <div className="text-center space-y-3 py-12">
              <FileText className="w-16 h-16 text-text-muted mx-auto" />
              <p className="text-[var(--font-size-caption)] text-text-secondary">{error}</p>
            </div>
          ) : isImage && previewUrl ? (
            <img src={previewUrl} alt={file.name} className="max-h-[70vh] max-w-full object-contain rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]" />
          ) : isPdf && previewUrl ? (
            <iframe src={previewUrl} title={file.name} className="w-full h-[70vh] rounded-[var(--radius-lg)] border border-border" />
          ) : (
            <div className="text-center space-y-3 py-12">
              <FileText className="w-16 h-16 text-text-muted mx-auto" />
              <p className="text-[var(--font-size-caption)] text-text-secondary">Preview not supported for this file type ({file.mime_type}).</p>
              <button onClick={downloadFile} className="inline-block bg-primary hover:bg-primary-hover text-white text-[var(--font-size-caption)] font-semibold px-4 py-2 rounded-[var(--radius-lg)] transition-colors duration-[var(--duration-normal)]">
                Download File to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
