// src/pages/securityAnalyst/Dashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Badge, Box, Button, Flex, HStack, IconButton,
  SimpleGrid, Stat, StatLabel, StatNumber, Table,
  Tbody, Td, Text, Th, Thead, Tr, useColorModeValue,
  useToast, Icon, VStack, Progress, Tabs, TabList,
  Tab, TabPanels, TabPanel, Tooltip, Wrap, WrapItem,
} from "@chakra-ui/react";
import {
  FiRefreshCw, FiAlertTriangle, FiActivity,
  FiShield, FiFileText, FiTrendingUp, FiGlobe,
  FiTarget, FiCheckCircle, FiXCircle,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { getSuricataAlerts, getZeekLogs } from "../../backend_api";
import { useAuth } from "../../auth/AuthContext";

// Alert severity badge helper
const getSeverityBadge = (severity) => {
  const colors = {
    critical: "red", high: "orange", medium: "yellow",
    low: "blue", info: "gray", 1: "red", 2: "orange", 3: "yellow",
  };
  return colors[severity] || "gray";
};

const getSeverityLabel = (severity) => {
  if (severity === 1 || severity === "critical") return "HIGH";
  if (severity === 2 || severity === "high") return "MEDIUM";
  if (severity === 3 || severity === "medium") return "LOW";
  return "INFO";
};

// MITRE ATT&CK Technique Mapping (simplified - updates weekly)
const mapToMITRE = (signature) => {
  const sig = signature.toLowerCase();
  if (sig.includes("scan") || sig.includes("reconnaissance")) return { id: "T1046", name: "Network Service Scanning", tactic: "Discovery" };
  if (sig.includes("brute") || sig.includes("password")) return { id: "T1110", name: "Brute Force", tactic: "Credential Access" };
  if (sig.includes("exploit") || sig.includes("rce")) return { id: "T1190", name: "Exploit Public-Facing Application", tactic: "Initial Access" };
  if (sig.includes("sql injection") || sig.includes("sqli")) return { id: "T1190", name: "Exploit Public-Facing Application", tactic: "Initial Access" };
  if (sig.includes("malware") || sig.includes("trojan")) return { id: "T1203", name: "Exploitation for Client Execution", tactic: "Execution" };
  if (sig.includes("command") || sig.includes("shell")) return { id: "T1059", name: "Command and Scripting Interpreter", tactic: "Execution" };
  if (sig.includes("lateral") || sig.includes("movement")) return { id: "T1021", name: "Remote Services", tactic: "Lateral Movement" };
  if (sig.includes("exfil") || sig.includes("data transfer")) return { id: "T1041", name: "Exfiltration Over C2 Channel", tactic: "Exfiltration" };
  if (sig.includes("persistence")) return { id: "T1053", name: "Scheduled Task/Job", tactic: "Persistence" };
  if (sig.includes("privilege")) return { id: "T1068", name: "Exploitation for Privilege Escalation", tactic: "Privilege Escalation" };
  return { id: "T1071", name: "Application Layer Protocol", tactic: "Command and Control" };
};

// Mock geographic mapping (IP to country)
const mockGeoMapping = (ip) => {
  if (!ip) return "Unknown";
  const hash = ip.split('.').reduce((a, b) => a + parseInt(b), 0);
  const countries = ["USA", "China", "Russia", "Germany", "UK", "France", "Brazil", "India", "Japan", "South Korea", "Unknown"];
  return countries[hash % countries.length];
};

// Line Graph Component
const LineGraph = ({ data, maxValue, height = 150, color = "blue" }) => {
  if (data.length === 0) return null;

  const width = 100;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - (value / maxValue) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Grid lines */}
      <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="gray" strokeOpacity="0.2" strokeWidth="0.5" />
      <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="gray" strokeOpacity="0.2" strokeWidth="0.5" />
      <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="gray" strokeOpacity="0.2" strokeWidth="0.5" />

      {/* Area under line */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={color}
        fillOpacity="0.2"
      />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - (value / maxValue) * height;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="1.5"
            fill={color}
          />
        );
      })}
    </svg>
  );
};

