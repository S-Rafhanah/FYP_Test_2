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
  Grid,
  GridItem,
} from '@chakra-ui/react';

// Enhanced geographic visualization of threat sources - SOC-style
export default function GeoMap({ alerts = [] }) {
  const textPrimary = useColorModeValue('secondaryGray.900', 'white');
  const textSecondary = useColorModeValue('secondaryGray.700', 'whiteAlpha.700');
  const subtleBg = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const hoverBg = useColorModeValue('secondaryGray.200', 'whiteAlpha.200');
  const heatColor = useColorModeValue('red.500', 'red.400');
  const mapBg = useColorModeValue('#1a1d29', '#0b0e1a');
  const gridLine = useColorModeValue('rgba(255,255,255,0.05)', 'rgba(255,255,255,0.03)');

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
      <Box>
        <Flex
          justify="center"
          align="center"
          minH="180px"
          bg={mapBg}
          borderRadius="12px"
          position="relative"
          overflow="hidden"
        >
          {/* Grid background for SOC style */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundImage={`
              linear-gradient(${gridLine} 1px, transparent 1px),
              linear-gradient(90deg, ${gridLine} 1px, transparent 1px)
            `}
            backgroundSize="20px 20px"
            opacity={0.5}
          />
          <Text color="whiteAlpha.600" textAlign="center" position="relative" zIndex={1}>
            Awaiting threat data...
          </Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Stack spacing={4}>
      {/* SOC-Style Heatmap - IP Range Distribution */}
      <Box>
        <Text fontSize="sm" fontWeight="600" color={textPrimary} mb={2}>
          Threat Source Heatmap
        </Text>
        <Box
          bg={mapBg}
          borderRadius="12px"
          p={4}
          position="relative"
          overflow="hidden"
          minH="200px"
        >
          {/* Grid background for SOC style */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundImage={`
              linear-gradient(${gridLine} 1px, transparent 1px),
              linear-gradient(90deg, ${gridLine} 1px, transparent 1px)
            `}
            backgroundSize="20px 20px"
            opacity={0.3}
          />

          {/* Heatmap cells */}
          <Grid
            templateColumns="repeat(4, 1fr)"
            gap={2}
            position="relative"
            zIndex={1}
          >
            {heatmapData.map((item) => {
              const intensity = (item.count / maxCount) * 100;
              const bgOpacity = Math.max(0.3, intensity / 100);

              return (
                <Tooltip
                  key={item.range}
                  label={`${item.count} threat${item.count !== 1 ? 's' : ''} from ${item.range}`}
                  hasArrow
                  bg="gray.900"
                  color="white"
                >
                  <GridItem>
                    <Box
                      p={3}
                      borderRadius="8px"
                      bg="whiteAlpha.50"
                      borderWidth="1px"
                      borderColor="whiteAlpha.100"
                      position="relative"
                      overflow="hidden"
                      cursor="pointer"
                      transition="all 0.2s"
                      _hover={{
                        transform: 'scale(1.05)',
                        borderColor: 'red.400',
                        boxShadow: `0 0 20px rgba(255, 0, 0, ${bgOpacity})`
                      }}
                    >
                      {/* Pulsing heat overlay */}
                      <Box
                        position="absolute"
                        top={0}
                        left={0}
                        right={0}
                        bottom={0}
                        bg="red.500"
                        opacity={bgOpacity}
                        animation={intensity > 70 ? "pulse 2s infinite" : "none"}
                        sx={{
                          "@keyframes pulse": {
                            "0%, 100%": { opacity: bgOpacity },
                            "50%": { opacity: bgOpacity * 0.6 }
                          }
                        }}
                      />

                      {/* Content */}
                      <Flex
                        direction="column"
                        align="center"
                        position="relative"
                        zIndex={1}
                      >
                        <Text
                          fontSize="xs"
                          fontWeight="700"
                          color="white"
                          mb={1}
                          textShadow="0 2px 4px rgba(0,0,0,0.8)"
                        >
                          {item.range}
                        </Text>
                        <Badge
                          colorScheme={intensity > 70 ? 'red' : intensity > 40 ? 'orange' : 'yellow'}
                          fontSize="0.7rem"
                          fontWeight="700"
                        >
                          {item.count} threats
                        </Badge>
                      </Flex>
                    </Box>
                  </GridItem>
                </Tooltip>
              );
            })}
          </Grid>

          {/* Threat level indicator */}
          <Flex justify="flex-end" align="center" gap={2} mt={3} position="relative" zIndex={1}>
            <Text fontSize="xs" color="whiteAlpha.600">Threat Level:</Text>
            <Flex gap={1}>
              <Box w="20px" h="8px" bg="yellow.400" borderRadius="2px" opacity={0.4} />
              <Box w="20px" h="8px" bg="orange.400" borderRadius="2px" opacity={0.6} />
              <Box w="20px" h="8px" bg="red.500" borderRadius="2px" opacity={0.9} />
            </Flex>
          </Flex>
        </Box>
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