import { getSession } from "next-auth/react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const session = await getSession();
  
  const headers = new Headers(options.headers || {});
  
  // @ts-ignore
  if (session?.accessToken) {
    // @ts-ignore
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  // Set default content type to JSON if not uploading FormData
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "API request failed");
  }

  return response.json().catch(() => ({}));
}
