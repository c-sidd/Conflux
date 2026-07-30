import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

// Public Pages
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";

// Dashboard Pages
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { StoragePage } from "@/pages/StoragePage";
import { StorageCallbackPage } from "@/pages/StorageCallbackPage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { RecentPage } from "@/pages/RecentPage";
import { TrashPage } from "@/pages/TrashPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ActivityPage } from "@/pages/ActivityPage";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/storage" element={<StoragePage />} />
          <Route path="/dashboard/storage/callback" element={<StorageCallbackPage />} />
          <Route path="/dashboard/favorites" element={<FavoritesPage />} />
          <Route path="/dashboard/recent" element={<RecentPage />} />
          <Route path="/dashboard/trash" element={<TrashPage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
          <Route path="/dashboard/activity" element={<ActivityPage />} />
        </Route>
      </Route>

      {/* Fallback Catch-All Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
