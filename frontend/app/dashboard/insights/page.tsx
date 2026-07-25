"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { PieChart, CheckCircle, BarChart3, TrendingUp, Info } from "lucide-react";
import { BRAND } from "@/lib/brand";

export default function StorageInsights() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadInsights = async () => {
    try {
      const data = await fetchApi("/api/v1/dashboard/stats/");
      setStats(data);
    } catch (e) {
      console.error("Failed to load insights", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 GB";
    const gb = bytes / 1024 / 1024 / 1024;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FCFCFD]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const drives = stats?.drives_breakdown || [];
  const insights = stats?.insights || [];
  const totalUsed = stats?.used_storage || 0;

  const getRecommendation = () => {
    if (drives.length < 2) return "Connect at least two storage drives to unlock balancing recommendations.";
    const unhealthy = drives.filter((d: any) => d.health !== 'healthy');
    if (unhealthy.length > 0) return `Caution: ${unhealthy.length} storage account needs health attention. Test connection.`;
    
    const driveUtils = drives.map((d: any) => ({
      name: d.nickname,
      usedPct: d.total > 0 ? (d.used / d.total * 100) : 0
    }));
    const maxUtil = Math.max(...driveUtils.map((d: any) => d.usedPct));
    const minUtil = Math.min(...driveUtils.map((d: any) => d.usedPct));

    if (maxUtil - minUtil > 30) {
      const highest = driveUtils.find((d: any) => d.usedPct === maxUtil);
      const lowest = driveUtils.find((d: any) => d.usedPct === minUtil);
      return `Suggestion: Storage utilization mismatch detected. Drive '${highest?.name}' (${maxUtil.toFixed(0)}% used) is significantly more utilized than '${lowest?.name}' (${minUtil.toFixed(0)}% used). Upload rules will balance future file distribution.`;
    }

    return `Status: ${BRAND.name} Storage pool is balanced. File distribution is operating optimally.`;
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <header className="border-b border-slate-200/80 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
          <PieChart className="w-6 h-6 text-blue-600" /> Storage Insights & Analytics
        </h2>
        <p className="text-xs text-slate-500 mt-1">Deep analytics on your unified storage pool and category breakdown.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Type Distribution */}
        <Card className="lg:col-span-2 bg-white border-slate-200 p-6 flex flex-col justify-between rounded-2xl shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5 mb-6 border-b border-slate-100 pb-3">
              <PieChart className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Consumption by File Category</h3>
            </div>
            <div className="space-y-5">
              {insights.map((item: any) => {
                const percentage = totalUsed > 0 ? (item.size / totalUsed * 100) : 0;
                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800">{item.category}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{formatSize(item.size)} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                      <div 
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Storage Pool Health */}
        <Card className="bg-white border-slate-200 p-6 flex flex-col justify-between rounded-2xl shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5 mb-6 border-b border-slate-100 pb-3">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">{BRAND.name} Storage Health</h3>
            </div>
            
            <div className="space-y-5 text-xs">
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-blue-900 leading-relaxed font-medium">{getRecommendation()}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Total Storage Pool:</span>
                  <span className="text-slate-900 font-bold font-mono">{formatSize(stats?.total_storage)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Active Storage Drives:</span>
                  <span className="text-slate-900 font-bold">{drives.length} Connected</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Overall Pool Health:</span>
                  <span className="text-green-700 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Healthy
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Disk Space Distribution */}
        <Card className="lg:col-span-3 bg-white border-slate-200 p-6 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2.5 mb-6 border-b border-slate-100 pb-3">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Disk Space Utilization Distribution</h3>
          </div>
          
          <div className="space-y-5">
            {drives.map((d: any) => (
              <div key={d.id} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900">{d.nickname}</span>
                    <span className="text-slate-400 text-[11px]">({d.email})</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">{formatSize(d.used)} of {formatSize(d.total)} used ({d.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/60">
                  <div 
                    className={`h-full rounded-full ${
                      d.percentage > 90 ? 'bg-red-600' : d.percentage > 70 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${d.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
