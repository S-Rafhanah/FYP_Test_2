// routes/platformAdminRoutes.js
import React from "react";
import { FiHome, FiUsers, FiSettings, FiBell, FiShield } from "react-icons/fi";

const platformAdminRoutes = [
  {
    name: "Overview",
    layout: "/platform-admin",
    path: "/dashboard",
    icon: <FiHome />,
    roles: ["Platform Administrator"],
  },
  {
    name: "User Account Management",
    layout: "/platform-admin",
    path: "/users",
    icon: <FiUsers />,
    roles: ["Platform Administrator"],
  },
  {
    name: "Profile Types",
    layout: "/platform-admin",
    path: "/profile-types",
    icon: <FiSettings />,
    roles: ["Platform Administrator"],
  },
  {
    name: "Alerts",
    layout: "/platform-admin",
    path: "/alerts",
    icon: <FiBell />,
    roles: ["Platform Administrator", "Security Analyst"],
  },
  {
    name: "MFA Settings",
    layout: "/platform-admin",
    path: "/mfa-settings",
    icon: <FiShield />,
    roles: ["Platform Administrator"],
  },
];

export default platformAdminRoutes;