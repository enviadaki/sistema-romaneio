import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { setAuthTokenGetter, setOnUnauthorized } from "@workspace/api-client-react";

interface OperatorUser {
  id: number;
  username: string;
  fullName: string;
  allowedOperations: string[];
  allowedPages: string[];
  role: "operator";
}

interface OperatorAuthState {
  isAuthenticated: boolean;
  user: OperatorUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const OperatorAuthContext = createContext<OperatorAuthState>({
  isAuthenticated: false,
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

const OPERATOR_KEY = "operator_jwt";
const MOTORISTA_KEY = "motorista_jwt";

function parseOperatorJwt(token: string): OperatorUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (payload.role !== "operator") return null;
    return {
      id: payload.id,
      username: payload.username,
      fullName: payload.fullName,
      allowedOperations: payload.allowedOperations ?? [],
      allowedPages: payload.allowedPages ?? [],
      role: "operator",
    };
  } catch {
    return null;
  }
}

function isValidJwt(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function OperatorAuthProvider({
  children,
  clerkGetToken,
}: {
  children: ReactNode;
  clerkGetToken: (() => Promise<string | null>) | null;
}) {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(OPERATOR_KEY);
    if (stored && parseOperatorJwt(stored)) return stored;
    localStorage.removeItem(OPERATOR_KEY);
    return null;
  });

  const user = token ? parseOperatorJwt(token) : null;
  const isAuthenticated = user !== null;

  const login = useCallback((newToken: string) => {
    localStorage.setItem(OPERATOR_KEY, newToken);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(OPERATOR_KEY);
    setToken(null);
  }, []);

  // Central auth token resolver: operator JWT > motorista JWT > Clerk
  useEffect(() => {
    setAuthTokenGetter(async () => {
      const opToken = localStorage.getItem(OPERATOR_KEY);
      if (opToken && isValidJwt(opToken)) return opToken;
      const moToken = localStorage.getItem(MOTORISTA_KEY);
      if (moToken && isValidJwt(moToken)) return moToken;
      if (clerkGetToken) return clerkGetToken();
      return null;
    });
    return () => setAuthTokenGetter(null);
  }, [clerkGetToken]);

  // Global 401 handler: auto-logout on session expiry or invalid token
  useEffect(() => {
    setOnUnauthorized(() => {
      localStorage.removeItem(OPERATOR_KEY);
      localStorage.removeItem(MOTORISTA_KEY);
      window.location.href = "/sign-in";
    });
    return () => setOnUnauthorized(null);
  }, []);

  return (
    <OperatorAuthContext.Provider value={{ isAuthenticated, user, token, login, logout }}>
      {children}
    </OperatorAuthContext.Provider>
  );
}

export function useOperatorAuth() {
  return useContext(OperatorAuthContext);
}
