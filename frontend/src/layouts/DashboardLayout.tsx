import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ExplorerProvider } from "@/components/explorer/ExplorerContext";

export function DashboardLayout() {
  return (
    <ExplorerProvider>
      <div className="flex h-screen w-full bg-bg-canvas overflow-hidden font-sans antialiased">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Header />
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-bg-canvas">
            <Outlet />
          </main>
        </div>
      </div>
    </ExplorerProvider>
  );
}
