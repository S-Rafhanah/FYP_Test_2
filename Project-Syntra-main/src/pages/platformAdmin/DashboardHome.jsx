import React, { useEffect, useState } from "react";
import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Text,
  Flex,
  Icon,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Spinner,
  IconButton,
  HStack,
  VStack,
  Progress,
} from "@chakra-ui/react";
import {
  FiServer,
  FiShield,
  FiUsers,
  FiActivity,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";
import { getSystemHealth, getIDSHealth, getRecentUsers, getUsers } from "../../backend_api";
import { useAuth } from "../../auth/AuthContext";

// Stat Card Component
function StatCard({ title, value, helpText, icon, color, isLoading, status }) {
  const cardBg = useColorModeValue("white", "navy.800");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const iconBg = useColorModeValue(`${color}.50`, `${color}.900`);

  return (
    <Box
      bg={cardBg}
      borderWidth="1px"
      borderColor={border}
      borderRadius="16px"
      p={5}
      position="relative"
      overflow="hidden"
    >
      <Flex justify="space-between" align="start">
        <Stat>
          <StatLabel fontSize="sm" fontWeight="medium" color="gray.500">
            {title}
          </StatLabel>
          {isLoading ? (
            <Spinner size="sm" mt={2} />
          ) : (
            <>
              <StatNumber fontSize="2xl" fontWeight="bold" mt={2}>
                {value}
              </StatNumber>
              {helpText && (
                <StatHelpText fontSize="xs" mb={0}>
                  {helpText}
                </StatHelpText>
              )}
            </>
          )}
        </Stat>
        <Flex
          bg={iconBg}
          w="48px"
          h="48px"
          borderRadius="12px"
          align="center"
          justify="center"
        >
          <Icon as={icon} color={`${color}.500`} w="24px" h="24px" />
        </Flex>
      </Flex>
      {status && (
        <Badge
          mt={3}
          colorScheme={status === "healthy" ? "green" : status === "warning" ? "orange" : "red"}
          fontSize="xs"
          px={2}
          py={1}
          borderRadius="full"
        >
          {status.toUpperCase()}
        </Badge>
      )}
    </Box>
  );
}

export default function DashboardHome() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);
  const [idsHealth, setIDSHealth] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const cardBg = useColorModeValue("white", "navy.800");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const headerBg = useColorModeValue("gray.50", "navy.900");

  const fetchDashboardData = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [health, ids, users] = await Promise.all([
        getSystemHealth().catch(() => ({ status: "unknown", uptime: 0 })),
        getIDSHealth().catch(() => ({ suricata: "unknown", zeek: "unknown" })),
        getUsers().catch(() => []),
      ]);

      setSystemHealth(health);
      setIDSHealth(ids);

      // Sort users by created date and get recent 5
      const sortedUsers = (users || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentUsers(sortedUsers.slice(0, 5));
      setTotalUsers(users?.length || 0);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const getStatusColor = (status) => {
    if (status === "healthy" || status === "online") return "green";
    if (status === "warning" || status === "degraded") return "orange";
    return "red";
  };

  const formatUptime = (seconds) => {
    if (!seconds) return "Unknown";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Platform Admin Dashboard
          </Text>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Real-time system monitoring and health status
          </Text>
        </Box>
        <HStack>
          <Text fontSize="xs" color="gray.500">
            <Icon as={FiClock} mr={1} />
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Text>
          <IconButton
            aria-label="Refresh"
            icon={<FiRefreshCw />}
            size="sm"
            isLoading={loading}
            onClick={fetchDashboardData}
          />
        </HStack>
      </Flex>

      {/* System Status Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5} mb={6}>
        <StatCard
          title="System Status"
          value={systemHealth?.status === "healthy" ? "Operational" : systemHealth?.status || "Unknown"}
          helpText={systemHealth?.uptime ? `Uptime: ${formatUptime(systemHealth.uptime)}` : ""}
          icon={FiServer}
          color={getStatusColor(systemHealth?.status)}
          isLoading={loading && !systemHealth}
          status={systemHealth?.status}
        />

        <StatCard
          title="IDS Health"
          value={
            idsHealth?.suricata === "online" && idsHealth?.zeek === "online"
              ? "All Systems Online"
              : idsHealth?.suricata === "online" || idsHealth?.zeek === "online"
              ? "Partial Service"
              : "Unknown"
          }
          helpText={`Suricata: ${idsHealth?.suricata || "?"} | Zeek: ${idsHealth?.zeek || "?"}`}
          icon={FiShield}
          color={
            idsHealth?.suricata === "online" && idsHealth?.zeek === "online"
              ? "green"
              : idsHealth?.suricata === "online" || idsHealth?.zeek === "online"
              ? "orange"
              : "gray"
          }
          isLoading={loading && !idsHealth}
          status={
            idsHealth?.suricata === "online" && idsHealth?.zeek === "online"
              ? "healthy"
              : idsHealth?.suricata === "online" || idsHealth?.zeek === "online"
              ? "warning"
              : "unknown"
          }
        />

        <StatCard
          title="Total Users"
          value={totalUsers}
          helpText={`${recentUsers.length} added recently`}
          icon={FiUsers}
          color="blue"
          isLoading={loading && totalUsers === 0}
        />

        <StatCard
          title="System Activity"
          value="Active"
          helpText="Monitoring enabled"
          icon={FiActivity}
          color="purple"
          status="healthy"
        />
      </SimpleGrid>

      {/* Main Content Grid */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
        {/* IDS Component Status */}
        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            IDS Component Status
          </Text>
          <VStack spacing={4} align="stretch">
            {/* Suricata Status */}
            <Box>
              <Flex justify="space-between" align="center" mb={2}>
                <HStack>
                  <Icon
                    as={idsHealth?.suricata === "online" ? FiCheckCircle : FiAlertCircle}
                    color={idsHealth?.suricata === "online" ? "green.500" : "gray.400"}
                  />
                  <Text fontWeight="medium">Suricata IDS</Text>
                </HStack>
                <Badge
                  colorScheme={idsHealth?.suricata === "online" ? "green" : "gray"}
                  fontSize="xs"
                >
                  {idsHealth?.suricata || "UNKNOWN"}
                </Badge>
              </Flex>
              <Progress
                value={idsHealth?.suricata === "online" ? 100 : 0}
                size="sm"
                colorScheme="green"
                borderRadius="full"
              />
            </Box>

            {/* Zeek Status */}
            <Box>
              <Flex justify="space-between" align="center" mb={2}>
                <HStack>
                  <Icon
                    as={idsHealth?.zeek === "online" ? FiCheckCircle : FiAlertCircle}
                    color={idsHealth?.zeek === "online" ? "green.500" : "gray.400"}
                  />
                  <Text fontWeight="medium">Zeek Network Monitor</Text>
                </HStack>
                <Badge
                  colorScheme={idsHealth?.zeek === "online" ? "green" : "gray"}
                  fontSize="xs"
                >
                  {idsHealth?.zeek || "UNKNOWN"}
                </Badge>
              </Flex>
              <Progress
                value={idsHealth?.zeek === "online" ? 100 : 0}
                size="sm"
                colorScheme="green"
                borderRadius="full"
              />
            </Box>

            {/* Elasticsearch Status */}
            <Box>
              <Flex justify="space-between" align="center" mb={2}>
                <HStack>
                  <Icon
                    as={systemHealth?.elasticsearch === "online" ? FiCheckCircle : FiAlertCircle}
                    color={systemHealth?.elasticsearch === "online" ? "green.500" : "gray.400"}
                  />
                  <Text fontWeight="medium">Elasticsearch</Text>
                </HStack>
                <Badge
                  colorScheme={systemHealth?.elasticsearch === "online" ? "green" : "gray"}
                  fontSize="xs"
                >
                  {systemHealth?.elasticsearch || "UNKNOWN"}
                </Badge>
              </Flex>
              <Progress
                value={systemHealth?.elasticsearch === "online" ? 100 : 0}
                size="sm"
                colorScheme="green"
                borderRadius="full"
              />
            </Box>
          </VStack>
        </Box>

        {/* Recently Added Accounts */}
        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Recently Added Accounts
          </Text>
          {recentUsers.length > 0 ? (
            <Table variant="simple" size="sm">
              <Thead bg={headerBg}>
                <Tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Created</Th>
                </Tr>
              </Thead>
              <Tbody>
                {recentUsers.map((user) => (
                  <Tr key={user.id}>
                    <Td fontWeight="medium">{user.name}</Td>
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
                    <Td fontSize="xs" color="gray.500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py={8}
              color="gray.500"
            >
              <Icon as={FiUsers} w={8} h={8} mb={2} />
              <Text fontSize="sm">No recent users</Text>
            </Flex>
          )}
        </Box>
      </SimpleGrid>

      {/* System Information */}
      <Box
        bg={cardBg}
        borderWidth="1px"
        borderColor={border}
        borderRadius="16px"
        p={5}
        mt={5}
      >
        <Text fontSize="lg" fontWeight="semibold" mb={4}>
          System Information
        </Text>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              API Version
            </Text>
            <Text fontWeight="medium">{systemHealth?.version || "1.0.0"}</Text>
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Environment
            </Text>
            <Text fontWeight="medium">{systemHealth?.environment || "Production"}</Text>
          </Box>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Last System Check
            </Text>
            <Text fontWeight="medium">{lastRefresh.toLocaleString()}</Text>
          </Box>
        </SimpleGrid>
      </Box>
    </Box>
  );
}
