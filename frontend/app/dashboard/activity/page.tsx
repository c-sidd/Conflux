"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Activity as ActivityIcon, ShieldCheck } from "lucide-react";
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
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <header className="border-b border-slate-200/80 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <ActivityIcon className="w-6 h-6 text-blue-600" /> Audit Activity Timeline
        </h2>
        <p className="text-xs text-slate-500 mt-1">Chronological history of security events, file operations, and storage synchronization.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No activity recorded"
          description="Workspace activities and security events will be logged here in real-time."
        />
      ) : (
        <Card className="bg-white border-slate-200 p-6 rounded-2xl shadow-2xs">
          <div className="space-y-6 relative border-l border-slate-200 pl-6 ml-3">
            {activities.map(act => (
              <div key={act.id} className="relative space-y-1 text-xs">
                <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-slate-100"></div>
                <div className="flex justify-between items-center text-slate-500">
                  <span className="font-mono text-[11px]">{new Date(act.timestamp).toLocaleString()}</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold uppercase text-[10px] border border-slate-200">{act.action}</span>
                </div>
                <p className="text-sm font-bold text-slate-900">{act.details?.filename || act.details?.folder_name || act.details?.drive_nickname || act.action}</p>
                <div className="text-[11px] text-slate-600 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
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
