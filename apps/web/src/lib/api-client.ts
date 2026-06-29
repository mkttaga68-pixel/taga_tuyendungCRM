import { useAuthStore } from "@/stores/auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ApiRequestOptions extends RequestInit {
  /** Bỏ qua Authorization header và cơ chế tự refresh — dùng cho /auth/login. */
  skipAuth?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken: string };
        useAuthStore.getState().setAccessToken(data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function rawRequest(path: string, options: ApiRequestOptions): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = useAuthStore.getState().accessToken;
  if (token && !options.skipAuth) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

/** Gọi NestJS API, tự thử refresh access token 1 lần khi gặp 401 rồi retry. */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, options);

  if (res.status === 401 && !options.skipAuth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawRequest(path, options);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? "Có lỗi xảy ra, vui lòng thử lại");
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
