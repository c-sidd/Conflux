import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function DashboardLayout() {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Header />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
