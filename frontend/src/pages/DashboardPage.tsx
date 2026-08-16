import React from "react";
import { Explorer } from "@/components/explorer/Explorer";
import { ExplorerProvider } from "@/components/explorer/ExplorerContext";

export function DashboardPage() {
  return (
    <ExplorerProvider>
      <Explorer />
    </ExplorerProvider>
  );
}