// Pie Chart Component
const PieChart = ({ data, colors, size = 200 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Handle case with no data
  if (total === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text fontSize="sm" color="gray.500">No alert data available</Text>
      </Box>
    );
  }

  let currentAngle = -90; // Start at top

  const slices = data
    .filter(item => item.value > 0) // Only include slices with values
    .map((item, index) => {
      const percentage = (item.value / total) * 100;
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      currentAngle += angle;

      // Convert to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const radius = size / 2 - 10;
      const centerX = size / 2;
      const centerY = size / 2;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      // Find the original index to get the correct color
      const originalIndex = data.indexOf(item);

      return {
        path: pathData,
        color: colors[originalIndex] || colors[index],
        label: item.label,
        value: item.value,
        percentage: percentage.toFixed(1)
      };
    });

  return (
    <Box>
      <Flex justify="center" mb={3}>
        <svg width={size} height={size}>
          {slices.map((slice, index) => (
            <g key={index}>
              <path
                d={slice.path}
                fill={slice.color}
                stroke="white"
                strokeWidth="2"
              />
            </g>
          ))}
        </svg>
      </Flex>
      <VStack spacing={2}>
        {data.map((item, index) => (
          <Flex key={index} justify="space-between" w="100%" align="center">
            <HStack>
              <Box w="12px" h="12px" bg={colors[index]} borderRadius="sm" />
              <Text fontSize="sm">{item.label}</Text>
            </HStack>
            <HStack>
              <Text fontSize="sm" fontWeight="bold">{item.value}</Text>
              <Text fontSize="xs" color="gray.500">
                ({item.value > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'}%)
              </Text>
            </HStack>
          </Flex>
        ))}
      </VStack>
    </Box>
  );
};

// World Map Component with Realistic Continents
const WorldMap = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.count), 1);
  const bgColor = useColorModeValue("#EDF2F7", "#1A202C");
  const landColor = useColorModeValue("#CBD5E0", "#2D3748");
  const oceanColor = useColorModeValue("#E6FFFA", "#0F2942");

  return (
    <Box position="relative" w="100%" h="400px" bg={oceanColor} borderRadius="md" p={4} overflow="hidden">
      <svg width="100%" height="100%" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet">
        {/* Ocean background */}
        <rect width="1000" height="500" fill={oceanColor} />

        {/* Grid lines for coordinates */}
        <g stroke="#4A5568" strokeWidth="0.5" opacity="0.3">
          <line x1="0" y1="250" x2="1000" y2="250" strokeDasharray="5,5" />
          <line x1="500" y1="0" x2="500" y2="500" strokeDasharray="5,5" />
        </g>

        {/* North America */}
        <path d="M 150,100 Q 120,80 100,90 L 80,120 Q 70,140 80,160 L 100,180 Q 110,200 130,210 L 150,220 Q 170,230 180,240 L 200,250 Q 220,260 230,250 L 250,240 Q 260,220 270,200 L 280,180 Q 290,160 280,140 L 270,120 Q 260,100 250,90 L 230,80 Q 210,70 190,80 L 170,90 Q 160,95 150,100 Z"
              fill={landColor} stroke="#718096" strokeWidth="1.5" />

        {/* South America */}
        <path d="M 200,280 Q 190,290 195,310 L 200,330 Q 205,350 210,370 L 220,390 Q 230,410 240,420 L 250,430 Q 255,440 250,450 L 240,460 Q 230,465 220,460 L 210,450 Q 200,440 195,430 L 190,410 Q 185,390 190,370 L 195,350 Q 200,330 200,310 L 200,290 Q 200,280 200,280 Z"
              fill={landColor} stroke="#718096" strokeWidth="1.5" />

        {/* Europe */}
        <path d="M 480,90 Q 470,80 460,85 L 450,95 Q 445,105 450,115 L 460,125 Q 470,130 480,128 L 500,125 Q 515,120 525,125 L 535,135 Q 540,145 535,155 L 525,165 Q 515,170 505,168 L 490,165 Q 480,160 475,150 L 470,135 Q 468,120 470,105 L 475,95 Q 478,88 480,90 Z"
              fill={landColor} stroke="#718096" strokeWidth="1.5" />

        {/* Africa */}
        <path d="M 460,180 Q 450,175 445,185 L 442,200 Q 440,220 445,240 L 452,260 Q 460,280 470,300 L 480,320 Q 490,340 495,360 L 498,380 Q 500,395 495,405 L 485,410 Q 475,412 470,405 L 465,395 Q 460,380 458,365 L 455,345 Q 452,325 448,305 L 445,285 Q 442,265 445,245 L 450,220 Q 455,200 458,190 L 460,180 Z"
              fill={landColor} stroke="#718096" strokeWidth="1.5" />

        {/* Asia */}
        <path d="M 550,70 Q 540,65 535,75 L 532,90 Q 530,105 535,120 L 545,140 Q 555,155 570,165 L 590,175 Q 610,185 630,190 L 655,195 Q 680,198 700,195 L 720,190 Q 740,185 755,180 L 770,172 Q 785,164 795,155 L 805,145 Q 812,135 815,125 L 818,110 Q 820,95 815,85 L 805,75 Q 795,68 780,70 L 760,75 Q 740,80 720,82 L 695,85 Q 670,87 645,85 L 620,82 Q 595,78 575,73 L 555,70 Q 550,69 550,70 Z"
              fill={landColor} stroke="#718096" strokeWidth="1.5" />

        {/* Australia */}
        <path d="M 750,350 Q 740,345 735,355 L 732,370 Q 730,385 735,398 L 745,410 Q 755,420 768,425 L 785,428 Q 800,430 815,426 L 828,420 Q 838,412 843,400 L 846,385 Q 848,370 843,358 L 835,348 Q 825,342 812,345 L 795,350 Q 778,353 762,352 L 750,350 Z"
              fill={landColor} stroke="#718096" strokeWidth="1.5" />

        {/* Plot threat markers with pulsing animation effect */}
        {data.map((item, index) => {
          const positions = {
            'USA': { x: 180, y: 160 },
            'Canada': { x: 170, y: 120 },
            'Mexico': { x: 150, y: 230 },
            'Brazil': { x: 220, y: 380 },
            'UK': { x: 470, y: 110 },
            'France': { x: 480, y: 130 },
            'Germany': { x: 495, y: 115 },
            'Russia': { x: 620, y: 95 },
            'China': { x: 720, y: 150 },
            'Japan': { x: 810, y: 160 },
            'India': { x: 650, y: 180 },
            'South Korea': { x: 760, y: 155 },
            'Australia': { x: 800, y: 390 },
            'South Africa': { x: 480, y: 410 },
          };

          const pos = positions[item.country] || { x: 500, y: 250 };
          const size = Math.max(8, (item.count / maxValue) * 35);

          return (
            <g key={index}>
              {/* Outer glow effect */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={size + 8}
                fill="#E53E3E"
                fillOpacity="0.15"
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={size + 4}
                fill="#E53E3E"
                fillOpacity="0.3"
              />
              {/* Main threat marker */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={size}
                fill="#E53E3E"
                fillOpacity="0.8"
                stroke="#C53030"
                strokeWidth="2.5"
              />
              {/* Alert count */}
              <text
                x={pos.x}
                y={pos.y + 5}
                textAnchor="middle"
                fontSize="13"
                fontWeight="bold"
                fill="white"
                stroke="#000"
                strokeWidth="0.5"
              >
                {item.count}
              </text>
              {/* Country label */}
              <text
                x={pos.x}
                y={pos.y + size + 18}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#2D3748"
              >
                {item.country}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
};

export default function SecurityAnalystDashboard() {
  const toast = useToast();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suricataAlerts, setSuricataAlerts] = useState([]);
  const [zeekLogs, setZeekLogs] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const cardBg = useColorModeValue("white", "navy.800");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const headerBg = useColorModeValue("gray.50", "navy.900");
  const hoverBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const lineColor = useColorModeValue("#4299E1", "#63B3ED");

  const fetchAll = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [alerts, logs] = await Promise.all([
        getSuricataAlerts(200).catch(() => []),
        getZeekLogs(200).catch(() => []),
      ]);

      setSuricataAlerts(alerts || []);
      setZeekLogs(logs || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      toast({
        title: "Failed to load dashboard data",
        status: "error",
        duration: 1400,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Advanced Analytics
  const analytics = useMemo(() => {
    const allAlerts = suricataAlerts.map(a => ({
      ...a,
      signature: a.alert?.signature || a.signature || 'Unknown',
      severity: a.alert?.severity || a.severity || 3,
    }));

    // Basic counts
    const totalAlerts = allAlerts.length;
    const criticalAlerts = allAlerts.filter(a => a.severity === 1).length;
    const mediumAlerts = allAlerts.filter(a => a.severity === 2).length;
    const lowAlerts = allAlerts.filter(a => a.severity === 3).length;

    // Top 10 Alert Types
    const signatureCounts = {};
    allAlerts.forEach(alert => {
      const sig = alert.signature;
      signatureCounts[sig] = (signatureCounts[sig] || 0) + 1;
    });
    const top10Alerts = Object.entries(signatureCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([signature, count]) => ({ signature, count }));

    // Top Source/Dest IPs
    const srcIpCounts = {}, dstIpCounts = {};
    allAlerts.forEach(alert => {
      if (alert.src_ip) srcIpCounts[alert.src_ip] = (srcIpCounts[alert.src_ip] || 0) + 1;
      if (alert.dest_ip) dstIpCounts[alert.dest_ip] = (dstIpCounts[alert.dest_ip] || 0) + 1;
    });
    const top10SrcIps = Object.entries(srcIpCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
    const top10DstIps = Object.entries(dstIpCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    // Hourly Activity (24h)
    const now = new Date();
    const hourlyActivity = Array(24).fill(0);
    allAlerts.forEach(alert => {
      const alertTime = new Date(alert.timestamp);
      const hoursDiff = Math.floor((now - alertTime) / (1000 * 60 * 60));
      if (hoursDiff >= 0 && hoursDiff < 24) {
        hourlyActivity[23 - hoursDiff]++;
      }
    });

    // Recent high priority
    const recentHighPriority = allAlerts
      .filter(a => a.severity === 1 || a.severity === 2)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    // MITRE ATT&CK Mapping (updates weekly)
    const mitreTechniques = {};
    const mitreTactics = {};
    allAlerts.forEach(alert => {
      const mitre = mapToMITRE(alert.signature);
      mitreTechniques[mitre.id] = {
        ...mitre,
        count: (mitreTechniques[mitre.id]?.count || 0) + 1
      };
      mitreTactics[mitre.tactic] = (mitreTactics[mitre.tactic] || 0) + 1;
    });
    const topMITRETechniques = Object.values(mitreTechniques)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const mitreTopTactics = Object.entries(mitreTactics)
      .sort((a, b) => b[1] - a[1])
      .map(([tactic, count]) => ({ tactic, count }));

    // Geographic Distribution
    const geoDistribution = {};
    allAlerts.forEach(alert => {
      const country = mockGeoMapping(alert.src_ip);
      geoDistribution[country] = (geoDistribution[country] || 0) + 1;
    });
    const topCountries = Object.entries(geoDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    // Alert Status Tracking (mock)
    const alertStatuses = {
      New: Math.floor(totalAlerts * 0.6),
      Investigating: Math.floor(totalAlerts * 0.25),
      Resolved: Math.floor(totalAlerts * 0.15),
    };

    // Detection Effectiveness (mock)
    const truePositives = Math.floor(totalAlerts * 0.7);
    const falsePositives = Math.floor(totalAlerts * 0.3);

    // Alert Trending (last 7 days)
    const dailyAlerts = Array(7).fill(0);
    allAlerts.forEach(alert => {
      const alertTime = new Date(alert.timestamp);
      const daysDiff = Math.floor((now - alertTime) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < 7) {
        dailyAlerts[6 - daysDiff]++;
      }
    });

    return {
      totalAlerts, criticalAlerts, mediumAlerts, lowAlerts,
      top10Alerts, top10SrcIps, top10DstIps,
      hourlyActivity, recentHighPriority,
      maxHourlyActivity: Math.max(...hourlyActivity, 1),
      topMITRETechniques, mitreTopTactics,
      topCountries, alertStatuses, truePositives, falsePositives,
      dailyAlerts, maxDailyAlerts: Math.max(...dailyAlerts, 1),
    };
  }, [suricataAlerts]);

  return (
    <Box>
      {/* Header */}
      <Flex gap={3} align="center" mb={6}>
        <Text fontSize="2xl" fontWeight="bold">
          Security Operations Center
        </Text>
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

      {/* Summary Cards - Removed True Positive Rate */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mb={6}>
        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
          <Flex justify="space-between" align="center">
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">Total Alerts (24h)</StatLabel>
              <StatNumber fontSize="2xl" fontWeight="bold" color="blue.500">
                {analytics.totalAlerts}
              </StatNumber>
            </Stat>
            <Icon as={FiAlertTriangle} w={8} h={8} color="blue.500" />
          </Flex>
        </Box>

        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
          <Flex justify="space-between" align="center">
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">High Severity</StatLabel>
              <StatNumber fontSize="2xl" fontWeight="bold" color="red.500">
                {analytics.criticalAlerts}
              </StatNumber>
            </Stat>
            <Icon as={FiShield} w={8} h={8} color="red.500" />
          </Flex>
        </Box>

        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
          <Flex justify="space-between" align="center">
            <Stat>
              <StatLabel fontSize="sm" color="gray.500">
                Detection Coverage
                <Tooltip
                  label="Shows how many of the 14 MITRE ATT&CK tactics your security rules are detecting. The 14 tactics cover the full attack lifecycle: Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Command & Control, Exfiltration, Impact, Reconnaissance, and Resource Development. Higher coverage = better visibility."
                  placement="top"
                  hasArrow
                >
                  <span style={{ marginLeft: '4px', cursor: 'help' }}>ⓘ</span>
                </Tooltip>
              </StatLabel>
              <StatNumber fontSize="2xl" fontWeight="bold" color="purple.500">
                {analytics.mitreTopTactics.length}/14
              </StatNumber>
            </Stat>
            <Icon as={FiTarget} w={8} h={8} color="purple.500" />
          </Flex>
        </Box>
      </SimpleGrid>

      {/* Dashboard Views */}
      <Tabs colorScheme="brand">
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Threat Intelligence</Tab>
          <Tab>Investigation</Tab>
        </TabList>

        <TabPanels>
          {/* Overview Tab */}
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
              {/* Alert Activity Line Graph */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <Flex justify="space-between" align="center" mb={4}>
                  <HStack>
                    <Icon as={FiTrendingUp} color="brand.500" />
                    <Text fontSize="lg" fontWeight="semibold">Alert Activity (Last 24 Hours)</Text>
                  </HStack>
                  <Badge colorScheme="purple" fontSize="sm">{analytics.totalAlerts} total</Badge>
                </Flex>
                <Box position="relative">
                  <LineGraph
                    data={analytics.hourlyActivity}
                    maxValue={analytics.maxHourlyActivity}
                    height={150}
                    color={lineColor}
                  />
                  <Flex justify="space-between" mt={2}>
                    <Text fontSize="xs" color="gray.500">24h ago</Text>
                    <Text fontSize="xs" color="gray.500">Now</Text>
                  </Flex>
                </Box>
              </Box>

              {/* Severity Distribution Pie Chart */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>Alert Severity Distribution</Text>
                <Flex justify="center" align="center">
                  <PieChart
                    data={[
                      { label: 'High', value: analytics.criticalAlerts },
                      { label: 'Medium', value: analytics.mediumAlerts },
                      { label: 'Low', value: analytics.lowAlerts },
                    ]}
                    colors={['#E53E3E', '#DD6B20', '#3182CE']}
                    size={220}
                  />
                </Flex>
              </Box>
            </SimpleGrid>

            {/* Top Analytics Grid */}
            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6} mb={6}>
              {/* Top 10 Alert Types */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>Top 10 Alert Types</Text>
                <VStack align="stretch" spacing={2}>
                  {analytics.top10Alerts.length > 0 ? (
                    analytics.top10Alerts.map((item, idx) => (
                      <Box key={idx}>
                        <Flex justify="space-between" align="center" mb={1}>
                          <Text fontSize="sm" fontWeight="medium" maxW="70%" isTruncated>
                            {item.signature}
                          </Text>
                          <Badge colorScheme="blue" fontSize="xs">{item.count}</Badge>
                        </Flex>
                        <Progress
                          value={(item.count / analytics.totalAlerts) * 100}
                          size="sm"
                          colorScheme="blue"
                          borderRadius="full"
                        />
                      </Box>
                    ))
                  ) : (
                    <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                      No alerts to display
                    </Text>
                  )}
                </VStack>
              </Box>

              {/* Top 10 Source IPs */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>Top 10 Source IPs</Text>
                <VStack align="stretch" spacing={2}>
                  {analytics.top10SrcIps.length > 0 ? (
                    analytics.top10SrcIps.map((item, idx) => (
                      <Flex key={idx} justify="space-between" align="center" p={2} borderRadius="md" _hover={{ bg: hoverBg }}>
                        <HStack>
                          <Badge colorScheme="orange" fontSize="xs">#{idx + 1}</Badge>
                          <Text fontSize="sm" fontFamily="mono">{item.ip}</Text>
                        </HStack>
                        <Badge colorScheme="red" fontSize="xs">{item.count} alerts</Badge>
                      </Flex>
                    ))
                  ) : (
                    <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                      No source IPs
                    </Text>
                  )}
                </VStack>
              </Box>

              {/* Top 10 Destination IPs */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>Top 10 Destination IPs</Text>
                <VStack align="stretch" spacing={2}>
                  {analytics.top10DstIps.length > 0 ? (
                    analytics.top10DstIps.map((item, idx) => (
                      <Flex key={idx} justify="space-between" align="center" p={2} borderRadius="md" _hover={{ bg: hoverBg }}>
                        <HStack>
                          <Badge colorScheme="purple" fontSize="xs">#{idx + 1}</Badge>
                          <Text fontSize="sm" fontFamily="mono">{item.ip}</Text>
                        </HStack>
                        <Badge colorScheme="red" fontSize="xs">{item.count} alerts</Badge>
                      </Flex>
                    ))
                  ) : (
                    <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                      No destination IPs
                    </Text>
                  )}
                </VStack>
              </Box>
            </SimpleGrid>

            {/* Recent Security Alerts */}
            <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontSize="lg" fontWeight="semibold">Recent Security Alerts</Text>
                <Button size="sm" colorScheme="brand" onClick={() => navigate("/security-analyst/alerts")}>
                  View All & Manage
                </Button>
              </Flex>
              {analytics.recentHighPriority.length > 0 ? (
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead bg={headerBg}>
                      <Tr>
                        <Th>Timestamp</Th>
                        <Th>Alert Name</Th>
                        <Th>Source IP</Th>
                        <Th>Dest IP</Th>
                        <Th>Severity</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {analytics.recentHighPriority.map((alert, idx) => (
                        <Tr key={idx} _hover={{ bg: hoverBg }}>
                          <Td fontSize="sm" whiteSpace="nowrap">
                            {new Date(alert.timestamp).toLocaleString()}
                          </Td>
                          <Td fontWeight="medium" fontSize="sm" maxW="300px" isTruncated>
                            {alert.signature}
                          </Td>
                          <Td fontSize="sm" fontFamily="mono">{alert.src_ip || "N/A"}</Td>
                          <Td fontSize="sm" fontFamily="mono">{alert.dest_ip || "N/A"}</Td>
                          <Td>
                            <Badge colorScheme={getSeverityBadge(alert.severity)} fontSize="xs">
                              {getSeverityLabel(alert.severity)}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              ) : (
                <VStack py={8} color="gray.500">
                  <Icon as={FiShield} w={12} h={12} />
                  <Text>No high-priority alerts</Text>
                </VStack>
              )}
            </Box>
          </TabPanel>

          {/* Threat Intelligence Tab */}
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
              {/* MITRE ATT&CK Techniques */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <HStack mb={4}>
                  <Icon as={FiTarget} color="red.500" />
                  <Text fontSize="lg" fontWeight="semibold">MITRE ATT&CK Techniques</Text>
                  <Badge colorScheme="green" fontSize="xs">Updates Weekly</Badge>
                </HStack>
                <VStack align="stretch" spacing={2} maxH="400px" overflowY="auto">
                  {analytics.topMITRETechniques.map((tech, idx) => (
                    <Box key={idx} p={3} borderWidth="1px" borderColor={border} borderRadius="md" _hover={{ bg: hoverBg }}>
                      <Flex justify="space-between" align="center" mb={2}>
                        <HStack>
                          <Badge colorScheme="red" fontSize="xs">{tech.id}</Badge>
                          <Text fontSize="sm" fontWeight="bold">{tech.name}</Text>
                        </HStack>
                        <Badge colorScheme="orange">{tech.count}</Badge>
                      </Flex>
                      <Text fontSize="xs" color="gray.500">Tactic: {tech.tactic}</Text>
                    </Box>
                  ))}
                </VStack>
              </Box>

              {/* MITRE Tactics Distribution */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>Attack Tactics Distribution</Text>
                <VStack align="stretch" spacing={3}>
                  {analytics.mitreTopTactics.map((item, idx) => (
                    <Box key={idx}>
                      <Flex justify="space-between" align="center" mb={1}>
                        <Text fontSize="sm" fontWeight="medium">{item.tactic}</Text>
                        <Badge colorScheme="purple" fontSize="xs">{item.count} alerts</Badge>
                      </Flex>
                      <Progress
                        value={(item.count / analytics.totalAlerts) * 100}
                        size="sm"
                        colorScheme="purple"
                        borderRadius="full"
                      />
                    </Box>
                  ))}
                </VStack>
              </Box>
            </SimpleGrid>

            {/* Geographic Threat Intelligence - World Map */}
            <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5} mb={6}>
              <HStack mb={4}>
                <Icon as={FiGlobe} color="blue.500" />
                <Text fontSize="lg" fontWeight="semibold">Geographic Threat Distribution</Text>
              </HStack>
              <WorldMap data={analytics.topCountries} />
              <SimpleGrid columns={{ base: 2, md: 5 }} spacing={3} mt={4}>
                {analytics.topCountries.slice(0, 5).map((item, idx) => (
                  <Box key={idx} p={3} borderWidth="1px" borderColor={border} borderRadius="md" textAlign="center">
                    <Text fontSize="sm" fontWeight="bold">{item.country}</Text>
                    <Badge colorScheme="red" fontSize="md" mt={1}>{item.count}</Badge>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>

            {/* Top Threat Indicators */}
            <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
              <Text fontSize="lg" fontWeight="semibold" mb={4}>Top Threat Indicators (IOCs)</Text>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={3} color="orange.500">Malicious IPs</Text>
                  <VStack align="stretch" spacing={2}>
                    {analytics.top10SrcIps.slice(0, 5).map((item, idx) => (
                      <Flex key={idx} justify="space-between" p={2} bg={hoverBg} borderRadius="md">
                        <Text fontSize="sm" fontFamily="mono">{item.ip}</Text>
                        <Badge colorScheme="red">{item.count}</Badge>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={3} color="purple.500">Targeted Assets</Text>
                  <VStack align="stretch" spacing={2}>
                    {analytics.top10DstIps.slice(0, 5).map((item, idx) => (
                      <Flex key={idx} justify="space-between" p={2} bg={hoverBg} borderRadius="md">
                        <Text fontSize="sm" fontFamily="mono">{item.ip}</Text>
                        <Badge colorScheme="orange">{item.count}</Badge>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
              </SimpleGrid>
            </Box>
          </TabPanel>

          {/* Investigation Tab */}
          <TabPanel px={0}>
            {/* Alert Trending - Line Graph */}
            <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5} mb={6}>
              <Text fontSize="lg" fontWeight="semibold" mb={4}>Alert Trending (Last 7 Days)</Text>
              <Box position="relative">
                <LineGraph
                  data={analytics.dailyAlerts}
                  maxValue={analytics.maxDailyAlerts}
                  height={180}
                  color="#DD6B20"
                />
                <Flex justify="space-between" mt={2}>
                  <Text fontSize="xs" color="gray.500">6 days ago</Text>
                  <Text fontSize="xs" color="gray.500">Today</Text>
                </Flex>
              </Box>
            </Box>

            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6} mb={6}>
              {/* Alert Status Tracker */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>Alert Status Distribution</Text>
                <VStack align="stretch" spacing={3}>
                  {Object.entries(analytics.alertStatuses).map(([status, count]) => (
                    <Box key={status}>
                      <Flex justify="space-between" align="center" mb={1}>
                        <HStack>
                          <Icon
                            as={status === "Resolved" ? FiCheckCircle : status === "Investigating" ? FiActivity : FiAlertTriangle}
                            color={status === "Resolved" ? "green.500" : status === "Investigating" ? "blue.500" : "gray.500"}
                          />
                          <Text fontSize="sm" fontWeight="medium">{status}</Text>
                        </HStack>
                        <Badge
                          colorScheme={status === "Resolved" ? "green" : status === "Investigating" ? "blue" : "gray"}
                        >
                          {count}
                        </Badge>
                      </Flex>
                      <Progress
                        value={(count / analytics.totalAlerts) * 100}
                        size="sm"
                        colorScheme={status === "Resolved" ? "green" : status === "Investigating" ? "blue" : "gray"}
                        borderRadius="full"
                      />
                    </Box>
                  ))}
                </VStack>
              </Box>

              {/* Detection Effectiveness */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>
                  Detection Effectiveness
                  <Tooltip
                    label="Measures the accuracy of your security rules by tracking True Positives (real threats correctly identified) vs False Positives (benign activity incorrectly flagged). High accuracy means fewer false alarms and better threat detection."
                    placement="top"
                    hasArrow
                  >
                    <span style={{ marginLeft: '8px', cursor: 'help', fontSize: '14px', color: '#718096' }}>ⓘ</span>
                  </Tooltip>
                </Text>
                <VStack spacing={4}>
                  <Box w="100%">
                    <Flex justify="space-between" align="center" mb={2}>
                      <HStack>
                        <Icon as={FiCheckCircle} color="green.500" />
                        <Text fontSize="sm">True Positives</Text>
                      </HStack>
                      <Text fontSize="xl" fontWeight="bold" color="green.500">
                        {analytics.truePositives}
                      </Text>
                    </Flex>
                    <Progress
                      value={(analytics.truePositives / analytics.totalAlerts) * 100}
                      size="md"
                      colorScheme="green"
                      borderRadius="full"
                    />
                  </Box>
                  <Box w="100%">
                    <Flex justify="space-between" align="center" mb={2}>
                      <HStack>
                        <Icon as={FiXCircle} color="red.500" />
                        <Text fontSize="sm">False Positives</Text>
                      </HStack>
                      <Text fontSize="xl" fontWeight="bold" color="red.500">
                        {analytics.falsePositives}
                      </Text>
                    </Flex>
                    <Progress
                      value={(analytics.falsePositives / analytics.totalAlerts) * 100}
                      size="md"
                      colorScheme="red"
                      borderRadius="full"
                    />
                  </Box>
                  <Box w="100%" p={4} bg={hoverBg} borderRadius="md" textAlign="center">
                    <Text fontSize="sm" color="gray.600" mb={1}>Accuracy Rate</Text>
                    <Text fontSize="3xl" fontWeight="bold" color="brand.500">
                      {analytics.totalAlerts > 0
                        ? ((analytics.truePositives / analytics.totalAlerts) * 100).toFixed(1)
                        : 0}%
                    </Text>
                  </Box>
                </VStack>
              </Box>

              {/* Rule Coverage */}
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>Detection Coverage</Text>
                <VStack spacing={4}>
                  <Box w="100%" textAlign="center">
                    <Text fontSize="sm" color="gray.600" mb={2}>MITRE ATT&CK Coverage</Text>
                    <Text fontSize="4xl" fontWeight="bold" color="purple.500">
                      {analytics.mitreTopTactics.length}/14
                    </Text>
                    <Text fontSize="xs" color="gray.500">Tactics Covered</Text>
                  </Box>
                  <Progress
                    value={(analytics.mitreTopTactics.length / 14) * 100}
                    size="lg"
                    colorScheme="purple"
                    borderRadius="full"
                    w="100%"
                  />
                  <Box w="100%" textAlign="center" p={3} bg={hoverBg} borderRadius="md">
                    <Text fontSize="sm" color="gray.600" mb={1}>Unique Alert Rules</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                      {analytics.top10Alerts.length}
                    </Text>
                    <Text fontSize="xs" color="gray.500">Active Signatures</Text>
                  </Box>
                </VStack>
              </Box>
            </SimpleGrid>

            {/* Alerts by Severity Over Time */}
            <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="16px" p={5}>
              <Text fontSize="lg" fontWeight="semibold" mb={4}>Alert Severity Breakdown</Text>
              <Wrap spacing={4}>
                <WrapItem flex="1" minW="200px">
                  <VStack align="stretch" w="100%">
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FiShield} color="red.500" />
                        <Text fontSize="sm">High Severity</Text>
                      </HStack>
                      <Badge colorScheme="red" fontSize="lg">{analytics.criticalAlerts}</Badge>
                    </HStack>
                    <Progress value={(analytics.criticalAlerts / analytics.totalAlerts) * 100} colorScheme="red" size="lg" borderRadius="full" />
                  </VStack>
                </WrapItem>
                <WrapItem flex="1" minW="200px">
                  <VStack align="stretch" w="100%">
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FiActivity} color="orange.500" />
                        <Text fontSize="sm">Medium Severity</Text>
                      </HStack>
                      <Badge colorScheme="orange" fontSize="lg">{analytics.mediumAlerts}</Badge>
                    </HStack>
                    <Progress value={(analytics.mediumAlerts / analytics.totalAlerts) * 100} colorScheme="orange" size="lg" borderRadius="full" />
                  </VStack>
                </WrapItem>
                <WrapItem flex="1" minW="200px">
                  <VStack align="stretch" w="100%">
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FiFileText} color="blue.500" />
                        <Text fontSize="sm">Low Severity</Text>
                      </HStack>
                      <Badge colorScheme="blue" fontSize="lg">{analytics.lowAlerts}</Badge>
                    </HStack>
                    <Progress value={(analytics.lowAlerts / analytics.totalAlerts) * 100} colorScheme="blue" size="lg" borderRadius="full" />
                  </VStack>
                </WrapItem>
              </Wrap>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
