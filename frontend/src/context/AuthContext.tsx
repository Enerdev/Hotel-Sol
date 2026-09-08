import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, tokenStorage } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import type { AuthResponse, Usuario, Rol } from '../types';

interface AuthState {
  user: Usuario | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Rol[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Al iniciar, intenta restaurar la sesión desde localStorage y verificarla
  useEffect(() => {
    const stored = tokenStorage.getUser<Usuario>();
    if (!stored) {
      setLoading(false);
      return;
    }

    // Verifica que el token siga siendo válido pidiendo /me
    api
      .get<Usuario>('/auth/me')
      .then((u) => {
        setUser(u);
        connectSocket();
      })
      .catch(() => {
        tokenStorage.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.post<AuthResponse>(
      '/auth/login',
      { username, password },
      { auth: false }
    );
    tokenStorage.set(data.accessToken, data.refreshToken, data.user);
    setUser(data.user);
    connectSocket();
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    tokenStorage.clear();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: Rol[]) => (user ? roles.includes(user.rol) : false),
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, hasRole }),
    [user, loading, login, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
