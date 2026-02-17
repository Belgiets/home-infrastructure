const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface RegisterData {
  name?: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
}

interface MessageResponse {
  message: string;
}

// Camera Files types
export interface CameraFile {
  id: string;
  fileName: string;
  gcsPath: string;
  status: string;
  uploadedAt: string;
  createdAt: string;
  imageUrl: string;
}

export interface CameraFilesResponse {
  data: CameraFile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CameraFilesQuery {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CameraFilesStats {
  totalFiles: number;
  uploadedToday: number;
  uploadedThisWeek: number;
  uploadedThisMonth: number;
  recentUploads: { date: string; count: number }[];
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Track if we're currently refreshing to prevent multiple refresh calls
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  };

  const response = await fetch(url, config);

  // If 401 and we can retry - try to refresh tokens
  if (response.status === 401 && retry) {
    // If already refreshing, wait for that to complete
    if (isRefreshing && refreshPromise) {
      const refreshed = await refreshPromise;
      if (refreshed) {
        return request<T>(endpoint, options, false);
      }
    } else {
      // Start refresh process
      isRefreshing = true;
      refreshPromise = refreshTokens();

      const refreshed = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (refreshed) {
        // Retry original request with new tokens
        return request<T>(endpoint, options, false);
      }
    }

    // Refresh failed - redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session expired");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.message || "Something went wrong");
  }

  return response.json();
}

export const api = {
  auth: {
    // Public endpoints - no retry on 401
    register: (data: RegisterData): Promise<MessageResponse> =>
      request<MessageResponse>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
        false
      ),

    login: (data: LoginData): Promise<MessageResponse> =>
      request<MessageResponse>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
        false
      ),

    // Protected endpoints - retry on 401
    logout: (): Promise<MessageResponse> =>
      request<MessageResponse>("/auth/logout", {
        method: "POST",
      }),

    refresh: (): Promise<MessageResponse> =>
      request<MessageResponse>(
        "/auth/refresh",
        {
          method: "POST",
        },
        false
      ),

    me: (): Promise<User> => request<User>("/auth/me"),
  },

  cameraFiles: {
    list: (query: CameraFilesQuery = {}): Promise<CameraFilesResponse> => {
      const params = new URLSearchParams();
      if (query.page) params.set("page", query.page.toString());
      if (query.limit) params.set("limit", query.limit.toString());
      if (query.search) params.set("search", query.search);
      if (query.dateFrom) params.set("dateFrom", query.dateFrom);
      if (query.dateTo) params.set("dateTo", query.dateTo);

      const queryString = params.toString();
      return request<CameraFilesResponse>(
        `/camera-files${queryString ? `?${queryString}` : ""}`
      );
    },

    getById: (id: string): Promise<CameraFile> =>
      request<CameraFile>(`/camera-files/${id}`),

    getStats: (): Promise<CameraFilesStats> =>
      request<CameraFilesStats>("/camera-files/stats"),
  },
};

export { ApiError };
