export interface User {
  id: number;
  username: string;
  email: string;
  is_verified: boolean;
  email_verified_at?: string;
  last_password_change?: string;
  date_joined?: string;
}

export interface StorageAccount {
  id: number;
  nickname: string;
  provider: "google" | "dropbox" | "s3";
  provider_type: string;
  provider_email: string;
  total_storage: number;
  used_storage: number;
  health_status: "healthy" | "expired_token" | "unauthorized" | "offline";
  is_active: boolean;
  workspace_folder_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FileItem {
  id: number;
  name: string;
  size: number;
  mime_type: string;
  web_view_link?: string;
  is_favorite: boolean;
  is_trashed: boolean;
  folder: number | null;
  storage_account: StorageAccount;
  created_at: string;
  updated_at: string;
}

export interface FolderItem {
  id: number;
  name: string;
  parent: number | null;
  is_trashed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SecurityEvent {
  id: number;
  event_type: string;
  ip_address: string;
  user_agent: string;
  device: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UserSession {
  id: number;
  device_name: string;
  ip_address: string;
  last_active: string;
  is_current: boolean;
  created_at: string;
}
