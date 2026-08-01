import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient } from "@/api/client";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("conflux_access_token");
    const savedUser = localStorage.getItem("conflux_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    localStorage.removeItem("conflux_access_token");
    localStorage.removeItem("conflux_refresh_token");
    localStorage.removeItem("conflux_user");

    const res = await apiClient.post("/api/v1/auth/login/", { email, password });
    const { access, refresh, user: userData } = res.data;

    localStorage.setItem("conflux_access_token", access);
    localStorage.setItem("conflux_refresh_token", refresh);
    localStorage.setItem("conflux_user", JSON.stringify(userData));

    setToken(access);
    setUser(userData);
  };

  const register = async (email: string, password: string) => {
    localStorage.removeItem("conflux_access_token");
    localStorage.removeItem("conflux_refresh_token");
    localStorage.removeItem("conflux_user");

    const res = await apiClient.post("/api/v1/auth/register/", { email, password });
    const { access, refresh, user: userData } = res.data;

    localStorage.setItem("conflux_access_token", access);
    localStorage.setItem("conflux_refresh_token", refresh);
    localStorage.setItem("conflux_user", JSON.stringify(userData));

    setToken(access);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("conflux_access_token");
    localStorage.removeItem("conflux_refresh_token");
    localStorage.removeItem("conflux_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
