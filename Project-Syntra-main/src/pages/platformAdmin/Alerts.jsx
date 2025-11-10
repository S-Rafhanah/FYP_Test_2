// src/pages/platformAdmin/Alerts.jsx
import React, { useEffect, useState } from "react";
import {
  Badge, Box, Button, Flex, HStack, IconButton,
  Select, Table, Tbody, Td, Th, Thead, Tr, Text,
  useColorModeValue, useToast, Tabs, TabList, Tab,
  TabPanels, TabPanel, SimpleGrid, Stat, StatLabel,
  StatNumber, Icon, VStack, Alert, AlertIcon, AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import {
  FiRefreshCw,
  FiServer,
  FiUsers,
  FiAlertTriangle,
  FiCheckCircle,
  FiCpu,
  FiHardDrive,
  FiActivity,
} from "react-icons/fi";
import { getSystemHealth, getIDSHealth, getUsers, getSystemAlerts } from "../../backend_api";
import { useAuth } from "../../auth/AuthContext";

// Alert severity badge
const getSeverityBadge = (severity) => {
  const colors = {
    critical: "red",
    high: "orange",
    medium: "yellow",
    low: "blue",
    info: "gray",
  };
  return colors[severity] || "gray";
};

export default function Alerts() {
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);
  const [idsHealth, setIDSHealth] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const cardBg = useColorModeValue("white", "navy.800");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const headerBg = useColorModeValue("gray.50", "navy.900");

  const fetchAll = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [health, ids, users, alerts] = await Promise.all([
        getSystemHealth().catch(() => ({ status: "unknown" })),
        getIDSHealth().catch(() => ({ suricata: "unknown", zeek: "unknown" })),
        getUsers().catch(() => []),
        getSystemAlerts().catch(() => []),
      ]);

      setSystemHealth(health);
      setIDSHealth(ids);

      // Get recently created accounts (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const recent = (users || [])
        .filter((u) => new Date(u.created_at) > oneDayAgo)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentUsers(recent);

      setSystemAlerts(alerts || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Alerts fetch error:", err);
      toast({ title: "Failed to load alerts data", status: "error", duration: 1400 });
    } finally {
      setLoading(false);
    }
  };

  // initial + polling every 10s
  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Generate system health alerts based on current status
  const generateHealthAlerts = () => {
    const alerts = [];

    // Check overall system health
    if (systemHealth?.status === "degraded" || systemHealth?.status === "offline") {
      alerts.push({
        id: "sys-1",
        type: "System Health",
        severity: systemHealth?.status === "offline" ? "critical" : "high",
        message: `System status is ${systemHealth?.status}`,
        timestamp: lastRefresh,
        source: "System Monitor",
      });
    }

    // Check IDS health
    if (idsHealth?.suricata !== "online") {
      alerts.push({
        id: "ids-1",
        type: "IDS Health",
        severity: "high",
        message: "Suricata IDS is not responding",
        timestamp: lastRefresh,
        source: "IDS Monitor",
      });
    }

    if (idsHealth?.zeek !== "online") {
      alerts.push({
        id: "ids-2",
        type: "IDS Health",
        severity: "high",
        message: "Zeek Network Monitor is not responding",
        timestamp: lastRefresh,
        source: "IDS Monitor",
      });
    }

    // Check Elasticsearch
    if (systemHealth?.elasticsearch !== "online") {
      alerts.push({
        id: "es-1",
        type: "Database Health",
        severity: "critical",
        message: "Elasticsearch is not responding",
        timestamp: lastRefresh,
        source: "Database Monitor",
      });
    }

    // Add custom system alerts
    systemAlerts.forEach((alert, idx) => {
      alerts.push({
        id: `custom-${idx}`,
        ...alert,
      });
    });

    return alerts;
  };

  const healthAlerts = generateHealthAlerts();

  return (
    <Box>
      {/* Header */}
      <Flex gap={3} align="center" mb={4}>
        <Text fontSize="2xl" fontWeight="bold">Alerts</Text>
        <HStack ms="auto" spacing={2}>
          <Text fontSize="xs" color="gray.500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Text>
          <IconButton
            aria-label="Refresh"
            icon={<FiRefreshCw />}
            size="sm"
            isLoading={loading}
            onClick={fetchAll}
          />
        </HStack>
      </Flex>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5} mb={6}>
        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
          <Flex justify="space-between" align="center">
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">Active Alerts</StatLabel>
              <StatNumber fontSize="2xl" fontWeight="bold" color="red.500">
                {healthAlerts.length}
              </StatNumber>
            </Stat>
            <Icon as={FiAlertTriangle} w={8} h={8} color="red.500" />
          </Flex>
        </Box>

        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
          <Flex justify="space-between" align="center">
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">System Status</StatLabel>
              <StatNumber fontSize="lg" fontWeight="bold" color={
                systemHealth?.status === "healthy" ? "green.500" : "orange.500"
              }>
                {systemHealth?.status || "Unknown"}
              </StatNumber>
            </Stat>
            <Icon as={FiServer} w={8} h={8} color="blue.500" />
          </Flex>
        </Box>

        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
          <Flex justify="space-between" align="center">
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">IDS Services</StatLabel>
              <StatNumber fontSize="lg" fontWeight="bold" color={
                idsHealth?.suricata === "online" && idsHealth?.zeek === "online"
                  ? "green.500"
                  : "orange.500"
              }>
                {idsHealth?.suricata === "online" && idsHealth?.zeek === "online"
                  ? "Online"
                  : "Degraded"}
              </StatNumber>
            </Stat>
            <Icon as={FiActivity} w={8} h={8} color="purple.500" />
          </Flex>
        </Box>

        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
          <Flex justify="space-between" align="center">
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">New Accounts (24h)</StatLabel>
              <StatNumber fontSize="2xl" fontWeight="bold" color="blue.500">
                {recentUsers.length}
              </StatNumber>
            </Stat>
            <Icon as={FiUsers} w={8} h={8} color="green.500" />
          </Flex>
        </Box>
      </SimpleGrid>

      {/* Tabs for different alert types */}
      <Tabs colorScheme="brand">
        <TabList>
          <Tab>System Health Alerts</Tab>
          <Tab>Account Notifications</Tab>
          <Tab>Component Status</Tab>
        </TabList>

        <TabPanels>
          {/* System Health Alerts Tab */}
          <TabPanel px={0}>
            <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
              {healthAlerts.length > 0 ? (
                <VStack spacing={3} align="stretch">
                  {healthAlerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      status={
                        alert.severity === "critical" || alert.severity === "high"
                          ? "error"
                          : alert.severity === "medium"
                          ? "warning"
                          : "info"
                      }
                      variant="left-accent"
                      borderRadius="md"
                    >
                      <AlertIcon />
                      <Box flex="1">
                        <Flex justify="space-between" align="start">
                          <Box>
                            <AlertTitle fontSize="md" mb={1}>
                              {alert.type}
                              <Badge
                                ms={3}
                                colorScheme={getSeverityBadge(alert.severity)}
                                fontSize="xs"
                              >
                                {alert.severity?.toUpperCase()}
                              </Badge>
                            </AlertTitle>
                            <AlertDescription fontSize="sm">
                              {alert.message}
                            </AlertDescription>
                            <Text fontSize="xs" color="gray.500" mt={2}>
                              Source: {alert.source} | {new Date(alert.timestamp).toLocaleString()}
                            </Text>
                          </Box>
                        </Flex>
                      </Box>
                    </Alert>
                  ))}
                </VStack>
              ) : (
                <Flex direction="column" align="center" py={10} color="gray.500">
                  <Icon as={FiCheckCircle} w={12} h={12} color="green.400" mb={3} />
                  <Text fontSize="lg" fontWeight="semibold">All Systems Operational</Text>
                  <Text fontSize="sm">No active alerts at this time</Text>
                </Flex>
              )}
            </Box>
          </TabPanel>

          {/* Account Notifications Tab */}
          <TabPanel px={0}>
            <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
              <Text fontSize="lg" fontWeight="semibold" mb={4}>
                Recently Created Accounts (Last 24 Hours)
              </Text>
              {recentUsers.length > 0 ? (
                <Table variant="simple" size="sm">
                  <Thead bg={headerBg}>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Email</Th>
                      <Th>Role</Th>
                      <Th>Created At</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {recentUsers.map((user) => (
                      <Tr key={user.id}>
                        <Td fontWeight="medium">{user.name}</Td>
                        <Td fontSize="sm">{user.email}</Td>
                        <Td>
                          <Badge
                            colorScheme={
                              user.role === "Platform Administrator"
                                ? "purple"
                                : user.role === "Network Administrator"
                                ? "blue"
                                : "green"
                            }
                            fontSize="xs"
                          >
                            {user.role}
                          </Badge>
                        </Td>
                        <Td fontSize="sm" color="gray.500">
                          {new Date(user.created_at).toLocaleString()}
                        </Td>
                        <Td>
                          <Badge colorScheme="green" fontSize="xs">
                            ACTIVE
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Flex direction="column" align="center" py={10} color="gray.500">
                  <Icon as={FiUsers} w={12} h={12} mb={3} />
                  <Text fontSize="lg" fontWeight="semibold">No New Accounts</Text>
                  <Text fontSize="sm">No accounts created in the last 24 hours</Text>
                </Flex>
              )}
            </Box>
          </TabPanel>

          {/* Component Status Tab */}
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
              {/* IDS Component Status */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>
                  IDS Components
                </Text>
                <VStack spacing={4} align="stretch">
                  <Flex justify="space-between" align="center" p={3} bg={headerBg} borderRadius="md">
                    <HStack>
                      <Icon
                        as={idsHealth?.suricata === "online" ? FiCheckCircle : FiAlertTriangle}
                        color={idsHealth?.suricata === "online" ? "green.500" : "red.500"}
                      />
                      <Text fontWeight="medium">Suricata IDS</Text>
                    </HStack>
                    <Badge
                      colorScheme={idsHealth?.suricata === "online" ? "green" : "red"}
                      fontSize="xs"
                    >
                      {idsHealth?.suricata || "UNKNOWN"}
                    </Badge>
                  </Flex>

                  <Flex justify="space-between" align="center" p={3} bg={headerBg} borderRadius="md">
                    <HStack>
                      <Icon
                        as={idsHealth?.zeek === "online" ? FiCheckCircle : FiAlertTriangle}
                        color={idsHealth?.zeek === "online" ? "green.500" : "red.500"}
                      />
                      <Text fontWeight="medium">Zeek Monitor</Text>
                    </HStack>
                    <Badge
                      colorScheme={idsHealth?.zeek === "online" ? "green" : "red"}
                      fontSize="xs"
                    >
                      {idsHealth?.zeek || "UNKNOWN"}
                    </Badge>
                  </Flex>
                </VStack>
              </Box>

              {/* Database & Storage */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>
                  Database & Storage
                </Text>
                <VStack spacing={4} align="stretch">
                  <Flex justify="space-between" align="center" p={3} bg={headerBg} borderRadius="md">
                    <HStack>
                      <Icon
                        as={systemHealth?.elasticsearch === "online" ? FiCheckCircle : FiAlertTriangle}
                        color={systemHealth?.elasticsearch === "online" ? "green.500" : "red.500"}
                      />
                      <Text fontWeight="medium">Elasticsearch</Text>
                    </HStack>
                    <Badge
                      colorScheme={systemHealth?.elasticsearch === "online" ? "green" : "red"}
                      fontSize="xs"
                    >
                      {systemHealth?.elasticsearch || "UNKNOWN"}
                    </Badge>
                  </Flex>

                  <Flex justify="space-between" align="center" p={3} bg={headerBg} borderRadius="md">
                    <HStack>
                      <Icon
                        as={systemHealth?.database === "online" ? FiCheckCircle : FiAlertTriangle}
                        color={systemHealth?.database === "online" ? "green.500" : "orange.500"}
                      />
                      <Text fontWeight="medium">User Database</Text>
                    </HStack>
                    <Badge
                      colorScheme={systemHealth?.database === "online" ? "green" : "orange"}
                      fontSize="xs"
                    >
                      {systemHealth?.database || "ONLINE"}
                    </Badge>
                  </Flex>
                </VStack>
              </Box>
            </SimpleGrid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
