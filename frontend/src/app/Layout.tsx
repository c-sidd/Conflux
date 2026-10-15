import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/client';
import { useAuth } from '../features/auth/AuthContext';
import { UploadModal } from '../features/uploads/UploadModal';
import { Button } from '../components/ui/Button';
import {
  Activity,
  HardDrive,
  LogOut,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  Users,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.accounts.list(),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/files?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  // Compute total aggregate storage used across accounts
  const totalStorageBytes = accounts.reduce((acc, a) => acc + (a.quota.quota_total_bytes || 0), 0);
  const usedStorageBytes = accounts.reduce((acc, a) => acc + (a.quota.quota_used_bytes || 0), 0);
  const storagePct = totalStorageBytes > 0 ? Math.min(100, Math.round((usedStorageBytes / totalStorageBytes) * 100)) : 0;

  const navLinks = [
    { to: '/files', icon: HardDrive, label: 'All Files' },
    { to: '/starred', icon: Star, label: 'Starred' },
    { to: '/accounts', icon: Users, label: 'Connected Accounts' },
    { to: '/operations', icon: Activity, label: 'Operations Center' },
    { to: '/trash', icon: Trash2, label: 'Trash' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <Link to="/files" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-sm">
              <HardDrive className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">Conflux</span>
          </Link>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-4 hidden md:block">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search across all connected Google Drive accounts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-100 hover:bg-slate-200/70 focus:bg-white pl-9 pr-4 py-2 rounded-xl text-sm border border-transparent focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>
        </form>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
              {user?.email[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block truncate max-w-[140px]">
              {user?.email}
            </span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs text-slate-400">Signed in as</p>
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.email}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  logout();
                }}
                className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-surface-sidebar border-r border-slate-200 p-4 flex flex-col justify-between hidden md:flex">
          <div className="space-y-6">
            <Button
              onClick={() => setIsUploadOpen(true)}
              className="w-full py-2.5 shadow-sm rounded-xl flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Upload</span>
            </Button>

            <nav className="space-y-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Storage Meter */}
          {accounts.length > 0 && (
            <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Total Storage</span>
                <span>{storagePct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-brand-600 h-1.5 rounded-full"
                  style={{ width: `${storagePct}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-slate-400">
                {(usedStorageBytes / (1024 * 1024 * 1024)).toFixed(1)} GB of{' '}
                {(totalStorageBytes / (1024 * 1024 * 1024)).toFixed(1)} GB used across {accounts.length} accounts
              </p>
            </div>
          )}
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Upload Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
};
