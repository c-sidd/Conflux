"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { buildApiUrl } from "./api";

interface User {
  id?: number;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("dcs_access_token");
      const storedUser = localStorage.getItem("dcs_user");
      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("Error reading auth state from localStorage:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const url = buildApiUrl("/api/v1/auth/login/");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}. Please check backend service logs.`);
      }
    }

    if (!res.ok) {
      throw new Error(data.error || data.detail || data.message || `Login failed (${res.status})`);
    }

    localStorage.setItem("dcs_access_token", data.access);
    localStorage.setItem("dcs_refresh_token", data.refresh);
    localStorage.setItem("dcs_user", JSON.stringify(data.user));

    setAccessToken(data.access);
    setUser(data.user);
    router.push("/dashboard");
  };

  const register = async (email: string, password: string, firstName = "", lastName = "") => {
    const url = buildApiUrl("/api/v1/auth/register/");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}. Please check backend service logs.`);
      }
    }

    if (!res.ok) {
      throw new Error(data.error || data.detail || data.message || `Registration failed (${res.status})`);
    }

    localStorage.setItem("dcs_access_token", data.access);
    localStorage.setItem("dcs_refresh_token", data.refresh);
    localStorage.setItem("dcs_user", JSON.stringify(data.user));

    setAccessToken(data.access);
    setUser(data.user);
    router.push("/dashboard");
  };

  const logout = () => {
    try {
      const refreshToken = localStorage.getItem("dcs_refresh_token");
      if (refreshToken) {
        const url = buildApiUrl("/api/v1/auth/logout/");
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem("dcs_access_token");
      localStorage.removeItem("dcs_refresh_token");
      localStorage.removeItem("dcs_user");
      setAccessToken(null);
      setUser(null);
      router.push("/");
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout }}>
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
