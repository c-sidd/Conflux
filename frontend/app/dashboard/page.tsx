"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Folder as FolderIcon, File as FileIcon, UploadCloud, Plus, MoreVertical, Trash2, HardDrive, FileText, FolderPlus, HelpCircle, Activity } from "lucide-react";
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
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  
  // Upload Pre-flight Simulation
  const [pendingFile, setPendingFile] = useState<any>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  
  // Upload status
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    try {
      const [statsData, foldersData, filesData, activitiesData] = await Promise.all([
        fetchApi("/api/dashboard/stats/"),
        fetchApi("/api/folders/"),
        fetchApi("/api/files/"),
        fetchApi("/api/storage/activities/"),
      ]);
      setStats(statsData);
      setFolders(foldersData);
      setFiles(filesData);
      setActivities(activitiesData);
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

  // Trigger pre-flight simulation
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    setSimulating(true);

    try {
      const simResult = await fetchApi("/api/files/simulate/", {
        method: "POST",
        body: JSON.stringify({
          name: file.name,
          size: file.size
        })
      });
      setSimulation(simResult);
    } catch (e: any) {
      alert(e.message || "Simulation failed. Do you have connected drives?");
      setPendingFile(null);
    } finally {
      setSimulating(false);
    }
  };

  // Confirm final upload
  const executeUpload = async () => {
    if (!pendingFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", pendingFile);

    try {
      await fetchApi("/api/files/", {
        method: "POST",
        body: formData,
      });
      setPendingFile(null);
      setSimulation(null);
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

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 GB";
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const totalDrives = stats?.connected_drives || 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Zero State
  if (totalDrives === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto shadow-xl">
          <HardDrive className="w-8 h-8 text-zinc-500" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">No storage accounts connected</h2>
          <p className="text-zinc-500 text-sm">
            DCS combines multiple cloud drives into one unified storage pool. Please connect your first Google Drive account to begin uploading files.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/storage")} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold shadow-lg">
          Connect Google Drive
        </Button>
      </div>
    );
  }

  const overallPercentage = stats?.total_storage > 0 ? (stats.used_storage / stats.total_storage * 100) : 0;

  return (
    <div className="flex-1 overflow-auto p-8 z-10 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">Welcome</h2>
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
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <label htmlFor="file-upload">
              <Button nativeButton={false} render={
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

      {/* Grid Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total combined storage */}
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6 space-y-4 cursor-pointer hover:bg-zinc-900/80 transition-all" onClick={() => setIsBreakdownOpen(true)}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Total Storage</span>
            <HardDrive className="w-5 h-5 text-blue-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-extrabold text-white">{formatSize(stats?.total_storage)}</h3>
            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${overallPercentage}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Used: {formatSize(stats?.used_storage)}</span>
              <span>Remaining: {formatSize(stats?.remaining_storage)}</span>
            </div>
          </div>
        </Card>

        {/* Drives count */}
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6 flex flex-col justify-between cursor-pointer hover:bg-zinc-900/80 transition-all" onClick={() => router.push("/dashboard/storage")}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Connected Drives</span>
            <HardDrive className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-3xl font-extrabold text-white">{stats?.connected_drives}</h3>
        </Card>

        {/* Metrics count */}
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6 flex justify-between gap-4">
          <div className="flex-1 flex flex-col justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Files</span>
            <h3 className="text-2xl font-extrabold text-white mt-2">{stats?.total_files}</h3>
          </div>
          <div className="w-px bg-zinc-800"></div>
          <div className="flex-1 flex flex-col justify-between pl-4">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Folders</span>
            <h3 className="text-2xl font-extrabold text-white mt-2">{stats?.total_folders}</h3>
          </div>
        </Card>
      </section>

      {/* Main Contents Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Virtual Filesystem tree */}
        <div className="lg:col-span-2 space-y-8">
          {/* Folders */}
          {folders.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Folders</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {folders.map(folder => (
                  <Card key={folder.id} className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors cursor-pointer group">
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
              <div className="text-center py-16 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
                <UploadCloud className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-md font-medium text-zinc-300">No files yet</h3>
                <p className="text-zinc-500 text-xs">Upload your first file to test distribution.</p>
              </div>
            ) : (
              <div className="bg-zinc-900/50 backdrop-blur rounded-2xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                      <th className="p-4 font-semibold">Name</th>
                      <th className="p-4 font-semibold">Size</th>
                      <th className="p-4 font-semibold">Stored In</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {files.map(file => (
                      <tr key={file.id} className="hover:bg-zinc-800/20 transition-colors group">
                        <td className="p-4 flex items-center gap-3">
                          <FileIcon className="w-6 h-6 text-purple-400 shrink-0" />
                          <span className="font-medium text-zinc-200 truncate max-w-[200px]">{file.name}</span>
                        </td>
                        <td className="p-4 text-zinc-400 text-sm">{formatSize(file.size)}</td>
                        <td className="p-4 text-zinc-500 text-sm truncate max-w-[120px]">{file.storage_account?.nickname || 'Google Drive'}</td>
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

        {/* Activity Timeline logs */}
        <div className="space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Activity Timeline</h3>
            </div>
            
            {activities.length === 0 ? (
              <p className="text-zinc-500 text-sm">No activity recorded yet.</p>
            ) : (
              <div className="space-y-4 relative border-l border-zinc-800 pl-4 ml-2">
                {activities.map(act => (
                  <div key={act.id} className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-zinc-950"></div>
                    <p className="text-xs text-zinc-500">{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    <p className="text-sm text-zinc-300 font-semibold">{act.action === 'upload' ? 'File Uploaded' : act.action === 'delete' ? 'File Deleted' : act.action === 'connect' ? 'Drive Connected' : 'Drive Disconnected'}</p>
                    <p className="text-xs text-zinc-500 truncate max-w-[200px]">{act.details?.filename || act.details?.drive_nickname}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Storage Breakdown Detail Modal */}
      <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
        <DialogContent className="bg-zinc-900 border border-zinc-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Storage Breakdown Overview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[300px] overflow-y-auto">
            {stats?.drives_breakdown?.map((d: any) => (
              <div key={d.id} className="space-y-2 border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-zinc-200">{d.nickname}</p>
                    <p className="text-xs text-zinc-500">{d.email}</p>
                  </div>
                  <p className="text-xs text-zinc-400 font-bold">{formatSize(d.used)} of {formatSize(d.total)} ({d.percentage}%)</p>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${d.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Simulation Dialog (Pre-flight Confirmation) */}
      <Dialog open={!!pendingFile && !!simulation} onOpenChange={() => { setPendingFile(null); setSimulation(null); }}>
        <DialogContent className="bg-zinc-900 border border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Intelligent Storage Simulation</DialogTitle>
          </DialogHeader>
          {simulation && (
            <div className="space-y-6 py-4">
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">File Selected:</span>
                  <span className="font-semibold text-zinc-200 max-w-[200px] truncate">{pendingFile?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">File Size:</span>
                  <span className="font-bold text-white">{formatSize(pendingFile?.size)}</span>
                </div>
                <div className="h-px bg-zinc-800"></div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Best Destination:</span>
                  <span className="font-bold text-green-400">{simulation.nickname}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Current Free Space:</span>
                  <span className="text-zinc-300">{formatSize(simulation.current_free)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Projected Free Space:</span>
                  <span className="text-zinc-300 font-semibold">{formatSize(simulation.projected_free)}</span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={() => { setPendingFile(null); setSimulation(null); }}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold shadow-lg" onClick={executeUpload}>
                  {uploading ? "Uploading..." : "Confirm Upload"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
