import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/client";
import {
  Activity, Upload, Download, Edit3, Move, Trash2, RotateCcw, Link2, Search, Filter, Clock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ActivityItem {
  id: number;
  action: string;
  old_path?: string;
  new_path?: string;
  details: Record<string, any>;
  timestamp: string;
}

export function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");

  useEffect(() => {
    apiClient
      .get("/api/v1/storage/activities/")
      .then((res) => setActivities(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "upload":
        return { label: "File Uploaded", icon: Upload, color: "text-blue-600 bg-blue-50 border-blue-200" };
      case "download":
        return { label: "File Downloaded", icon: Download, color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
      case "rename":
        return { label: "Renamed", icon: Edit3, color: "text-purple-600 bg-purple-50 border-purple-200" };
      case "move":
        return { label: "Moved", icon: Move, color: "text-amber-600 bg-amber-50 border-amber-200" };
      case "delete":
        return { label: "Trashed", icon: Trash2, color: "text-red-600 bg-red-50 border-red-200" };
      case "restore":
        return { label: "Restored", icon: RotateCcw, color: "text-teal-600 bg-teal-50 border-teal-200" };
      case "connect":
        return { label: "Drive Connected", icon: Link2, color: "text-indigo-600 bg-indigo-50 border-indigo-200" };
      default:
        return { label: action, icon: Activity, color: "text-slate-600 bg-slate-100 border-slate-200" };
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredActivities = activities.filter((act) => {
    const matchesAction = selectedAction === "all" || act.action === selectedAction;
    const detailsStr = JSON.stringify(act.details || {}).toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = !query || detailsStr.includes(query) || act.action.includes(query);
    return matchesAction && matchesQuery;
  });

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Workspace Activity Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time audit history of file uploads, downloads, and drive events</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <Input
              placeholder="Filter activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs bg-white border-slate-200 h-8 w-44"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="h-8 text-xs bg-white border border-slate-200 rounded-xl px-2.5 font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Actions</option>
            <option value="upload">Uploads</option>
            <option value="download">Downloads</option>
            <option value="rename">Renames</option>
            <option value="move">Moves</option>
            <option value="delete">Deletes</option>
            <option value="restore">Restores</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 text-center py-12">Loading activity log...</div>
      ) : filteredActivities.length === 0 ? (
        <Card className="p-8 text-center space-y-3 max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Activity Recorded</h3>
          <p className="text-xs text-slate-500">File actions and drive events will be logged here automatically.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((act) => {
            const badge = getActionBadge(act.action);
            const Icon = badge.icon;
            const filename = act.details?.filename || act.details?.source_file || act.old_path || "File Item";
            const driveName = act.details?.drive_nickname || "Google Drive";

            return (
              <Card key={act.id} className="p-4 flex items-center justify-between hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-xl border ${badge.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{filename}</span>
                      <span className="text-[10px] font-semibold text-slate-400">via {driveName}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {badge.label} {act.new_path && `→ ${act.new_path}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(act.timestamp)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
