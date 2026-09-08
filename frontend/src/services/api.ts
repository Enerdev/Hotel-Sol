/**
 * Cliente HTTP que se conecta al backend.
 * - Inyecta el token JWT en cada request
 * - Maneja errores comunes
 * - Refresca el token automáticamente cuando expira (próxima fase)
 */

const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');
const REQUEST_TIMEOUT_MS = 10000;
const TOKEN_KEY = 'hotel.accessToken';
const REFRESH_KEY = 'hotel.refreshToken';
const USER_KEY = 'hotel.user';

// ============================================================================
// Storage helpers
// ============================================================================

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  getUser<T = unknown>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  set(accessToken: string, refreshToken: string, user: unknown): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// ============================================================================
// Cliente HTTP
// ============================================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Si es false, no añade el token (útil para login). Default: true */
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = tokenStorage.getAccess();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: rest.signal ?? controller.signal,
      headers: finalHeaders,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'El servidor no responde. Verifica que la API esté encendida.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  let data: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorData = data as { error?: string; details?: unknown };
    const message = errorData?.error ?? `HTTP ${response.status}`;

    // Token inválido/expirado: limpiar storage para forzar re-login
    if (response.status === 401 && auth) {
      tokenStorage.clear();
      // Recargar para que el AuthContext detecte el cambio
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    throw new ApiError(response.status, message, errorData?.details);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
