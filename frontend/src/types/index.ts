export interface User {
  id: string;
  email: string;
  status: 'active' | 'pending' | 'disabled';
  email_verified_at: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface QuotaSnapshot {
  quota_total_bytes: number | null;
  quota_used_bytes: number | null;
  quota_observed_at: string | null;
  quota_source: string | null;
}

export interface ConnectedAccount {
  id: string;
  provider: string;
  email: string | null;
  display_name: string | null;
  connection_status: 'CONNECTED' | 'NEEDS_REAUTH' | 'DISCONNECTED' | 'ERROR';
  last_successful_sync_at: string | null;
  last_sync_attempt_at: string | null;
  last_error_code: string | null;
  quota: QuotaSnapshot;
  created_at: string;
  updated_at: string;
}

export interface FileCapabilities {
  can_trash: boolean;
  can_restore: boolean;
  can_delete: boolean;
  can_rename: boolean;
  can_move: boolean;
  can_copy: boolean;
  can_share: boolean;
  can_download: boolean;
  can_export: boolean;
}

export interface FileMetadata {
  id: string;
  connected_account_id: string;
  source_account_email: string | null;
  provider: string;
  provider_file_id: string;
  name: string;
  mime_type: string;
  description: string | null;
  parent_provider_file_id: string | null;
  size_bytes: number | null;
  modified_time_provider: string | null;
  created_time_provider: string | null;
  web_view_link: string | null;
  trashed_provider: boolean;
  is_folder: boolean;
  is_shortcut: boolean;
  is_starred: boolean;
  capabilities: FileCapabilities;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileOperation {
  id: string;
  operation_type: string;
  status: 'QUEUED' | 'RUNNING' | 'VERIFYING' | 'AWAITING_CONFIRMATION' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCEL_REQUESTED' | 'CANCELLED';
  source_account_id: string | null;
  destination_account_id: string | null;
  source_file_id: string | null;
  destination_file_id: string | null;
  progress_current: number;
  progress_total: number;
  progress_percentage: number;
  safe_error_code: string | null;
  safe_error_message: string | null;
  retryable: boolean;
  confirmation_requested_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
}

export interface TrashItem {
  id: string;
  connected_account_id: string;
  source_account_email: string | null;
  provider_file_id: string;
  name: string;
  mime_type: string;
  size_bytes: number | null;
  trashed_at: string | null;
  recoverable: boolean;
  recovery_status: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  next_page_token: string | null;
  total_count: number | null;
}

export interface ApiError {
  code: string;
  message: string;
  request_id: string;
  details?: any;
}
