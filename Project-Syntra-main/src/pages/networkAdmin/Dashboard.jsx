// ============================================================================
// src/pages/networkAdmin/Dashboard.jsx
// ============================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import IconBox from 'components/icons/IconBox';
import {
  MdAlarm,
  MdBarChart,
  MdCheck,
  MdDashboard,
  MdDeviceHub,
  MdOutlineDragIndicator,
  MdOutlineEdit,
  MdSecurity,
  MdTimeline,
} from 'react-icons/md';
import { getSuricataAlerts, getZeekLogs, getIDSRules } from '../../backend_api';
import { useAuth } from '../../auth/AuthContext';
import ThreatHeatMap from 'components/charts/ThreatHeatMap';
import AlertTrendChart from 'components/charts/AlertTrendChart';
import AttackBarChart from 'components/charts/AttackBarChart';
import SeverityPieChart from 'components/charts/SeverityPieChart';
import { formatIP, getIPVersion, getIPVersionColorScheme } from '../../utils/ipFormatter';

const STORAGE_KEY = 'networkAdmin-dashboard-layout';
const DATA_TRANSFER_TYPE = 'networkAdmin/module-id';

// Map Suricata alert severity (1=High, 2=Medium, 3=Low)
const getSeverityColor = (severity) => {
  if (!severity) return 'gray';
  const sev = String(severity);
  if (sev === '1') return 'red';
  if (sev === '2') return 'orange';
  if (sev === '3') return 'yellow';
  return 'gray';
};

const getSeverityLabel = (severity) => {
  if (!severity) return 'Unknown';
  const sev = String(severity);
  if (sev === '1') return 'High';
  if (sev === '2') return 'Medium';
  if (sev === '3') return 'Low';
  return 'Unknown';
};

