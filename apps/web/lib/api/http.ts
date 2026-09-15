const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
).replace(/\/$/, "");

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly response?: ApiResponse<unknown>;

  constructor(
    message: string,
    status: number,
    response?: ApiResponse<unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

async function parseResponse<T>(
  response: Response,
): Promise<ApiResponse<T>> {
  let body: ApiResponse<T>;

  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      `API returned an invalid response (${response.status})`,
      response.status,
    );
  }

  if (!response.ok) {
    throw new ApiError(
      body.message ||
        `Request failed with status ${response.status}`,
      response.status,
      body as ApiResponse<unknown>,
    );
  }

  return body;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers = new Headers(
    options.headers,
  );

  /*
   * Do not manually set Content-Type for FormData.
   *
   * The browser automatically supplies:
   * multipart/form-data; boundary=...
   */
  if (
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
      credentials: "include",
    },
  );

  return parseResponse<T>(response);
}

export const api = {
  get<T>(endpoint: string) {
    return request<T>(endpoint, {
      method: "GET",
    });
  },

  post<T>(
    endpoint: string,
    data: unknown,
  ) {
    return request<T>(endpoint, {
      method: "POST",
      body:
        data instanceof FormData
          ? data
          : JSON.stringify(data),
    });
  },

  patch<T>(
    endpoint: string,
    data: unknown,
  ) {
    return request<T>(endpoint, {
      method: "PATCH",
      body:
        data instanceof FormData
          ? data
          : JSON.stringify(data),
    });
  },

  delete<T>(endpoint: string) {
    return request<T>(endpoint, {
      method: "DELETE",
    });
  },
};