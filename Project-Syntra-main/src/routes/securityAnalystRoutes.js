import React from "react";
import {
  MdHome,
  MdSecurity,
  MdDescription,
} from "react-icons/md";

// Import page components
import SecurityAnalystDashboard from "../pages/securityAnalyst/Dashboard";
import AlertsManagement from "../pages/securityAnalyst/AlertsManagement";
import LogViewer from "../pages/securityAnalyst/LogViewer";

const securityAnalystRoutes = [
  {
    name: "Dashboard",
    layout: "/security-analyst",
    path: "/dashboard",
    icon: <MdHome />,
    component: <SecurityAnalystDashboard />,
    roles: ["Security Analyst"],
  },
  {
    name: "Alerts Management",
    layout: "/security-analyst",
    path: "/alerts",
    icon: <MdSecurity />,
    component: <AlertsManagement />,
    roles: ["Security Analyst"],
  },
  {
    name: "Log Viewer",
    layout: "/security-analyst",
    path: "/logs",
    icon: <MdDescription />,
    component: <LogViewer />,
    roles: ["Security Analyst"],
  },
];

export default securityAnalystRoutes;
