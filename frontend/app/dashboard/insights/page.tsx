"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { PieChart, ShieldAlert, CheckCircle, BarChart3, TrendingUp, Info } from "lucide-react";

export default function StorageInsights() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadInsights = async () => {
    try {
      const data = await fetchApi("/api/dashboard/stats/");
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
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const drives = stats?.drives_breakdown || [];
  const insights = stats?.insights || [];
  const totalUsed = stats?.used_storage || 0;

  // Calculate recommendation
  const getRecommendation = () => {
    if (drives.length < 2) return "Connect at least two storage drives to unlock balancing recommendations.";
    const unhealthy = drives.filter((d: any) => d.health !== 'healthy');
    if (unhealthy.length > 0) return `Caution: ${unhealthy.length} storage account needs health attention. Test connection.`;
    
    // Find highest & lowest utilization
    const driveUtils = drives.map((d: any) => ({
      name: d.nickname,
      usedPct: d.total > 0 ? (d.used / d.total * 100) : 0
    }));
    const maxUtil = Math.max(...driveUtils.map((d: any) => d.usedPct));
    const minUtil = Math.min(...driveUtils.map((d: any) => d.usedPct));

    if (maxUtil - minUtil > 30) {
      const highest = driveUtils.find((d: any) => d.usedPct === maxUtil);
      const lowest = driveUtils.find((d: any) => d.usedPct === minUtil);
      return `Suggestion: Storage utilization mismatch detected. Drive '${highest?.name}' (${maxUtil.toFixed(0)}% used) is significantly more utilized than '${lowest?.name}' (${minUtil.toFixed(0)}% used). Upload rules can help balance future file distribution.`;
    }

    return "Status: DCS Storage pool is perfectly balanced. File distribution is operating optimally.";
  };

  return (
    <div className="flex-1 overflow-auto p-8 z-10">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white">Storage Insights</h2>
        <p className="text-zinc-400 text-sm mt-1">Deep analytics on your unified storage pool and contents</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* File Type Distribution */}
        <Card className="lg:col-span-2 bg-zinc-900/50 backdrop-blur border-zinc-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <PieChart className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Consumption by File Category</h3>
            </div>
            <div className="space-y-6">
              {insights.map((item: any) => {
                const percentage = totalUsed > 0 ? (item.size / totalUsed * 100) : 0;
                return (
                  <div key={item.category} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-zinc-300">{item.category}</span>
                      <span className="text-zinc-400">{formatSize(item.size)} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-blue-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* AI Recommendations */}
        <Card className="bg-zinc-900/50 backdrop-blur border-zinc-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">DCS Storage Health</h3>
            </div>
            
            <div className="space-y-6">
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-zinc-300 text-sm leading-relaxed">{getRecommendation()}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Total Storage Pool:</span>
                  <span className="text-white font-bold">{formatSize(stats?.total_storage)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Active Storage Drives:</span>
                  <span className="text-white font-bold">{drives.length} Connected</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Overall Drive Health:</span>
                  <span className="text-white font-bold flex items-center gap-1 text-green-400">
                    <CheckCircle className="w-4 h-4" /> Healthy
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Storage Distribution Chart */}
        <Card className="lg:col-span-3 bg-zinc-900/50 backdrop-blur border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Disk Space Utilization Distribution</h3>
          </div>
          
          <div className="space-y-6">
            {drives.map((d: any) => (
              <div key={d.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-300">{d.nickname}</span>
                    <span className="text-zinc-500 text-xs">({d.email})</span>
                  </div>
                  <span className="text-zinc-400">{formatSize(d.used)} of {formatSize(d.total)} used ({d.percentage}%)</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      d.percentage > 90 ? 'bg-red-500' : d.percentage > 70 ? 'bg-amber-500' : 'bg-blue-500'
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
