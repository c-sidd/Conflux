const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("dcs_access_token") : null;
  
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Ensure Content-Type is deleted for FormData so browser sets multipart/form-data with boundary
  if (options.body instanceof FormData) {
    headers.delete("Content-Type");
  } else if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Automatically prepend /v1 if path starts with /api/ and doesn't already have /v1
  let normalizedEndpoint = endpoint;
  if (normalizedEndpoint.startsWith("/api/") && !normalizedEndpoint.startsWith("/api/v1/")) {
    normalizedEndpoint = normalizedEndpoint.replace("/api/", "/api/v1/");
  }

  const response = await fetch(`${API_BASE}${normalizedEndpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || "API request failed");
  }

  return response.json().catch(() => ({}));
}
