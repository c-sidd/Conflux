import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-bg-canvas text-text-muted font-sans text-[var(--font-size-caption)] space-y-3">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-[var(--radius-full)] cfx-spin" />
        <p>Loading workspace...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
