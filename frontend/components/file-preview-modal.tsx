"use client";

import { useState, useEffect } from "react";
import { X, Download, FileText, Image as ImageIcon, Video as VideoIcon, FileCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilePreviewModalProps {
  file: any | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: any) => void;
}

export default function FilePreviewModal({ file, isOpen, onClose, onDownload }: FilePreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !file) return;

    setLoading(true);
    setTextContent(null);

    const isText = file.mime_type?.startsWith("text/") || file.name?.endsWith(".txt") || file.name?.endsWith(".json") || file.name?.endsWith(".md");

    if (isText) {
      const token = localStorage.getItem("dcs_access_token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      
      fetch(`${API_BASE}/api/v1/files/${file.id}/download/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.text())
        .then(text => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const mime = file.mime_type || "";
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf" || file.name?.endsWith(".pdf");
  const isVideo = mime.startsWith("video/");
  const isText = mime.startsWith("text/") || file.name?.endsWith(".txt") || file.name?.endsWith(".json") || file.name?.endsWith(".md");

  const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/v1/files/${file.id}/download/`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-3 overflow-hidden">
            {isImage && <ImageIcon className="w-5 h-5 text-blue-400 shrink-0" />}
            {isPdf && <FileText className="w-5 h-5 text-red-400 shrink-0" />}
            {isVideo && <VideoIcon className="w-5 h-5 text-purple-400 shrink-0" />}
            {isText && <FileCode className="w-5 h-5 text-green-400 shrink-0" />}
            <h3 className="font-bold text-white text-base truncate">{file.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => onDownload(file)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
              <Download className="w-4 h-4 mr-1.5" /> Download
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-zinc-950/80 min-h-[400px]">
          {loading ? (
            <div className="text-center space-y-2 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
              <p className="text-sm">Loading preview...</p>
            </div>
          ) : isImage ? (
            <img src={file.web_view_link || downloadUrl} alt={file.name} className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg" />
          ) : isPdf ? (
            <iframe src={file.web_view_link || downloadUrl} className="w-full h-[70vh] rounded-xl border border-zinc-800" title={file.name} />
          ) : isVideo ? (
            <video controls src={downloadUrl} className="max-h-[70vh] max-w-full rounded-xl shadow-lg">
              Your browser does not support video playback.
            </video>
          ) : isText && textContent !== null ? (
            <pre className="w-full h-[70vh] overflow-auto p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 whitespace-pre-wrap">
              {textContent}
            </pre>
          ) : (
            <div className="text-center space-y-4 py-12">
              <FileText className="w-16 h-16 text-zinc-600 mx-auto" />
              <div>
                <h4 className="text-lg font-bold text-white">No preview available</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                  Preview is not supported for file type <code className="text-blue-400">{file.mime_type || "unknown"}</code>. Download the file to view its contents.
                </p>
              </div>
              <Button onClick={() => onDownload(file)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold">
                Download File
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
