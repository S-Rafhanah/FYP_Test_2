// src/pages/networkAdmin/CombinedAlerts.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Spinner,
  useToast,
  Icon,
  HStack,
  Select,
  useColorModeValue,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import { MdRefresh, MdSecurity, MdWarning, MdNetworkCheck } from 'react-icons/md';
import Card from 'components/card/Card';
import { getSuricataAlerts, getZeekLogs } from 'backend_api';
import { formatIP, getIPVersion, getIPVersionColorScheme } from '../../utils/ipFormatter';

export default function CombinedAlerts() {
  const [suricataAlerts, setSuricataAlerts] = useState([]);
  const [zeekLogs, setZeekLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const toast = useToast();

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const cardBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [suricata, zeek] = await Promise.all([
        getSuricataAlerts(limit),
        getZeekLogs(limit)
      ]);
      setSuricataAlerts(suricata || []);
      setZeekLogs(zeek || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast({
        title: 'Failed to fetch alerts',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [limit, toast]);

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000); // 5 seconds
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '—';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return '—';
    }
  };

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

  // Calculate statistics
  const suricataHigh = suricataAlerts.filter(a => a.severity === 1 || a.severity === '1').length;
  const suricataMedium = suricataAlerts.filter(a => a.severity === 2 || a.severity === '2').length;
  const suricataLow = suricataAlerts.filter(a => a.severity === 3 || a.severity === '3').length;

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {/* Header */}
      <Flex mb="20px" justify="space-between" align="center" flexWrap="wrap" gap="10px">
        <Box>
          <Text fontSize="2xl" fontWeight="700" lineHeight="100%" color={textColor}>
            Network Security Alerts
          </Text>
          <Text fontSize="md" color="secondaryGray.600" mt="4px">
            Real-time monitoring from Suricata IDS and Zeek Network Security Monitor
          </Text>
        </Box>
        <HStack spacing="10px">
          <Select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            size="sm"
            w="120px"
          >
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={200}>200 rows</option>
          </Select>
          <Button
            leftIcon={<Icon as={MdRefresh} />}
            colorScheme="brand"
            variant={autoRefresh ? 'solid' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            {autoRefresh ? 'Auto-Refresh' : 'Manual'}
          </Button>
          <Button
            leftIcon={<Icon as={MdRefresh} />}
            onClick={fetchData}
            isLoading={loading}
            size="sm"
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {/* Statistics Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="20px" mb="20px">
        <Card bg={cardBg}>
          <Stat>
            <Flex align="center" justify="space-between">
              <Box>
                <StatLabel fontSize="sm" color="secondaryGray.600">Suricata Alerts</StatLabel>
                <StatNumber fontSize="2xl" color={textColor}>{suricataAlerts.length}</StatNumber>
                <StatHelpText color="red.500">
                  {suricataHigh} High Priority
                </StatHelpText>
              </Box>
              <Icon as={MdSecurity} w="40px" h="40px" color="red.500" />
            </Flex>
          </Stat>
        </Card>

        <Card bg={cardBg}>
          <Stat>
            <Flex align="center" justify="space-between">
              <Box>
                <StatLabel fontSize="sm" color="secondaryGray.600">Zeek Events</StatLabel>
                <StatNumber fontSize="2xl" color={textColor}>{zeekLogs.length}</StatNumber>
                <StatHelpText color="blue.500">
                  Network Activity
                </StatHelpText>
              </Box>
              <Icon as={MdNetworkCheck} w="40px" h="40px" color="blue.500" />
            </Flex>
          </Stat>
        </Card>

        <Card bg={cardBg}>
          <Stat>
            <Flex align="center" justify="space-between">
              <Box>
                <StatLabel fontSize="sm" color="secondaryGray.600">Medium Severity</StatLabel>
                <StatNumber fontSize="2xl" color={textColor}>{suricataMedium}</StatNumber>
                <StatHelpText color="orange.500">
                  Requires Review
                </StatHelpText>
              </Box>
              <Icon as={MdWarning} w="40px" h="40px" color="orange.500" />
            </Flex>
          </Stat>
        </Card>

        <Card bg={cardBg}>
          <Stat>
            <Flex align="center" justify="space-between">
              <Box>
                <StatLabel fontSize="sm" color="secondaryGray.600">Low Severity</StatLabel>
                <StatNumber fontSize="2xl" color={textColor}>{suricataLow}</StatNumber>
                <StatHelpText color="green.500">
                  Informational
                </StatHelpText>
              </Box>
              <Icon as={MdSecurity} w="40px" h="40px" color="green.500" />
            </Flex>
          </Stat>
        </Card>
      </SimpleGrid>

      {/* Tabs for Suricata and Zeek */}
      <Card bg={cardBg}>
        <Tabs colorScheme="brand">
          <TabList>
            <Tab>
              <HStack spacing="5px">
                <Icon as={MdSecurity} />
                <Text>Suricata Alerts ({suricataAlerts.length})</Text>
              </HStack>
            </Tab>
            <Tab>
              <HStack spacing="5px">
                <Icon as={MdNetworkCheck} />
                <Text>Zeek Logs ({zeekLogs.length})</Text>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Suricata Tab */}
            <TabPanel>
              {loading && suricataAlerts.length === 0 ? (
                <Flex justify="center" align="center" minH="300px">
                  <Spinner size="xl" color="brand.500" />
                </Flex>
              ) : suricataAlerts.length === 0 ? (
                <Flex justify="center" align="center" minH="300px">
                  <Text color="secondaryGray.600">No Suricata alerts found</Text>
                </Flex>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th borderColor={borderColor}>Timestamp</Th>
                        <Th borderColor={borderColor}>Signature</Th>
                        <Th borderColor={borderColor}>Severity</Th>
                        <Th borderColor={borderColor}>Source IP</Th>
                        <Th borderColor={borderColor}>Dest IP</Th>
                        <Th borderColor={borderColor}>Dest Port</Th>
                        <Th borderColor={borderColor}>Protocol</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {suricataAlerts.map((alert) => (
                        <Tr key={alert.id}>
                          <Td borderColor={borderColor} fontSize="sm">
                            {formatTimestamp(alert.timestamp)}
                          </Td>
                          <Td borderColor={borderColor} fontSize="sm" maxW="300px" isTruncated>
                            {alert.signature || '—'}
                          </Td>
                          <Td borderColor={borderColor}>
                            <Badge colorScheme={getSeverityColor(alert.severity)}>
                              {getSeverityLabel(alert.severity)}
                            </Badge>
                          </Td>
                          <Td borderColor={borderColor} fontSize="sm" fontWeight="600">
                            <Flex align="center" gap={2}>
                              <Text noOfLines={1} title={alert.src_ip}>
                                {formatIP(alert.src_ip)}
                              </Text>
                              {alert.src_ip && alert.src_ip.length > 20 && (
                                <Badge colorScheme={getIPVersionColorScheme(getIPVersion(alert.src_ip))} fontSize="0.65rem">
                                  {getIPVersion(alert.src_ip)}
                                </Badge>
                              )}
                            </Flex>
                          </Td>
                          <Td borderColor={borderColor} fontSize="sm" fontWeight="600">
                            <Flex align="center" gap={2}>
                              <Text noOfLines={1} title={alert.dest_ip}>
                                {formatIP(alert.dest_ip)}
                              </Text>
                              {alert.dest_ip && alert.dest_ip.length > 20 && (
                                <Badge colorScheme={getIPVersionColorScheme(getIPVersion(alert.dest_ip))} fontSize="0.65rem">
                                  {getIPVersion(alert.dest_ip)}
                                </Badge>
                              )}
                            </Flex>
                          </Td>
                          <Td borderColor={borderColor} fontSize="sm">
                            {alert.dest_port || '—'}
                          </Td>
                          <Td borderColor={borderColor}>
                            <Badge colorScheme="blue" fontSize="0.75rem">
                              {alert.protocol || '—'}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </TabPanel>

            {/* Zeek Tab */}
            <TabPanel>
              {loading && zeekLogs.length === 0 ? (
                <Flex justify="center" align="center" minH="300px">
                  <Spinner size="xl" color="brand.500" />
                </Flex>
              ) : zeekLogs.length === 0 ? (
                <Flex justify="center" align="center" minH="300px">
                  <Text color="secondaryGray.600">No Zeek logs found</Text>
                </Flex>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th borderColor={borderColor}>Timestamp</Th>
                        <Th borderColor={borderColor}>Event Type</Th>
                        <Th borderColor={borderColor}>Service</Th>
                        <Th borderColor={borderColor}>Source IP</Th>
                        <Th borderColor={borderColor}>Dest IP</Th>
                        <Th borderColor={borderColor}>Dest Port</Th>
                        <Th borderColor={borderColor}>Protocol</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {zeekLogs.map((log) => (
                        <Tr key={log.id}>
                          <Td borderColor={borderColor} fontSize="sm">
                            {formatTimestamp(log.timestamp)}
                          </Td>
                          <Td borderColor={borderColor} fontSize="sm">
                            {log.event_type || '—'}
                          </Td>
                          <Td borderColor={borderColor} fontSize="sm">
                            <Badge colorScheme="purple">{log.service || '—'}</Badge>
                          </Td>
                          <Td borderColor={borderColor} fontSize="sm" fontWeight="600">
                            <Flex align="center" gap={2}>
                              <Text noOfLines={1} title={log.src_ip}>
                                {formatIP(log.src_ip)}
                              </Text>
                              {log.src_ip && log.src_ip.length > 20 && (
                                <Badge colorScheme={getIPVersionColorScheme(getIPVersion(log.src_ip))} fontSize="0.65rem">
                                  {getIPVersion(log.src_ip)}
                                </Badge>
                              )}
                            </Flex>
                          </Td>
                          <Td borderColor={borderColor} fontSize="sm" fontWeight="600">
                            <Flex align="center" gap={2}>
                              <Text noOfLines={1} title={log.dest_ip}>
                                {formatIP(log.dest_ip)}
                              </Text>
                              {log.dest_ip && log.dest_ip.length > 20 && (
                                <Badge colorScheme={getIPVersionColorScheme(getIPVersion(log.dest_ip))} fontSize="0.65rem">
                                  {getIPVersion(log.dest_ip)}
                                </Badge>
                              )}
                            </Flex>
                          </Td>
                          <Td borderColor={borderColor} fontSize="sm">
                            {log.dest_port || '—'}
                          </Td>
                          <Td borderColor={borderColor}>
                            <Badge colorScheme="blue" fontSize="0.75rem">
                              {log.proto || '—'}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Card>
    </Box>
  );
}
