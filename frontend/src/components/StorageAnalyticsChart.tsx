import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { StorageAccount } from "@/types";
import { Server, Database, CheckCircle2 } from "lucide-react";

interface StorageAnalyticsChartProps {
  accounts: StorageAccount[];
}

export function StorageAnalyticsChart({ accounts }: StorageAnalyticsChartProps) {
  if (!accounts || accounts.length === 0) return null;

  // Conflux production chart palette
  const COLORS = ["#1F4E79", "#5E7A8A", "#9FBFD1", "#E2C044", "#16A34A"];

  const totalBytes = accounts.reduce((acc, a) => acc + (a.total_storage || 0), 0);
  const usedBytes = accounts.reduce((acc, a) => acc + (a.used_storage || 0), 0);
  const freeBytes = Math.max(0, totalBytes - usedBytes);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const overallPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
  const isAnyUsed = accounts.some((a) => a.used_storage > 0);

  const chartData = accounts.map((acc) => {
    const rawUsedGB = acc.used_storage / (1024 * 1024 * 1024);
    const rawTotalGB = acc.total_storage / (1024 * 1024 * 1024);
    return {
      name: acc.nickname || acc.provider_email,
      value: isAnyUsed ? parseFloat(Math.max(0.01, rawUsedGB).toFixed(2)) : parseFloat(rawTotalGB.toFixed(2)),
      actualUsedBytes: acc.used_storage,
      totalBytes: acc.total_storage,
    };
  });

  return (
    <div className="bg-bg-surface border border-border rounded-[var(--radius-2xl)] p-6 space-y-6 shadow-[var(--shadow-sm)] cfx-animate-in">
      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-bg-sunken border border-border rounded-[var(--radius-xl)] space-y-1">
          <div className="flex items-center justify-between text-text-muted text-[var(--font-size-label)] font-bold uppercase tracking-wider">
            <span>Total Capacity</span>
            <Server className="w-4 h-4 text-primary" />
          </div>
          <p className="text-[var(--font-size-h3)] font-extrabold text-text-primary">{formatBytes(totalBytes)}</p>
          <p className="text-[var(--font-size-micro)] text-text-muted">Pooled across {accounts.length} account(s)</p>
        </div>

        <div className="p-4 bg-bg-sunken border border-border rounded-[var(--radius-xl)] space-y-1">
          <div className="flex items-center justify-between text-text-muted text-[var(--font-size-label)] font-bold uppercase tracking-wider">
            <span>Used Space</span>
            <Database className="w-4 h-4 text-secondary" />
          </div>
          <p className="text-[var(--font-size-h3)] font-extrabold text-primary">{formatBytes(usedBytes)}</p>
          <p className="text-[var(--font-size-micro)] text-text-muted">{overallPercent}% of total utilization</p>
        </div>

        <div className="p-4 bg-bg-sunken border border-border rounded-[var(--radius-xl)] space-y-1">
          <div className="flex items-center justify-between text-text-muted text-[var(--font-size-label)] font-bold uppercase tracking-wider">
            <span>Free Space</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <p className="text-[var(--font-size-h3)] font-extrabold text-success">{formatBytes(freeBytes)}</p>
          <p className="text-[var(--font-size-micro)] text-text-muted">Available for file uploads</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[var(--font-size-caption)] font-bold text-text-primary">
          <span>Overall Pooled Storage Usage</span>
          <span>{overallPercent}% ({formatBytes(usedBytes)} / {formatBytes(totalBytes)})</span>
        </div>
        <div className="h-3 w-full bg-bg-sunken rounded-[var(--radius-full)] overflow-hidden border border-border/60">
          <div
            className="h-full bg-primary rounded-[var(--radius-full)] transition-all duration-700"
            style={{ width: `${Math.max(1, overallPercent)}%` }}
          />
        </div>
      </div>

      {/* Distribution Chart */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-[var(--font-size-subtitle)] font-bold text-text-primary">Account Storage Distribution</h4>
            <p className="text-[var(--font-size-label)] text-text-muted">
              {isAnyUsed ? "Used storage breakdown per connected cloud account" : "Allocated storage quota distribution per account"}
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F4E79",
                  borderRadius: "10px",
                  border: "none",
                  color: "#FFFFFF",
                  padding: "8px 14px",
                  boxShadow: "0 8px 30px rgba(15,23,42,0.2)"
                }}
                itemStyle={{ color: "#FFFFFF", fontSize: "12px", fontWeight: "700" }}
                labelStyle={{ color: "#FFFFFF", fontSize: "12px", fontWeight: "700" }}
                formatter={(val: any, name: any, item: any) => [
                  `${formatBytes(item.payload.actualUsedBytes)} used of ${formatBytes(item.payload.totalBytes)}`,
                  item.payload.name
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: "12px", fontWeight: "600", color: "#1E293B" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
