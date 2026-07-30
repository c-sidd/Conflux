import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { StorageAccount } from "@/types";

interface StorageAnalyticsChartProps {
  accounts: StorageAccount[];
}

export function StorageAnalyticsChart({ accounts }: StorageAnalyticsChartProps) {
  if (!accounts || accounts.length === 0) return null;

  const COLORS = ["#F26A21", "#C94F0C", "#6B7280", "#2B2B2B", "#3B82F6"];

  const data = accounts.map((acc) => ({
    name: acc.nickname || acc.provider_email,
    value: parseFloat((acc.used_storage / (1024 * 1024 * 1024)).toFixed(2)),
  }));

  return (
    <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#2B2B2B] rounded-3xl p-5 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#111111] dark:text-white">Storage Capacity Distribution</h3>
          <p className="text-xs text-[#6B7280]">Real-time breakdown of used storage across connected cloud drives (GB)</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#2B2B2B", borderRadius: "12px", border: "none", color: "#FFF", fontSize: "12px" }}
              formatter={(val: any) => [`${val} GB`, "Used"]}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "11px" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
