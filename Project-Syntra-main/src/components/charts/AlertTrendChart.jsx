// src/components/charts/TrendChart.jsx
import React, { useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';

// Simple SVG-based line chart for alert trends
export default function TrendChart({ alerts = [], title = "Alert Trends" }) {
  const textPrimary = useColorModeValue('secondaryGray.900', 'white');
  const textSecondary = useColorModeValue('secondaryGray.700', 'whiteAlpha.700');
  const lineColor = useColorModeValue('#4318FF', '#7551FF');
  const gridColor = useColorModeValue('rgba(0,0,0,0.05)', 'rgba(255,255,255,0.05)');
  const areaGradient = useColorModeValue('rgba(67, 24, 255, 0.1)', 'rgba(117, 81, 255, 0.15)');

  // Process alerts into time buckets (last 24 hours in 1-hour intervals)
  const chartData = useMemo(() => {
    if (alerts.length === 0) return [];

    const now = new Date();
    const buckets = [];

    // Create 24 hourly buckets
    for (let i = 23; i >= 0; i--) {
      const bucketTime = new Date(now.getTime() - i * 60 * 60 * 1000);
      buckets.push({
        time: bucketTime,
        label: bucketTime.getHours() + ':00',
        count: 0
      });
    }

    // Count alerts in each bucket
    alerts.forEach(alert => {
      if (!alert.timestamp) return;
      const alertTime = new Date(alert.timestamp);
      const hoursDiff = Math.floor((now - alertTime) / (60 * 60 * 1000));

      if (hoursDiff >= 0 && hoursDiff < 24) {
        const bucketIndex = 23 - hoursDiff;
        if (buckets[bucketIndex]) {
          buckets[bucketIndex].count++;
        }
      }
    });

    return buckets;
  }, [alerts]);

  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const width = 100; // percentage
  const height = 120; // pixels
  const padding = 10;

  // Generate SVG path for line
  const generatePath = () => {
    if (chartData.length === 0) return '';

    const points = chartData.map((d, i) => {
      const x = (i / (chartData.length - 1)) * 100;
      const y = 100 - (d.count / maxCount) * 90; // Leave 10% padding
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  // Generate area path (for gradient fill)
  const generateAreaPath = () => {
    if (chartData.length === 0) return '';

    const points = chartData.map((d, i) => {
      const x = (i / (chartData.length - 1)) * 100;
      const y = 100 - (d.count / maxCount) * 90;
      return `${x},${y}`;
    });

    const areaPath = `M 0,100 L ${points.join(' L ')} L 100,100 Z`;
    return areaPath;
  };

  if (alerts.length === 0) {
    return (
      <Flex justify="center" align="center" minH={height + 'px'}>
        <Text color={textSecondary} fontSize="sm">
          No trend data available
        </Text>
      </Flex>
    );
  }

  return (
    <Box>
      <Text fontSize="sm" fontWeight="600" color={textPrimary} mb={2}>
        {title}
      </Text>
      <Box position="relative" height={height + 'px'}>
        {/* SVG Chart */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke={gridColor} strokeWidth="0.2" />
          <line x1="0" y1="50" x2="100" y2="50" stroke={gridColor} strokeWidth="0.2" />
          <line x1="0" y1="75" x2="100" y2="75" stroke={gridColor} strokeWidth="0.2" />

          {/* Area gradient */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d={generateAreaPath()}
            fill="url(#areaGradient)"
          />

          {/* Line */}
          <path
            d={generatePath()}
            fill="none"
            stroke={lineColor}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {chartData.map((d, i) => {
            const x = (i / (chartData.length - 1)) * 100;
            const y = 100 - (d.count / maxCount) * 90;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="0.8"
                fill={lineColor}
                opacity={d.count > 0 ? 1 : 0.3}
              />
            );
          })}
        </svg>

        {/* Time labels */}
        <Flex justify="space-between" mt={1}>
          <Text fontSize="xs" color={textSecondary}>
            {chartData[0]?.label || ''}
          </Text>
          <Text fontSize="xs" color={textSecondary}>
            {chartData[Math.floor(chartData.length / 2)]?.label || ''}
          </Text>
          <Text fontSize="xs" color={textSecondary}>
            Now
          </Text>
        </Flex>

        {/* Stats */}
        <Flex justify="space-between" mt={2}>
          <Box>
            <Text fontSize="xs" color={textSecondary}>Peak</Text>
            <Text fontSize="lg" fontWeight="700" color={textPrimary}>
              {maxCount}
            </Text>
          </Box>
          <Box>
            <Text fontSize="xs" color={textSecondary}>Total (24h)</Text>
            <Text fontSize="lg" fontWeight="700" color={textPrimary}>
              {chartData.reduce((sum, d) => sum + d.count, 0)}
            </Text>
          </Box>
          <Box>
            <Text fontSize="xs" color={textSecondary}>Avg/Hour</Text>
            <Text fontSize="lg" fontWeight="700" color={textPrimary}>
              {Math.round(chartData.reduce((sum, d) => sum + d.count, 0) / 24)}
            </Text>
          </Box>
        </Flex>
      </Box>
    </Box>
  );
}