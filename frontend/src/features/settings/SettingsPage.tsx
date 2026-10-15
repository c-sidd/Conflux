import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { HardDrive, Shield, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">Settings & Security</h1>
        <p className="text-sm text-slate-500 mt-1">
          Account preferences, session security, and data storage policy.
        </p>
      </div>

      {/* Profile Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">User Profile</h3>
            <p className="text-xs text-slate-500">Your Conflux account identity</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-sm">
          <div>
            <span className="text-xs text-slate-400 block">Email Address</span>
            <span className="font-medium text-slate-800">{user?.email}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Account Status</span>
            <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Security & Sessions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-brand-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Security & Credentials</h3>
            <p className="text-xs text-slate-500">Encryption, tenant boundaries, and access control</p>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100 text-sm text-slate-600">
          <p className="text-xs text-slate-500">
            • Google OAuth refresh tokens are encrypted at rest using AES-256-GCM envelope encryption and are never exposed to the browser.
          </p>
          <p className="text-xs text-slate-500">
            • Conflux sessions use Secure, HttpOnly cookies with CSRF validation.
          </p>
          <p className="text-xs text-slate-500">
            • File contents remain securely stored in your original Google Drive accounts.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <Link to="/accounts">
            <Button variant="secondary" size="sm">
              <HardDrive className="w-3.5 h-3.5 mr-1.5" />
              Manage Google Accounts
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => logout()} className="text-red-600 border-red-200 hover:bg-red-50">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
