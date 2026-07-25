"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Activity as ActivityIcon, ShieldCheck, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/empty-state";

export default function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/v1/storage/activities/")
      .then(data => setActivities(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 overflow-auto p-8 z-10 space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <ActivityIcon className="w-8 h-8 text-blue-400" /> Audit Activity Log
        </h2>
        <p className="text-zinc-400 text-sm mt-1">Complete system action audit trail and security events.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No activity recorded"
          description="Actions performed in your workspace will appear in this audit log."
        />
      ) : (
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6">
          <div className="space-y-6 relative border-l border-zinc-800 pl-6 ml-3">
            {activities.map(act => (
              <div key={act.id} className="relative space-y-1">
                <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-zinc-950"></div>
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span className="font-mono">{new Date(act.timestamp).toLocaleString()}</span>
                  <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-semibold uppercase">{act.action}</span>
                </div>
                <p className="text-sm font-bold text-white">{act.details?.filename || act.details?.folder_name || act.details?.drive_nickname || act.action}</p>
                <div className="text-xs text-zinc-400 font-mono bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  {JSON.stringify(act.details)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
