import React from "react";
import { API_BASE_URL } from "@/api/client";
import { X, Download, FileText } from "lucide-react";

interface FilePreviewModalProps {
  file: any;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  if (!file) return null;

  const token = localStorage.getItem("conflux_access_token") || "";
  const downloadUrl = `${API_BASE_URL}/api/v1/files/${file.id}/download/${token ? `?token=${token}` : ""}`;
  const isImage = file.mime_type?.startsWith("image/");
  const isPdf = file.mime_type?.includes("pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#22223B] border border-slate-200 dark:border-[#4A4E69]/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 bg-slate-50 dark:bg-[#111111] border-b border-slate-200 dark:border-[#4A4E69]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#2563EB]" />
            <h3 className="font-bold text-[#0F172A] dark:text-white text-sm truncate max-w-md" title={file.name}>
              {file.name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <a href={downloadUrl} download className="inline-flex items-center gap-1 text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3 py-1.5 rounded-xl shadow-2xs">
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 dark:bg-[#111111]">
          {isImage ? (
            <img src={downloadUrl} alt={file.name} className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-md" />
          ) : isPdf ? (
            <iframe src={downloadUrl} title={file.name} className="w-full h-[70vh] rounded-xl border border-slate-200" />
          ) : (
            <div className="text-center space-y-3 py-12">
              <FileText className="w-16 h-16 text-[#94A3B8] mx-auto" />
              <p className="text-xs text-[#475569] dark:text-[#C9ADA7]">Preview not supported for this file type ({file.mime_type}).</p>
              <a href={downloadUrl} download className="inline-block bg-[#2563EB] text-white text-xs font-bold px-4 py-2 rounded-xl">
                Download File to View
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
