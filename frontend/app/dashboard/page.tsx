"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Folder as FolderIcon, File as FileIcon, UploadCloud, Plus, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function Dashboard() {
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    try {
      const [foldersData, filesData] = await Promise.all([
        fetchApi("/api/folders/"),
        fetchApi("/api/files/"),
      ]);
      setFolders(foldersData);
      setFiles(filesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await fetchApi("/api/folders/", {
        method: "POST",
        body: JSON.stringify({ name: newFolderName }),
      });
      setNewFolderName("");
      setIsFolderDialogOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await fetchApi("/api/files/", {
        method: "POST",
        body: formData,
      });
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (id: number) => {
    try {
      await fetchApi(`/api/files/${id}/`, { method: "DELETE" });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFolder = async (id: number) => {
    try {
      await fetchApi(`/api/folders/${id}/`, { method: "DELETE" });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-8 z-10">
      <header className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-white">My Files</h2>
        <div className="flex items-center gap-4">
          <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            } />
            <DialogContent className="bg-zinc-900 border border-zinc-800 text-white">
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input 
                  placeholder="Folder Name" 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white"
                />
              </div>
              <Button onClick={handleCreateFolder} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Create
              </Button>
            </DialogContent>
          </Dialog>

          <div>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label htmlFor="file-upload">
              <Button render={
                <span>
                  {uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  ) : (
                    <UploadCloud className="w-4 h-4 mr-2" />
                  )}
                  Upload File
                </span>
              } className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg cursor-pointer" />
            </label>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders */}
          {folders.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Folders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {folders.map(folder => (
                  <Card key={folder.id} className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-4 flex items-center justify-between hover:bg-zinc-800 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FolderIcon className="w-8 h-8 text-blue-400 shrink-0" />
                      <span className="font-medium text-zinc-200 truncate">{folder.name}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200">
                        <DropdownMenuItem className="text-red-400 hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer" onClick={() => handleDeleteFolder(folder.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Files */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Files</h3>
            {files.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
                <UploadCloud className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-300">No files yet</h3>
                <p className="text-zinc-500">Upload a file to get started.</p>
              </div>
            ) : (
              <div className="bg-zinc-900/50 backdrop-blur rounded-2xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                      <th className="p-4 font-semibold">Name</th>
                      <th className="p-4 font-semibold">Size</th>
                      <th className="p-4 font-semibold">Type</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {files.map(file => (
                      <tr key={file.id} className="hover:bg-zinc-800/30 transition-colors group">
                        <td className="p-4 flex items-center gap-3">
                          <FileIcon className="w-6 h-6 text-purple-400" />
                          <span className="font-medium text-zinc-200">{file.name}</span>
                        </td>
                        <td className="p-4 text-zinc-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</td>
                        <td className="p-4 text-zinc-500 text-sm">{file.mime_type.split('/')[1] || 'Unknown'}</td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200">
                              {file.web_view_link && (
                                <DropdownMenuItem className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer" onClick={() => window.open(file.web_view_link, "_blank")}>
                                  View
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-400 hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer" onClick={() => handleDeleteFile(file.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
