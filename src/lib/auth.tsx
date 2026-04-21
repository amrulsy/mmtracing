"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, setToken, removeToken, getToken } from "./api";
import type { User, LoginResponse } from "./types";

// ==========================================
// Context Types
// ==========================================

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ==========================================
// Provider
// ==========================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate existing token on mount
  useEffect(() => {
    const existingToken = getToken();
    if (!existingToken) {
      setIsLoading(false);
      return;
    }

    setTokenState(existingToken);

    api.get<User>("/auth/me")
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        // Token invalid — clear it
        removeToken();
        setTokenState(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<LoginResponse>("/auth/login", { username, password });
    const { token: newToken, user: userData } = res.data;

    setToken(newToken);
    setTokenState(newToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
