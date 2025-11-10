import "./assets/css/App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { ChakraProvider } from "@chakra-ui/react";
import initialTheme from "./theme/theme";
import { useState, useEffect } from "react";

import AuthLayout from "./layouts/auth";
import AdminLayout from "./layouts/admin";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

// Platform Admin layout + pages
import PlatformAdminLayout from "./pages/platformAdmin/Dashboard";
import DashboardHome from "./pages/platformAdmin/DashboardHome";
import UserAccounts from "./pages/platformAdmin/UserAccounts";
import ProfileTypes from "./pages/platformAdmin/ProfileTypes";
import Alerts from "./pages/platformAdmin/Alerts";

// Network Admin layout + routes
// CHANGE: fix folder name and use relative imports
import NetworkAdminLayout from "./pages/networkAdmin/NetworkAdminLayout";
import networkAdminRoutes from "./routes/networkAdminRoutes";

// Security Analyst layout + routes
import SecurityAnalystLayout from "./pages/securityAnalyst/SecurityAnalystLayout";
import securityAnalystRoutes from "./routes/securityAnalystRoutes";

// ---------- Small helper: compute home based on logged-in user ----------
function DefaultRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth/sign-in" replace />;

  const role = user?.role;
  if (role === "Platform Administrator") return <Navigate to="/platform-admin/dashboard" replace />;
  if (role === "Network Administrator")  return <Navigate to="/network-admin/dashboard" replace />;
  if (role === "Security Analyst")       return <Navigate to="/security-analyst/dashboard" replace />;
  return <Navigate to="/admin/default" replace />;
}

export default function Main() {
  const [currentTheme, setCurrentTheme] = useState(initialTheme);

  // ONE-TIME CLEANUP: Remove old token keys
  useEffect(() => {
    if (localStorage.getItem("syntra_token") || localStorage.getItem("syntra_user")) {
      localStorage.removeItem("syntra_token");
      localStorage.removeItem("syntra_user");
      console.log("Cleaned up old authentication keys");
    }
  }, []);

  return (
    <ChakraProvider theme={currentTheme}>
      <AuthProvider>
        <Routes>
          {/* ---------- Public auth pages ---------- */}
          <Route path="auth/*" element={<AuthLayout />} />

          {/* ---------- Protected sections (any logged-in user) ---------- */}
          <Route element={<ProtectedRoute />}>
            {/* Horizon original admin area (no role restriction) */}
            <Route
              path="admin/*"
              element={<AdminLayout theme={currentTheme} setTheme={setCurrentTheme} />}
            />
          </Route>

          {/* ---------- Platform Admin area (role-gated) ---------- */}
          <Route element={<ProtectedRoute roles={["Platform Administrator"]} />}>
            <Route path="platform-admin" element={<PlatformAdminLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="dashboard" element={<DashboardHome />} />
              <Route path="users" element={<UserAccounts />} />
              <Route path="profile-types" element={<ProfileTypes />} />
              <Route path="alerts" element={<Alerts />} />
            </Route>
          </Route>

          {/* ---------- ⭐ Network Admin area (role-gated) ---------- */}
          <Route element={<ProtectedRoute roles={["Network Administrator"]} />}>
            <Route path="network-admin" element={<NetworkAdminLayout />}>
              {/* Map all Network Admin routes */}
              {networkAdminRoutes.map((route, key) => {
                // FIX: nested route paths must be relative (no leading slash)
                const childPath = route.path.replace(/^\//, "");
                return <Route key={key} path={childPath} element={route.component} />;
              })}
              {/* Default redirect to dashboard */}
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>

          {/* ---------- ⭐ Security Analyst area (role-gated) ---------- */}
          <Route element={<ProtectedRoute roles={["Security Analyst"]} />}>
            <Route path="security-analyst" element={<SecurityAnalystLayout />}>
              {/* Map all Security Analyst routes */}
              {securityAnalystRoutes.map((route, key) => {
                const childPath = route.path.replace(/^\//, "");
                return <Route key={key} path={childPath} element={route.component} />;
              })}
              {/* Default redirect to dashboard */}
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
          </Route>

          {/* ---------- Redirect helpers ---------- */}
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </AuthProvider>
    </ChakraProvider>
  );
}
