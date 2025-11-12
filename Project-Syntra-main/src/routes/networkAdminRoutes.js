import React from "react";
import {
  MdHome,
  MdNotifications,
  MdSecurity,
  MdIntegrationInstructions,
  MdSettings,
  MdDeviceHub,
  MdShield,
} from "react-icons/md";

// Import page components
import NetworkAdminDashboard from "../pages/networkAdmin/Dashboard";
import AlertsPage from "../pages/networkAdmin/Alerts";
import IDSRuleManagement from "../pages/networkAdmin/IDSRuleManagement";
import IDSSourceIntegration from "../pages/networkAdmin/IDSSourceIntegration";
import NotificationSettings from "../pages/networkAdmin/NotificationSettings";
import MFASettings from "../pages/common/MFASettings";

const networkAdminRoutes = [
  {
    name: "My Dashboard",
    layout: "/network-admin",
    path: "/dashboard",
    icon: <MdHome />,
    component: <NetworkAdminDashboard />,
    roles: ["Network Administrator"],
  },
  {
    name: "Alerts",
    layout: "/network-admin",
    path: "/alerts",
    icon: <MdNotifications />,
    component: <AlertsPage />,
    roles: ["Network Administrator"],
  },
  {
    name: "IDS Rule Management",
    layout: "/network-admin",
    path: "/ids-rules",
    icon: <MdSecurity />,
    component: <IDSRuleManagement />,
    roles: ["Network Administrator"],
  },
  {
    name: "IDS Source Integration",
    layout: "/network-admin",
    path: "/ids-sources",
    icon: <MdIntegrationInstructions />,
    component: <IDSSourceIntegration />,
    roles: ["Network Administrator"],
  },
  {
    name: "Alert Notifications",
    layout: "/network-admin",
    path: "/notifications",
    icon: <MdSettings />,
    component: <NotificationSettings />,
    roles: ["Network Administrator"],
  },
  {
    name: "MFA Settings",
    layout: "/network-admin",
    path: "/mfa-settings",
    icon: <MdShield />,
    component: <MFASettings />,
    roles: ["Network Administrator"],
  },
];

export default networkAdminRoutes;