// Helper function to format timestamp
const formatTime = (timestamp) => {
  if (!timestamp) return '—';
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

const MODULE_LIBRARY = {
  alerts: {
    id: 'alerts',
    title: 'Real-time Alerts',
    icon: MdAlarm,
    render: (colors, data = {}) => {
      const alerts = data.alerts || [];
      const loading = data.loading;

      if (loading) {
        return (
          <Flex justify="center" align="center" minH="120px">
            <Spinner size="lg" />
          </Flex>
        );
      }

      if (alerts.length === 0) {
        return (
          <Text color={colors.textSecondary} textAlign="center" py={4}>
            No recent alerts
          </Text>
        );
      }

      return (
        <Stack spacing={3}>
          {alerts.slice(0, 5).map((alert) => (
            <Flex key={alert.id} justify="space-between" align="flex-start">
              <Box flex="1">
                <Text fontWeight="600" color={colors.textPrimary} noOfLines={1}>
                  {alert.signature || 'Unknown Alert'}
                </Text>
                <Flex align="center" gap={2} fontSize="sm" color={colors.textSecondary}>
                  <Text noOfLines={1} title={alert.src_ip}>
                    {formatIP(alert.src_ip, 15)}
                  </Text>
                  <Text>→</Text>
                  <Text noOfLines={1} title={alert.dest_ip}>
                    {formatIP(alert.dest_ip, 15)}{alert.dest_port ? `:${alert.dest_port}` : ''}
                  </Text>
                  {(alert.src_ip?.length > 20 || alert.dest_ip?.length > 20) && (
                    <Badge colorScheme={getIPVersionColorScheme(getIPVersion(alert.src_ip || alert.dest_ip))} fontSize="0.6rem">
                      {getIPVersion(alert.src_ip || alert.dest_ip)}
                    </Badge>
                  )}
                </Flex>
                <Text fontSize="xs" mt={1} color={colors.textTertiary}>
                  {formatTime(alert.timestamp)} | {alert.protocol || 'N/A'}
                </Text>
              </Box>
              <Badge
                colorScheme={getSeverityColor(alert.severity)}
                variant="subtle"
                ml={2}
              >
                {getSeverityLabel(alert.severity)}
              </Badge>
            </Flex>
          ))}
        </Stack>
      );
    },
  },
  geomap: {
    id: 'geomap',
    title: 'Threat Geolocation',
    icon: MdDeviceHub,
    render: (colors, data = {}) => {
      const alerts = data.alerts || [];
      return <ThreatHeatMap alerts={alerts} />;
    },
  },
  threats: {
    id: 'threats',
    title: 'Top Threats',
    icon: MdSecurity,
    render: (colors, data = {}) => {
      const alerts = data.alerts || [];

      // Group alerts by signature and count them
      const threatCounts = {};
      alerts.forEach(alert => {
        const sig = alert.signature || 'Unknown';
        if (!threatCounts[sig]) {
          threatCounts[sig] = { name: sig, count: 0, severity: alert.severity };
        }
        threatCounts[sig].count++;
      });

      // Sort by count and take top 5
      const topThreats = Object.values(threatCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      if (topThreats.length === 0) {
        return (
          <Text color={colors.textSecondary} textAlign="center" py={4}>
            No threats detected
          </Text>
        );
      }

      return (
        <Stack spacing={3}>
          {topThreats.map((threat, idx) => (
            <Flex
              key={idx}
              justify="space-between"
              align="center"
              borderRadius="12px"
              px={3}
              py={2}
              bg={colors.subtleBg}
            >
              <Box flex="1">
                <Text fontWeight="600" color={colors.textPrimary} noOfLines={1}>
                  {threat.name}
                </Text>
                <Text fontSize="sm" color={colors.textSecondary}>
                  {threat.count} detection{threat.count !== 1 ? 's' : ''}
                </Text>
              </Box>
              <Badge colorScheme={getSeverityColor(threat.severity)} fontSize="0.75rem" ml={2}>
                {getSeverityLabel(threat.severity)}
              </Badge>
            </Flex>
          ))}
        </Stack>
      );
    },
  },
  system: {
    id: 'system',
    title: 'System Health',
    icon: MdDeviceHub,
    render: (colors, data = {}) => {
      const alerts = data.alerts || [];
      const ruleCount = data.ruleCount || 0;

      // Simple health metrics based on alert activity
      const recentAlerts = alerts.filter(a => {
        const alertTime = new Date(a.timestamp);
        const now = new Date();
        return (now - alertTime) < 5 * 60 * 1000; // Last 5 minutes
      }).length;

      const healthMetrics = [
        {
          label: 'IDS Rules Active',
          value: Math.min(100, (ruleCount / 200) * 100),
          color: 'green.400',
          display: ruleCount
        },
        {
          label: 'Alert Flow Rate',
          value: Math.min(100, (recentAlerts / 10) * 100),
          color: recentAlerts > 20 ? 'red.400' : 'brand.500',
          display: `${recentAlerts}/5min`
        },
        {
          label: 'System Status',
          value: alerts.length > 0 ? 95 : 100,
          color: alerts.length > 50 ? 'orange.400' : 'green.400',
          display: 'Operational'
        },
      ];

      return (
        <Stack spacing={4}>
          {healthMetrics.map((metric) => (
            <Box key={metric.label}>
              <Flex justify="space-between" fontSize="sm" mb={1} color={colors.textSecondary}>
                <Text fontWeight="600" color={colors.textPrimary}>
                  {metric.label}
                </Text>
                <Text>{metric.display || `${Math.round(metric.value)}%`}</Text>
              </Flex>
              <Box h="6px" borderRadius="8px" bg={colors.trackBg}>
                <Box
                  h="100%"
                  w={`${metric.value}%`}
                  borderRadius="inherit"
                  bg={metric.color}
                  transition="width 0.2s ease"
                />
              </Box>
            </Box>
          ))}
        </Stack>
      );
    },
  },
  activity: {
    id: 'activity',
    title: 'Recent Activity',
    icon: MdTimeline,
    render: (colors, data = {}) => {
      const alerts = data.alerts || [];

      // Show last 5 alerts as activity
      const recentActivity = alerts.slice(0, 5).map(alert => ({
        time: formatTime(alert.timestamp),
        text: `${getSeverityLabel(alert.severity)} alert: ${alert.signature || 'Unknown'}`,
        severity: alert.severity
      }));

      if (recentActivity.length === 0) {
        return (
          <Text color={colors.textSecondary} textAlign="center" py={4}>
            No recent activity
          </Text>
        );
      }

      return (
        <Stack spacing={3}>
          {recentActivity.map((event, idx) => (
            <Flex key={idx} align="center" gap={3}>
              <Box
                minW="56px"
                textAlign="center"
                fontSize="xs"
                fontWeight="700"
                color={colors.textPrimary}
                bg={colors.subtleBg}
                borderRadius="10px"
                py={1}
              >
                {event.time}
              </Box>
              <Text fontSize="sm" color={colors.textSecondary} flex="1" noOfLines={2}>
                {event.text}
              </Text>
            </Flex>
          ))}
        </Stack>
      );
    },
  },
  severity: {
    id: 'severity',
    title: 'Alert Severity Distribution',
    icon: MdBarChart,
    render: (colors, data = {}) => {
      const alerts = data.alerts || [];

      // Calculate severity distribution
      const severityCounts = { '1': 0, '2': 0, '3': 0, 'unknown': 0 };
      alerts.forEach(alert => {
        const sev = String(alert.severity || 'unknown');
        if (severityCounts.hasOwnProperty(sev)) {
          severityCounts[sev]++;
        } else {
          severityCounts['unknown']++;
        }
      });

      const total = alerts.length || 1;
      const buckets = [
        { label: 'High', value: severityCounts['1'], total, color: 'red.400' },
        { label: 'Medium', value: severityCounts['2'], total, color: 'orange.400' },
        { label: 'Low', value: severityCounts['3'], total, color: 'yellow.400' },
      ];

      if (total === 1 && alerts.length === 0) {
        return (
          <Text color={colors.textSecondary} textAlign="center" py={4}>
            No alerts to analyze
          </Text>
        );
      }

      return (
        <Stack spacing={3}>
          {buckets.map((bucket) => (
            <Box key={bucket.label}>
              <Flex justify="space-between" fontSize="sm" color={colors.textSecondary}>
                <Text fontWeight="600" color={colors.textPrimary}>
                  {bucket.label}
                </Text>
                <Text>
                  {bucket.value} alert{bucket.value !== 1 ? 's' : ''} ({Math.round((bucket.value / bucket.total) * 100)}%)
                </Text>
              </Flex>
              <Box h="6px" borderRadius="8px" bg={colors.trackBg}>
                <Box
                  h="100%"
                  w={`${(bucket.value / bucket.total) * 100}%`}
                  borderRadius="inherit"
                  bg={bucket.color}
                  transition="width 0.2s ease"
                />
              </Box>
            </Box>
          ))}
        </Stack>
      );
    },
  },
  trend: {
    id: 'trend',
    title: 'Suricata Trends (24h)',
    icon: MdTimeline,
    render: (colors, data = {}) => {
      const alerts = data.alerts || [];
      return <AlertTrendChart alerts={alerts} title="Suricata Alert Activity" />;
    },
  },
  zeekTrend: {
    id: 'zeekTrend',
    title: 'Zeek Activity (24h)',
    icon: MdTimeline,
    render: (colors, data = {}) => {
      const zeekLogs = data.zeekLogs || [];
      return <AlertTrendChart alerts={zeekLogs} title="Zeek Network Activity" />;
    },
  },
  topAttacks: {
    id: 'topAttacks',
    title: 'Top Attack Signatures',
    icon: MdBarChart,
    render: (colors, data = {}) => {
      const alerts = data.alerts || [];
      return <AttackBarChart alerts={alerts} title="Top Attack Signatures" maxBars={5} />;
    },
  },
  severityPie: {
    id: 'severityPie',
    title: 'Severity Distribution',
    icon: MdDashboard,
    render: (colors, data = {}) => {
      const alerts = data.alerts || [];
      return <SeverityPieChart alerts={alerts} title="Alert Severity Breakdown" />;
    },
  },
};

const DEFAULT_ORDER = Object.keys(MODULE_LIBRARY);

export default function NetworkAdminDashboard() {
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  const brandColor = useColorModeValue('brand.500', 'white');
  const boxBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const cardBg = useColorModeValue('white', 'navy.800');
  const dragBorderColor = useColorModeValue('brand.500', 'brand.200');
  const subtleBg = useColorModeValue('secondaryGray.200', 'whiteAlpha.100');
  const trackBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.200');
  const textSecondary = useColorModeValue('secondaryGray.700', 'whiteAlpha.700');
  const textTertiary = useColorModeValue('secondaryGray.500', 'whiteAlpha.500');

  // Real-time data state
  const [alerts, setAlerts] = useState([]);
  const [zeekLogs, setZeekLogs] = useState([]);
  const [ruleCount, setRuleCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const colors = useMemo(
    () => ({
      textPrimary: textColor,
      textSecondary,
      textTertiary,
      subtleBg,
      trackBg,
    }),
    [subtleBg, textColor, textSecondary, textTertiary, trackBg],
  );

  // Fetch real-time data
  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const [alertsData, zeekData, rulesData] = await Promise.all([
        getSuricataAlerts(100),
        getZeekLogs(100),
        getIDSRules(),
      ]);

      setAlerts(alertsData || []);
      setZeekLogs(zeekData || []);
      setRuleCount(rulesData?.length || 0);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      if (err.message.includes('401') || err.message.includes('403')) {
        // Don't show error for auth issues
        return;
      }
      toast({
        title: 'Failed to load dashboard data',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Computed metrics
  const summaryMetrics = useMemo(() => {
    const activeAlerts = alerts.filter(a => {
      const alertTime = new Date(a.timestamp);
      const now = new Date();
      return (now - alertTime) < 60 * 60 * 1000; // Last hour
    }).length;

    const pendingActions = alerts.filter(a => a.severity === 1 || a.severity === '1').length;

    return [
      {
        label: 'Active Alerts',
        value: String(activeAlerts),
        icon: MdAlarm,
      },
      {
        label: 'Managed IDS Rules',
        value: String(ruleCount),
        icon: MdDashboard,
      },
      {
        label: 'Total Alerts',
        value: String(alerts.length),
        icon: MdBarChart,
      },
      {
        label: 'High Severity',
        value: String(pendingActions),
        icon: MdSecurity,
      },
    ];
  }, [alerts, ruleCount]);

  // Module data
  const moduleData = useMemo(
    () => ({
      alerts,
      zeekLogs,
      ruleCount,
      loading,
    }),
    [alerts, zeekLogs, ruleCount, loading],
  );

  const [moduleOrder, setModuleOrder] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_ORDER;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_ORDER;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((moduleId) => MODULE_LIBRARY[moduleId])) {
        const uniqueIds = Array.from(new Set(parsed));
        const missing = DEFAULT_ORDER.filter((moduleId) => !uniqueIds.includes(moduleId));
        return [...uniqueIds, ...missing];
      }
      return DEFAULT_ORDER;
    } catch (error) {
      console.warn('Unable to parse saved dashboard layout, falling back to default.', error);
      return DEFAULT_ORDER;
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draggedModuleId, setDraggedModuleId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(moduleOrder));
  }, [moduleOrder]);

  const modules = useMemo(
    () => moduleOrder.map((moduleId) => MODULE_LIBRARY[moduleId]).filter(Boolean),
    [moduleOrder],
  );

  const handleDragOver = useCallback(
    (event) => {
      if (!isEditing) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    },
    [isEditing],
  );

  const handleDragStart = useCallback((event, moduleId) => {
    if (!isEditing) {
      return;
    }
    event.dataTransfer.setData(DATA_TRANSFER_TYPE, moduleId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedModuleId(moduleId);
  }, [isEditing]);

  const handleDrop = useCallback(
    (event, targetModuleId) => {
      if (!isEditing) {
        return;
      }

      event.preventDefault();
      const sourceModuleId = event.dataTransfer.getData(DATA_TRANSFER_TYPE);

      if (!sourceModuleId || sourceModuleId === targetModuleId) {
        setDragOverId(null);
        setDraggedModuleId(null);
        return;
      }

      setModuleOrder((previousOrder) => {
        const nextOrder = previousOrder.filter((moduleId) => moduleId !== sourceModuleId);

        if (!targetModuleId) {
          nextOrder.push(sourceModuleId);
          return nextOrder;
        }

        const targetIndex = nextOrder.indexOf(targetModuleId);
        if (targetIndex === -1) {
          nextOrder.push(sourceModuleId);
          return nextOrder;
        }

        nextOrder.splice(targetIndex, 0, sourceModuleId);
        return nextOrder;
      });

      setDragOverId(null);
      setDraggedModuleId(null);
    },
    [isEditing],
  );

  const handleDragEnter = useCallback(
    (moduleId) => {
      if (!isEditing || moduleId === draggedModuleId) {
        return;
      }
      setDragOverId(moduleId);
    },
    [draggedModuleId, isEditing],
  );

  const handleDragLeave = useCallback(
    (moduleId) => {
      if (dragOverId === moduleId) {
        setDragOverId(null);
      }
    },
    [dragOverId],
  );

  const handleDragEnd = useCallback(() => {
    setDragOverId(null);
    setDraggedModuleId(null);
  }, []);

  const resetLayout = useCallback(() => {
    setModuleOrder(DEFAULT_ORDER);
    setDragOverId(null);
    setDraggedModuleId(null);
  }, []);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} mb="24px" gap={3}>
        <Box>
          <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%" mb="6px">
            Network Administrator Dashboard
          </Text>
          <Stack spacing={1} color={textSecondary} fontSize="sm">
            <Text>Reorder the modules below to craft a workspace that matches your workflow.</Text>
            <Text fontStyle="italic" color={textTertiary}>
              Real-time data updates every 30 seconds {loading && '(Loading...)'}
            </Text>
          </Stack>
        </Box>
        <HStack spacing={3} alignSelf={{ base: 'flex-end', md: 'center' }}>
          <Button variant="ghost" size="sm" onClick={resetLayout} isDisabled={!isEditing}>
            Reset Layout
          </Button>
          <Button
            colorScheme={isEditing ? 'green' : 'brand'}
            size="sm"
            leftIcon={<Icon as={isEditing ? MdCheck : MdOutlineEdit} />}
            onClick={() => {
              setIsEditing((value) => !value);
              setDragOverId(null);
              setDraggedModuleId(null);
            }}
          >
            {isEditing ? 'Done' : 'Edit Layout'}
          </Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap="20px" mb="20px">
        {summaryMetrics.map((metric) => (
          <Card key={metric.label} py="15px" bg={cardBg}>
            <Box display="flex" alignItems="center">
              <IconBox
                w="56px"
                h="56px"
                bg={boxBg}
                icon={<metric.icon size="28px" color={brandColor} />}
              />
              <Box ml="18px">
                <Text color="secondaryGray.600" fontSize="sm" fontWeight="500" mb="4px">
                  {metric.label}
                </Text>
                <Text color={textColor} fontSize="34px" fontWeight="700">
                  {metric.value}
                </Text>
              </Box>
            </Box>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="20px">
        {modules.map((module) => {
          const IconComponent = module.icon;
          const isDragged = draggedModuleId === module.id;
          const isDragTarget = dragOverId === module.id;

          return (
            <Card
              key={module.id}
              bg={cardBg}
              p="20px"
              draggable={isEditing}
              cursor={isEditing ? 'grab' : 'default'}
              borderWidth={isEditing && (isDragged || isDragTarget) ? '2px' : '1px'}
              borderStyle={isEditing && isDragTarget ? 'dashed' : 'solid'}
              borderColor={
                isEditing && (isDragged || isDragTarget)
                  ? dragBorderColor
                  : 'transparent'
              }
              opacity={isDragged ? 0.6 : 1}
              onDragStart={(event) => handleDragStart(event, module.id)}
              onDragEnter={() => handleDragEnter(module.id)}
              onDragLeave={() => handleDragLeave(module.id)}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, module.id)}
              onDragEnd={handleDragEnd}
            >
              <Flex justify="space-between" align="center" mb={4}>
                <Flex align="center" gap={3}>
                  <Box
                    w="40px"
                    h="40px"
                    borderRadius="12px"
                    bg={boxBg}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={IconComponent} w="20px" h="20px" color={brandColor} />
                  </Box>
                  <Box>
                    <Text fontSize="lg" fontWeight="700" color={textColor}>
                      {module.title}
                    </Text>
                    {isEditing ? (
                      <Text fontSize="xs" color={textSecondary}>
                        Drag and drop to reposition this module
                      </Text>
                    ) : null}
                  </Box>
                </Flex>
                {isEditing ? (
                  <Tooltip label="Drag to move" hasArrow>
                    <Flex
                      align="center"
                      justify="center"
                      w="32px"
                      h="32px"
                      borderRadius="full"
                      bg={subtleBg}
                    >
                      <Icon as={MdOutlineDragIndicator} color={textSecondary} />
                    </Flex>
                  </Tooltip>
                ) : null}
              </Flex>
              {module.render(colors, moduleData)}
            </Card>
          );
        })}
      </SimpleGrid>

      {isEditing ? (
        <Box
          mt="20px"
          borderRadius="16px"
          borderWidth="2px"
          borderStyle="dashed"
          borderColor={dragOverId === 'tray' ? dragBorderColor : subtleBg}
          color={textSecondary}
          p="24px"
          textAlign="center"
          onDragOver={handleDragOver}
          onDrop={(event) => handleDrop(event, null)}
          onDragEnter={() => handleDragEnter('tray')}
          onDragLeave={() => handleDragLeave('tray')}
        >
          Drop a module here to move it to the end of the dashboard
        </Box>
      ) : null}
    </Box>
  );
}
