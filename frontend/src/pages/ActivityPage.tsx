import React, { useState } from "react";
import { apiClient } from "@/api/client";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, Upload, Download, Edit3, Move, Trash2, RotateCcw, Link2, Search, Clock
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");

  const { data: activities = [], isLoading: loading } = useQuery<ActivityItem[]>({
    queryKey: ["activities"],
    queryFn: async () => (await apiClient.get("/api/v1/storage/activities/")).data,
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "upload":
        return { label: "File Uploaded", icon: Upload, color: "text-primary bg-primary-light border-primary/20" };
      case "download":
        return { label: "File Downloaded", icon: Download, color: "text-success bg-success-light border-success/20" };
      case "rename":
        return { label: "Renamed", icon: Edit3, color: "text-secondary bg-secondary-light border-secondary/20" };
      case "move":
        return { label: "Moved", icon: Move, color: "text-warning bg-warning-light border-warning/20" };
      case "delete":
        return { label: "Trashed", icon: Trash2, color: "text-danger bg-danger-light border-danger/20" };
      case "restore":
        return { label: "Restored", icon: RotateCcw, color: "text-success bg-success-light border-success/20" };
      case "connect":
        return { label: "Drive Connected", icon: Link2, color: "text-primary bg-primary-light border-primary/20" };
      default:
        return { label: action, icon: Activity, color: "text-text-secondary bg-bg-sunken border-border" };
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
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl cfx-animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[var(--font-size-h3)] font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Workspace Activity Log
          </h1>
          <p className="text-[var(--font-size-caption)] text-text-muted mt-0.5">Real-time audit history of file uploads, downloads, and drive events</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-2.5" />
            <Input
              placeholder="Filter activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-[var(--font-size-caption)] h-8 w-44"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="h-8 text-[var(--font-size-caption)] bg-bg-surface border border-border rounded-[var(--radius-lg)] px-2.5 font-semibold text-text-primary focus:outline-hidden cursor-pointer"
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
        <div className="text-[var(--font-size-caption)] text-text-muted text-center py-12">Loading activity log...</div>
      ) : filteredActivities.length === 0 ? (
        <Card className="p-8 text-center space-y-3 max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-bg-sunken text-text-muted flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-[var(--font-size-subtitle)] font-bold text-text-primary">No Activity Recorded</h3>
          <p className="text-[var(--font-size-caption)] text-text-muted">File actions and drive events will be logged here automatically.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((act) => {
            const badge = getActionBadge(act.action);
            const Icon = badge.icon;
            const filename = act.details?.filename || act.details?.source_file || act.old_path || "File Item";
            const driveName = act.details?.drive_nickname || "Google Drive";

            return (
              <Card key={act.id} className="p-4 flex items-center justify-between hover:border-border-hover">
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-[var(--radius-lg)] border ${badge.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--font-size-caption)] font-bold text-text-primary">{filename}</span>
                      <span className="text-[var(--font-size-micro)] font-semibold text-text-muted">via {driveName}</span>
                    </div>
                    <p className="text-[var(--font-size-label)] text-text-secondary mt-0.5">
                      {badge.label} {act.new_path && `→ ${act.new_path}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[var(--font-size-label)] font-medium text-text-muted">
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
