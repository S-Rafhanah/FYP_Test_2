// src/components/charts/BarChart.jsx
import React, { useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';

// Simple SVG-based horizontal bar chart
export default function BarChart({ alerts = [], title = "Bar Chart", maxBars = 5 }) {
  const textPrimary = useColorModeValue('secondaryGray.900', 'white');
  const textSecondary = useColorModeValue('secondaryGray.700', 'whiteAlpha.700');
  const barBg = useColorModeValue('#4318FF', '#7551FF');
  const trackBg = useColorModeValue('secondaryGray.200', 'whiteAlpha.100');

  // Group alerts by signature and count
  const chartData = useMemo(() => {
    if (alerts.length === 0) return [];

    const signatureMap = {};
    alerts.forEach(alert => {
      const sig = alert.signature || 'Unknown';
      if (!signatureMap[sig]) {
        signatureMap[sig] = { name: sig, count: 0, severity: alert.severity };
      }
      signatureMap[sig].count++;
    });

    // Sort by count and take top N
    return Object.values(signatureMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, maxBars);
  }, [alerts, maxBars]);

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  const getSeverityColor = (severity) => {
    const sev = String(severity);
    if (sev === '1') return '#E53E3E'; // red
    if (sev === '2') return '#DD6B20'; // orange
    if (sev === '3') return '#D69E2E'; // yellow
    return '#718096'; // gray
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
      <Box>
        {chartData.map((item, idx) => {
          const percentage = (item.count / maxCount) * 100;
          const barColor = getSeverityColor(item.severity);

          return (
            <Box key={idx} mb={3}>
              <Flex justify="space-between" align="center" mb={1}>
                <Tooltip label={item.name} hasArrow>
                  <Text
                    fontSize="xs"
                    color={textPrimary}
                    fontWeight="500"
                    noOfLines={1}
                    maxW="70%"
                  >
                    {item.name}
                  </Text>
                </Tooltip>
                <Text fontSize="xs" color={textSecondary} fontWeight="600">
                  {item.count}
                </Text>
              </Flex>
              <Box
                h="20px"
                w="100%"
                bg={trackBg}
                borderRadius="6px"
                overflow="hidden"
                position="relative"
              >
                <Box
                  h="100%"
                  w={`${percentage}%`}
                  bg={barColor}
                  borderRadius="6px"
                  transition="width 0.3s ease"
                  position="relative"
                >
                  {/* Gradient overlay for depth */}
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    bgGradient="linear(to-r, transparent, whiteAlpha.200)"
                    borderRadius="6px"
                  />
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
      <Text fontSize="xs" color={textSecondary} mt={2} textAlign="right">
        Top {chartData.length} of {Object.keys(alerts.reduce((acc, a) => ({ ...acc, [a.signature || 'Unknown']: 1 }), {})).length} signatures
      </Text>
    </Box>
  );
}