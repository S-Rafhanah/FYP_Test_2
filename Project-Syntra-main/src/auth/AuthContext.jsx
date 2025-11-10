// src/auth/AuthContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";

// Helper function to check if token is expired
function isTokenExpired(token) {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expiry;
  } catch (e) {
    console.error('Error parsing token:', e);
    return true;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => {
    const token = localStorage.getItem("accessToken");
    // Clear if expired
    if (token && isTokenExpired(token)) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      return null;
    }
    return token;
  });

  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("accessToken");
    // Only load user if token is valid
    if (token && !isTokenExpired(token)) {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    }
    // Clear invalid data
    localStorage.removeItem("user");
    return null;
  });

  const login = (token, u) => {
    setAccessToken(token);
    setUser(u);
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(u));
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    // Also clear old keys if they exist
    localStorage.removeItem("syntra_token");
    localStorage.removeItem("syntra_user");
  };

  const hasRole = (roles = []) => {
    if (!roles?.length) return true;
    const r = user?.role;
    return r ? roles.includes(r) : false;
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      login,
      logout,
      isAuthenticated: !!accessToken && !isTokenExpired(accessToken),
      hasRole
    }),
    [user, accessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};