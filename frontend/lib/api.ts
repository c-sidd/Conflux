const getApiBase = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  return envUrl.replace(/\/+$/, "");
};

export function buildApiUrl(endpoint: string): string {
  const base = getApiBase();
  let path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Automatically prepend /v1 if path starts with /api/ and doesn't already have /v1
  if (path.startsWith("/api/") && !path.startsWith("/api/v1/")) {
    path = path.replace("/api/", "/api/v1/");
  } else if (!path.startsWith("/api/")) {
    path = `/api/v1${path}`;
  }

  return `${base}${path}`;
}

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

  const url = buildApiUrl(endpoint);
  
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    console.error(`Network error requesting ${url}:`, err);
    throw new Error(`Failed to connect to backend server (${url}). Please verify network connection and API service status.`);
  }

  const responseText = await response.text();
  let data: any = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (e) {
    console.error(`Server at ${url} returned non-JSON response (${response.status}):`, responseText);
    if (!response.ok) {
      throw new Error(`Server Error (${response.status}): Endpoint ${url} returned a non-JSON response.`);
    }
  }

  if (!response.ok) {
    const errorMsg = data.error || data.detail || data.message || `API request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}
