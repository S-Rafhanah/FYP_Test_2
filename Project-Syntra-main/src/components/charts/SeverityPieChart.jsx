// src/components/charts/PieChart.jsx
import React, { useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
  SimpleGrid,
  Circle,
} from '@chakra-ui/react';

// SVG-based pie chart for severity distribution
export default function PieChart({ alerts = [], title = "Severity Distribution" }) {
  const textPrimary = useColorModeValue('secondaryGray.900', 'white');
  const textSecondary = useColorModeValue('secondaryGray.700', 'whiteAlpha.700');
  const centerFill = useColorModeValue('white', '#1B254B');

  // Calculate severity distribution
  const severityData = useMemo(() => {
    if (alerts.length === 0) return [];

    const counts = { '1': 0, '2': 0, '3': 0 };
    alerts.forEach(alert => {
      const sev = String(alert.severity || '3');
      if (counts.hasOwnProperty(sev)) {
        counts[sev]++;
      }
    });

    const total = alerts.length;
    return [
      {
        label: 'High',
        severity: '1',
        count: counts['1'],
        percentage: total > 0 ? (counts['1'] / total) * 100 : 0,
        color: '#E53E3E', // red
      },
      {
        label: 'Medium',
        severity: '2',
        count: counts['2'],
        percentage: total > 0 ? (counts['2'] / total) * 100 : 0,
        color: '#DD6B20', // orange
      },
      {
        label: 'Low',
        severity: '3',
        count: counts['3'],
        percentage: total > 0 ? (counts['3'] / total) * 100 : 0,
        color: '#D69E2E', // yellow
      },
    ];
  }, [alerts]);

  // Generate pie chart paths
  const generatePieSlices = () => {
    const size = 100;
    const center = size / 2;
    const radius = size / 2 - 5;

    let currentAngle = -90; // Start from top

    return severityData.map((segment, idx) => {
      if (segment.count === 0) return null;

      const angle = (segment.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      // Convert to radians
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Calculate arc points
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      // Large arc flag
      const largeArc = angle > 180 ? 1 : 0;

      const path = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      currentAngle = endAngle;

      return (
        <path
          key={idx}
          d={path}
          fill={segment.color}
          stroke="white"
          strokeWidth="2"
          opacity="0.9"
        />
      );
    });
  };

  if (alerts.length === 0) {
    return (
      <Flex justify="center" align="center" minH="150px">
        <Text color={textSecondary} fontSize="sm">
          No data available
        </Text>
      </Flex>
    );
  }

  return (
    <Box>
      <Text fontSize="sm" fontWeight="600" color={textPrimary} mb={3}>
        {title}
      </Text>
      <Flex direction="column" align="center">
        {/* Pie Chart */}
        <Box mb={4}>
          <svg width="160" height="160" viewBox="0 0 100 100">
            {generatePieSlices()}
            {/* Center circle for donut effect */}
            <circle
              cx="50"
              cy="50"
              r="20"
              fill={centerFill}
            />
            <text
              x="50"
              y="48"
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill={textPrimary}
            >
              {alerts.length}
            </text>
            <text
              x="50"
              y="58"
              textAnchor="middle"
              fontSize="6"
              fill={textSecondary}
            >
              Total
            </text>
          </svg>
        </Box>

        {/* Legend */}
        <SimpleGrid columns={3} spacing={3} w="100%">
          {severityData.map((segment, idx) => (
            <Flex key={idx} align="center" gap={2}>
              <Circle size="12px" bg={segment.color} />
              <Box>
                <Text fontSize="xs" fontWeight="600" color={textPrimary}>
                  {segment.label}
                </Text>
                <Text fontSize="xs" color={textSecondary}>
                  {segment.count} ({Math.round(segment.percentage)}%)
                </Text>
              </Box>
            </Flex>
          ))}
        </SimpleGrid>
      </Flex>
    </Box>
  );
}