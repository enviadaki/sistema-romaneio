import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface MotoristaUser {
  id: number;
  username: string;
  fullName: string;
  allowedRoutes: string[];
  role: "motorista";
}

interface MotoristaAuthState {
  isAuthenticated: boolean;
  user: MotoristaUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const MotoristaAuthContext = createContext<MotoristaAuthState>({
  isAuthenticated: false,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

const STORAGE_KEY = "motorista_jwt";

function parseJwtPayload(token: string): MotoristaUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (payload.role !== "motorista") return null;
    return {
      id: payload.id,
      username: payload.username,
      fullName: payload.fullName,
      allowedRoutes: payload.allowedRoutes ?? [],
      role: "motorista",
    };
  } catch {
    return null;
  }
}

export function MotoristaAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && parseJwtPayload(stored)) return stored;
    localStorage.removeItem(STORAGE_KEY);
    return null;
  });

  const user = token ? parseJwtPayload(token) : null;
  const isAuthenticated = user !== null;

  const login = useCallback((newToken: string) => {
    localStorage.setItem(STORAGE_KEY, newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  }, []);

  return (
    <MotoristaAuthContext.Provider value={{ isAuthenticated, user, token, login, logout }}>
      {children}
    </MotoristaAuthContext.Provider>
  );
}

export function useMotoristaAuth() {
  return useContext(MotoristaAuthContext);
}
