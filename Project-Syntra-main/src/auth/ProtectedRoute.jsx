// src/auth/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ roles = [] }) {
  const { isAuthenticated, hasRole } = useAuth();
  const loc = useLocation();

  // REMOVE the localStorage fallback - rely only on AuthContext
  if (!isAuthenticated) {
    return <Navigate to="/auth/sign-in" replace state={{ from: loc }} />;
  }

  if (!hasRole(roles)) {
    // Optionally send to a "403" page
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}