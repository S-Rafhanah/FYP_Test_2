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
    // DEVELOPMENT MODE: Clear auth only on fresh server start (npm start), not on page refresh
    if (process.env.NODE_ENV === 'development') {
      // Check if this is the first load of the session
      const isFirstLoad = !sessionStorage.getItem('session_initialized');

      if (isFirstLoad) {
        // First load after npm start - clear everything
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("syntra_token");
        localStorage.removeItem("syntra_user");
        sessionStorage.setItem('session_initialized', 'true');
        console.log("Development mode: First load - Cleared authentication data");
        return null;
      }
      // Subsequent page refreshes - keep auth if valid
      console.log("Development mode: Page refresh - Preserving authentication");
    }

    // Normal behavior for production (and dev after first load)
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
    // Skip loading user only on first development load
    if (process.env.NODE_ENV === 'development') {
      const isFirstLoad = !sessionStorage.getItem('session_initialized');
      if (isFirstLoad) {
        return null;
      }
    }

    // Normal behavior for production (and dev after first load)
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