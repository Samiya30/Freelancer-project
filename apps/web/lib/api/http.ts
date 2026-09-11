const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  let body: ApiResponse<T>;

  try {
    body = await response.json();
  } catch {
    throw new Error(
      `API returned an invalid response (${response.status})`
    );
  }

  if (!response.ok) {
    throw new Error(
      body.message || `Request failed with status ${response.status}`
    );
  }

  return body;
}

export const api = {
  get<T>(endpoint: string) {
    return request<T>(endpoint, {
      method: "GET",
    });
  },

  post<T>(endpoint: string, data: unknown) {
    return request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  patch<T>(endpoint: string, data: unknown) {
    return request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete<T>(endpoint: string) {
    return request<T>(endpoint, {
      method: "DELETE",
    });
  },
};