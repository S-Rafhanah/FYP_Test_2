// src/components/charts/GeoMap.js
import React, { useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  Badge,
  Stack,
  useColorModeValue,
  SimpleGrid,
  Tooltip,
} from '@chakra-ui/react';

// Simple geographic visualization of threat sources
// This is a simplified version - can be enhanced with react-leaflet for actual maps
export default function GeoMap({ alerts = [] }) {
  const textPrimary = useColorModeValue('secondaryGray.900', 'white');
  const textSecondary = useColorModeValue('secondaryGray.700', 'whiteAlpha.700');
  const subtleBg = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const hoverBg = useColorModeValue('secondaryGray.200', 'whiteAlpha.200');
  const heatColor = useColorModeValue('red.500', 'red.400');

  // Analyze threat sources
  const threatSources = useMemo(() => {
    const sourceMap = {};

    alerts.forEach(alert => {
      const src = alert.src_ip || 'Unknown';
      if (!sourceMap[src]) {
        sourceMap[src] = {
          ip: src,
          count: 0,
          destinations: new Set(),
          severity: alert.severity,
          signatures: []
        };
      }
      sourceMap[src].count++;
      if (alert.dest_ip) {
        sourceMap[src].destinations.add(alert.dest_ip);
      }
      if (alert.signature && !sourceMap[src].signatures.includes(alert.signature)) {
        sourceMap[src].signatures.push(alert.signature);
      }
    });

    // Convert to array and sort by count
    return Object.values(sourceMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [alerts]);

  // Calculate heatmap data (IP address ranges)
  const heatmapData = useMemo(() => {
    const rangeMap = {};

    alerts.forEach(alert => {
      if (alert.src_ip) {
        // Get first two octets for IP range grouping
        const range = alert.src_ip.split('.').slice(0, 2).join('.');
        rangeMap[range] = (rangeMap[range] || 0) + 1;
      }
    });

    // Convert to array and sort
    return Object.entries(rangeMap)
      .map(([range, count]) => ({ range: `${range}.x.x`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [alerts]);

  const maxCount = Math.max(...heatmapData.map(d => d.count), 1);

  const getSeverityColor = (severity) => {
    if (!severity) return 'gray';
    const sev = String(severity);
    if (sev === '1') return 'red';
    if (sev === '2') return 'orange';
    if (sev === '3') return 'yellow';
    return 'gray';
  };

  if (alerts.length === 0) {
    return (
      <Flex justify="center" align="center" minH="200px">
        <Text color={textSecondary} textAlign="center">
          No threat geolocation data available
        </Text>
      </Flex>
    );
  }

  return (
    <Stack spacing={4}>
      {/* Heatmap - IP Range Distribution */}
      <Box>
        <Text fontSize="sm" fontWeight="600" color={textPrimary} mb={2}>
          Threat Source Heatmap (IP Ranges)
        </Text>
        <SimpleGrid columns={2} spacing={2}>
          {heatmapData.map((item) => {
            const intensity = (item.count / maxCount) * 100;
            const bgOpacity = Math.max(0.2, intensity / 100);

            return (
              <Tooltip
                key={item.range}
                label={`${item.count} threat${item.count !== 1 ? 's' : ''} from ${item.range}`}
                hasArrow
              >
                <Box
                  p={2}
                  borderRadius="8px"
                  bg={subtleBg}
                  position="relative"
                  overflow="hidden"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ transform: 'scale(1.02)' }}
                >
                  {/* Heat overlay */}
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    bg={heatColor}
                    opacity={bgOpacity}
                    borderRadius="8px"
                  />

                  {/* Content */}
                  <Flex justify="space-between" align="center" position="relative" zIndex={1}>
                    <Text fontSize="xs" fontWeight="600" color={textPrimary}>
                      {item.range}
                    </Text>
                    <Badge
                      colorScheme={intensity > 70 ? 'red' : intensity > 40 ? 'orange' : 'yellow'}
                      fontSize="0.65rem"
                    >
                      {item.count}
                    </Badge>
                  </Flex>
                </Box>
              </Tooltip>
            );
          })}
        </SimpleGrid>
      </Box>

      {/* Top Threat Sources */}
      <Box>
        <Text fontSize="sm" fontWeight="600" color={textPrimary} mb={2}>
          Top Threat Sources
        </Text>
        <Stack spacing={2}>
          {threatSources.slice(0, 5).map((source, idx) => (
            <Tooltip
              key={source.ip}
              label={`${source.count} alerts | ${source.destinations.size} target(s) | ${source.signatures.slice(0, 3).join(', ')}`}
              hasArrow
            >
              <Flex
                justify="space-between"
                align="center"
                p={2}
                borderRadius="8px"
                bg={subtleBg}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ transform: 'translateX(4px)', bg: hoverBg }}
              >
                <Flex align="center" gap={2} flex="1">
                  <Text fontSize="xs" fontWeight="700" color={textSecondary} minW="20px">
                    #{idx + 1}
                  </Text>
                  <Text fontSize="sm" fontWeight="600" color={textPrimary} noOfLines={1}>
                    {source.ip}
                  </Text>
                </Flex>
                <Flex align="center" gap={2}>
                  <Badge colorScheme={getSeverityColor(source.severity)} fontSize="0.65rem">
                    {source.count}
                  </Badge>
                  <Text fontSize="xs" color={textSecondary}>
                    {source.destinations.size} target{source.destinations.size !== 1 ? 's' : ''}
                  </Text>
                </Flex>
              </Flex>
            </Tooltip>
          ))}
        </Stack>
      </Box>

      {/* Summary Stats */}
      <SimpleGrid columns={3} spacing={3}>
        <Box p={2} borderRadius="8px" bg={subtleBg} textAlign="center">
          <Text fontSize="xl" fontWeight="700" color={textPrimary}>
            {threatSources.length}
          </Text>
          <Text fontSize="xs" color={textSecondary}>
            Unique Sources
          </Text>
        </Box>
        <Box p={2} borderRadius="8px" bg={subtleBg} textAlign="center">
          <Text fontSize="xl" fontWeight="700" color={textPrimary}>
            {heatmapData.length}
          </Text>
          <Text fontSize="xs" color={textSecondary}>
            IP Ranges
          </Text>
        </Box>
        <Box p={2} borderRadius="8px" bg={subtleBg} textAlign="center">
          <Text fontSize="xl" fontWeight="700" color={textPrimary}>
            {alerts.length}
          </Text>
          <Text fontSize="xs" color={textSecondary}>
            Total Threats
          </Text>
        </Box>
      </SimpleGrid>
    </Stack>
  );
}
