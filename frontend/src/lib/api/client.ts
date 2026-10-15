import { ApiError, ConnectedAccount, FileMetadata, FileOperation, PaginatedResponse, TrashItem, User } from '../../types';

const API_BASE = '/api/v1';

class ApiClientError extends Error {
  code: string;
  requestId: string;
  details?: any;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.requestId = error.request_id;
    this.details = error.details;
  }
}

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)conflux_csrf=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Double-submit CSRF protection for mutating requests
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends conflux_session cookie
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    if (typeof data === 'object' && data.code && data.message) {
      throw new ApiClientError(data as ApiError);
    }
    throw new ApiClientError({
      code: 'HTTP_ERROR',
      message: typeof data === 'string' ? data : `HTTP ${response.status}`,
      request_id: response.headers.get('x-request-id') || 'unknown',
    });
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    register: (body: { email: string; password: string; security_question?: string; security_answer?: string }) =>
      request<User>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<User>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    logout: () =>
      request<{ message: string }>('/auth/logout', { method: 'POST' }),
    me: () =>
      request<User>('/auth/me', { method: 'GET' }),
    getSecurityQuestion: (email: string) =>
      request<{ email: string; security_question: string }>('/auth/security-question', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPasswordWithQuestion: (body: { email: string; security_answer: string; new_password: string }) =>
      request<{ message: string }>('/auth/reset-password-question', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    forgotPassword: (email: string) =>
      request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (body: { token: string; new_password: string }) =>
      request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
    csrf: () =>
      request<{ csrf_token: string }>('/auth/csrf', { method: 'GET' }),
  },

  // Accounts
  accounts: {
    list: () =>
      request<ConnectedAccount[]>('/accounts', { method: 'GET' }),
    get: (id: string) =>
      request<ConnectedAccount>(`/accounts/${id}`, { method: 'GET' }),
    authorizeGoogle: () =>
      request<{ authorization_url: string; state: string }>('/accounts/google/authorize', { method: 'POST' }),
    sync: (id: string) =>
      request<{ operation_id: string; status: string; message: string }>(`/accounts/${id}/sync`, { method: 'POST' }),
    refreshQuota: (id: string) =>
      request<{ quota_total_bytes: number; quota_used_bytes: number }>(`/accounts/${id}/refresh-quota`, { method: 'POST' }),
    disconnect: (id: string) =>
      request<{ message: string }>(`/accounts/${id}`, { method: 'DELETE' }),
  },

  // Files
  files: {
    listUnified: (params?: { account_id?: string; parent_id?: string; is_root_only?: boolean; limit?: number; offset?: number; sort_by?: string }) => {
      const q = new URLSearchParams();
      if (params?.account_id) q.set('account_id', params.account_id);
      if (params?.parent_id) q.set('parent_id', params.parent_id);
      if (params?.is_root_only) q.set('is_root_only', 'true');
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.sort_by) q.set('sort_by', params.sort_by);
      return request<PaginatedResponse<FileMetadata>>(`/files?${q.toString()}`, { method: 'GET' });
    },
    listAccount: (accountId: string, params?: { parent_id?: string; is_root_only?: boolean; limit?: number; offset?: number; sort_by?: string }) => {
      const q = new URLSearchParams();
      if (params?.parent_id) q.set('parent_id', params.parent_id);
      if (params?.is_root_only) q.set('is_root_only', 'true');
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.sort_by) q.set('sort_by', params.sort_by);
      return request<PaginatedResponse<FileMetadata>>(`/accounts/${accountId}/files?${q.toString()}`, { method: 'GET' });
    },
    getFolderChildren: (folderId: string, limit = 50, offset = 0) =>
      request<PaginatedResponse<FileMetadata>>(`/folders/${folderId}/children?limit=${limit}&offset=${offset}`, { method: 'GET' }),
    get: (id: string) =>
      request<FileMetadata>(`/files/${id}`, { method: 'GET' }),
    rename: (id: string, name: string) =>
      request<FileMetadata>(`/files/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    toggleStar: (id: string, is_starred: boolean) =>
      request<{ message: string }>(`/files/${id}/star`, { method: 'POST', body: JSON.stringify({ is_starred }) }),
    listStarred: (limit = 50) =>
      request<FileMetadata[]>(`/files/starred?limit=${limit}`, { method: 'GET' }),
    search: (query: string, accountId?: string) => {
      const q = new URLSearchParams({ q: query });
      if (accountId) q.set('account_id', accountId);
      return request<PaginatedResponse<FileMetadata>>(`/search?${q.toString()}`, { method: 'GET' });
    },
    copy: (id: string, destinationAccountId?: string, destinationParentId?: string) =>
      request<FileOperation>(`/files/${id}/copy`, {
        method: 'POST',
        body: JSON.stringify({ destination_account_id: destinationAccountId, destination_parent_file_id: destinationParentId }),
      }),
    move: (id: string, destinationAccountId?: string, destinationParentId?: string) =>
      request<FileOperation>(`/files/${id}/move`, {
        method: 'POST',
        body: JSON.stringify({ destination_account_id: destinationAccountId, destination_parent_file_id: destinationParentId }),
      }),
    trash: (id: string) =>
      request<{ message: string }>(`/files/${id}/trash`, { method: 'POST' }),
    restore: (id: string) =>
      request<{ message: string }>(`/files/${id}/restore`, { method: 'POST' }),
    deletePermanently: (id: string) =>
      request<{ message: string }>(`/files/${id}`, { method: 'DELETE' }),
    downloadUrl: (id: string) => `${API_BASE}/files/${id}/content`,
    exportUrl: (id: string, mimeType = 'application/pdf') => `${API_BASE}/files/${id}/export?mime_type=${encodeURIComponent(mimeType)}`,
  },

  // Uploads
  uploads: {
    initiate: (body: { name: string; mime_type?: string; size_bytes: number; destination_account_id?: string; parent_file_id?: string }) =>
      request<{
        operation_id: string;
        status: string;
        destination_account_id: string;
        destination_account_email: string;
        placement_type: string;
        placement_reason: string;
        upload_url: string;
      }>('/uploads', { method: 'POST', body: JSON.stringify(body) }),
    complete: (operationId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return request<FileOperation>(`/uploads/${operationId}/complete`, { method: 'POST', body: formData });
    },
    getStatus: (operationId: string) =>
      request<FileOperation>(`/uploads/${operationId}`, { method: 'GET' }),
  },

  // Operations
  operations: {
    list: (limit = 50, offset = 0) =>
      request<PaginatedResponse<FileOperation>>(`/operations?limit=${limit}&offset=${offset}`, { method: 'GET' }),
    get: (id: string) =>
      request<FileOperation>(`/operations/${id}`, { method: 'GET' }),
    confirmSourceRemoval: (id: string) =>
      request<FileOperation>(`/operations/${id}/confirm-source-removal`, { method: 'POST', body: JSON.stringify({ confirmed: true }) }),
    cancel: (id: string) =>
      request<FileOperation>(`/operations/${id}/cancel`, { method: 'POST' }),
  },

  // Trash
  trash: {
    list: (limit = 50) =>
      request<TrashItem[]>(`/trash?limit=${limit}`, { method: 'GET' }),
  },
};
