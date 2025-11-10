// src/pages/networkAdmin/Alerts.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  useToast,
  Icon,
  Checkbox,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Select,
  HStack,
  VStack,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  IconButton,
  Tooltip,
  Spinner,
} from '@chakra-ui/react';
import {
  MdSearch,
  MdRefresh,
  MdFilterList,
  MdFileDownload,
  MdMoreVert,
  MdCheckCircle,
  MdInfo,
} from 'react-icons/md';
import Card from 'components/card/Card';
import { getSuricataAlerts, getZeekConnections } from '../../backend_api';
import { useAuth } from '../../auth/AuthContext';
import { formatIP, getIPVersion, getIPVersionColorScheme } from '../../utils/ipFormatter';

export default function AlertsPage() {
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Color mode values
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textSecondary = useColorModeValue('secondaryGray.700', 'whiteAlpha.700');
  const cardBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  // Data state
  const [suricataAlerts, setSuricataAlerts] = useState([]);
  const [zeekConnections, setZeekConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // 0 = Suricata, 1 = Zeek

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selection state
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());

  // Alert details drawer
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Alert status management (stored in local state for demo)
  const [alertStatuses, setAlertStatuses] = useState({});

  // Fetch data - Both Suricata and Zeek
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const [suricata, zeek] = await Promise.all([
        getSuricataAlerts(200),
        getZeekConnections(200, 0),
      ]);
      setSuricataAlerts(suricata || []);
      setZeekConnections(zeek?.connections || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      if (!err.message.includes('401') && !err.message.includes('403')) {
        toast({
          title: 'Failed to load data',
          description: err.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast]);

  // Auto-refresh effect
  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh]);

  // Normalize Suricata alerts only (Zeek has its own dedicated page)
  const normalizedAlerts = useMemo(() => {
    return suricataAlerts.map(alert => ({
      id: alert.id,
      source: 'suricata',
      timestamp: alert.timestamp,
      severity: alert.severity || 2,
      signature: alert.signature || 'Unknown Alert',
      src_ip: alert.src_ip,
      src_port: alert.src_port,
      dest_ip: alert.dest_ip,
      dest_port: alert.dest_port,
      protocol: alert.protocol,
      bytes: null,
      rawData: alert,
      status: alertStatuses[`suricata-${alert.id}`] || 'new',
    })).sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [suricataAlerts, alertStatuses]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return normalizedAlerts.filter(alert => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          alert.src_ip?.toLowerCase().includes(query) ||
          alert.dest_ip?.toLowerCase().includes(query) ||
          alert.signature?.toLowerCase().includes(query) ||
          alert.protocol?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Severity filter
      if (severityFilter !== 'all' && String(alert.severity) !== severityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && alert.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [normalizedAlerts, searchQuery, severityFilter, statusFilter]);

  // Helper functions
  const getSeverityColor = (severity) => {
    const sev = String(severity);
    if (sev === '1') return 'red';
    if (sev === '2') return 'orange';
    if (sev === '3') return 'yellow';
    return 'gray';
  };

  const getSeverityLabel = (severity) => {
    const sev = String(severity);
    if (sev === '1') return 'High';
    if (sev === '2') return 'Medium';
    if (sev === '3') return 'Low';
    return 'Unknown';
  };

  const getStatusColor = (status) => {
    if (status === 'resolved') return 'green';
    if (status === 'in_progress') return 'blue';
    return 'gray';
  };

  const getStatusLabel = (status) => {
    if (status === 'resolved') return 'Resolved';
    if (status === 'in_progress') return 'In Progress';
    return 'New';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '—';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return '—';
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  // Alert actions
  const updateAlertStatus = (alertId, source, newStatus) => {
    const key = `${source}-${alertId}`;
    setAlertStatuses(prev => ({ ...prev, [key]: newStatus }));
    toast({
      title: 'Status updated',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleBulkStatusUpdate = (newStatus) => {
    const updates = {};
    selectedAlerts.forEach(alertKey => {
      updates[alertKey] = newStatus;
    });
    setAlertStatuses(prev => ({ ...prev, ...updates }));
    setSelectedAlerts(new Set());
    toast({
      title: `${selectedAlerts.size} alerts updated`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleExport = () => {
    const dataToExport = selectedAlerts.size > 0
      ? filteredAlerts.filter(a => selectedAlerts.has(`${a.source}-${a.id}`))
      : filteredAlerts;

    const csv = [
      ['Timestamp', 'Source', 'Severity', 'Signature', 'Src IP', 'Src Port', 'Dst IP', 'Dst Port', 'Protocol', 'Bytes', 'Status'],
      ...dataToExport.map(a => [
        formatTimestamp(a.timestamp),
        a.source,
        getSeverityLabel(a.severity),
        a.signature,
        a.src_ip || '—',
        a.src_port || '—',
        a.dest_ip || '—',
        a.dest_port || '—',
        a.protocol || '—',
        a.bytes || '—',
        getStatusLabel(a.status),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: `Exported ${dataToExport.length} alerts`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const toggleSelectAlert = (alert) => {
    const key = `${alert.source}-${alert.id}`;
    setSelectedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAlerts.size === filteredAlerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(filteredAlerts.map(a => `${a.source}-${a.id}`)));
    }
  };

  const openAlertDetails = (alert) => {
    setSelectedAlert(alert);
    onOpen();
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Card direction="column" w="100%" px="25px" py="25px" bg={cardBg}>
        {/* Header */}
        <Flex justify="space-between" align="center" mb="20px" flexWrap="wrap" gap={3}>
          <Box>
            <Text color={textColor} fontSize="22px" fontWeight="700" mb="4px">
              IDS Alerts & Network Logs
            </Text>
            <Text color={textSecondary} fontSize="sm">
              Monitor Suricata security alerts and Zeek network connections
            </Text>
          </Box>
          <HStack spacing={2}>
            <Tooltip label={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}>
              <IconButton
                icon={<Icon as={MdRefresh} />}
                onClick={() => setAutoRefresh(!autoRefresh)}
                colorScheme={autoRefresh ? 'green' : 'gray'}
                variant={autoRefresh ? 'solid' : 'outline'}
                size="sm"
              />
            </Tooltip>
            <Button
              leftIcon={<Icon as={MdRefresh} />}
              onClick={fetchData}
              isLoading={loading}
              size="sm"
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>
        </Flex>

        {/* Filters and Search */}
        <Flex mb="20px" gap={3} flexWrap="wrap" align="center">
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search by IP, signature..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>

          <Select
            maxW="150px"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="1">High</option>
            <option value="2">Medium</option>
            <option value="3">Low</option>
          </Select>

          <Select
            maxW="150px"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </Select>

          <Text color={textSecondary} fontSize="sm" ml="auto">
            {filteredAlerts.length} alerts
          </Text>
        </Flex>

        {/* Bulk Actions */}
        {selectedAlerts.size > 0 && (
          <Flex mb="15px" gap={2} align="center" p={3} bg={hoverBg} borderRadius="md">
            <Text fontSize="sm" fontWeight="600" color={textColor}>
              {selectedAlerts.size} selected
            </Text>
            <Button size="sm" onClick={() => handleBulkStatusUpdate('in_progress')}>
              Mark In Progress
            </Button>
            <Button size="sm" onClick={() => handleBulkStatusUpdate('resolved')}>
              Mark Resolved
            </Button>
            <Button
              size="sm"
              leftIcon={<Icon as={MdFileDownload} />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedAlerts(new Set())}>
              Clear Selection
            </Button>
          </Flex>
        )}

        {/* Tabs for Suricata vs Zeek */}
        <Tabs index={activeTab} onChange={setActiveTab} colorScheme="brand" mb="20px">
          <TabList>
            <Tab>
              <Flex align="center" gap={2}>
                <Text>Suricata Alerts</Text>
                <Badge colorScheme="purple">{filteredAlerts.length}</Badge>
              </Flex>
            </Tab>
            <Tab>
              <Flex align="center" gap={2}>
                <Text>Zeek Connections</Text>
                <Badge colorScheme="cyan">{zeekConnections.length}</Badge>
              </Flex>
            </Tab>
            <Tab>
              <Flex align="center" gap={2}>
                <Text>All Logs</Text>
                <Badge colorScheme="green">{filteredAlerts.length + zeekConnections.length}</Badge>
              </Flex>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Suricata Alerts Tab */}
            <TabPanel px={0}>
              <Box overflowX="auto">
          {loading && filteredAlerts.length === 0 ? (
            <Flex justify="center" align="center" minH="200px">
              <Spinner size="lg" />
            </Flex>
          ) : filteredAlerts.length === 0 ? (
            <Flex justify="center" align="center" minH="200px">
              <Text color={textSecondary}>No alerts found</Text>
            </Flex>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>
                    <Checkbox
                      isChecked={selectedAlerts.size === filteredAlerts.length && filteredAlerts.length > 0}
                      isIndeterminate={selectedAlerts.size > 0 && selectedAlerts.size < filteredAlerts.length}
                      onChange={toggleSelectAll}
                    />
                  </Th>
                  <Th>Timestamp</Th>
                  <Th>Severity</Th>
                  <Th>Signature</Th>
                  <Th>Src IP</Th>
                  <Th>Src Port</Th>
                  <Th>Dst IP</Th>
                  <Th>Dst Port</Th>
                  <Th>Protocol</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredAlerts.slice(0, 100).map((alert) => {
                  const isSelected = selectedAlerts.has(`${alert.source}-${alert.id}`);
                  return (
                    <Tr
                      key={`${alert.source}-${alert.id}`}
                      _hover={{ bg: hoverBg }}
                      bg={isSelected ? hoverBg : 'transparent'}
                      cursor="pointer"
                    >
                      <Td>
                        <Checkbox
                          isChecked={isSelected}
                          onChange={() => toggleSelectAlert(alert)}
                        />
                      </Td>
                      <Td fontSize="xs" onClick={() => openAlertDetails(alert)}>
                        {formatTimestamp(alert.timestamp)}
                      </Td>
                      <Td onClick={() => openAlertDetails(alert)}>
                        <Badge colorScheme={getSeverityColor(alert.severity)}>
                          {getSeverityLabel(alert.severity)}
                        </Badge>
                      </Td>
                      <Td fontSize="sm" onClick={() => openAlertDetails(alert)} maxW="200px" isTruncated>
                        {alert.signature}
                      </Td>
                      <Td fontSize="sm" onClick={() => openAlertDetails(alert)}>
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
                      <Td fontSize="sm" onClick={() => openAlertDetails(alert)}>
                        {alert.src_port || '—'}
                      </Td>
                      <Td fontSize="sm" onClick={() => openAlertDetails(alert)}>
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
                      <Td fontSize="sm" onClick={() => openAlertDetails(alert)}>
                        {alert.dest_port || '—'}
                      </Td>
                      <Td fontSize="sm" onClick={() => openAlertDetails(alert)}>
                        {alert.protocol || '—'}
                      </Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(alert.status)}>
                          {getStatusLabel(alert.status)}
                        </Badge>
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<Icon as={MdMoreVert} />}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            <MenuItem
                              icon={<Icon as={MdInfo} />}
                              onClick={() => openAlertDetails(alert)}
                            >
                              View Details
                            </MenuItem>
                            <MenuItem
                              onClick={() => updateAlertStatus(alert.id, alert.source, 'in_progress')}
                            >
                              Mark In Progress
                            </MenuItem>
                            <MenuItem
                              icon={<Icon as={MdCheckCircle} />}
                              onClick={() => updateAlertStatus(alert.id, alert.source, 'resolved')}
                            >
                              Mark Resolved
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
          {filteredAlerts.length > 100 && (
            <Text mt={3} fontSize="sm" color={textSecondary} textAlign="center">
              Showing 100 of {filteredAlerts.length} alerts. Use filters to refine results.
            </Text>
          )}
        </Box>
      </TabPanel>

      {/* Zeek Connections Tab */}
      <TabPanel px={0}>
        <Box overflowX="auto">
          {loading && zeekConnections.length === 0 ? (
            <Flex justify="center" align="center" minH="200px">
              <Spinner size="lg" />
            </Flex>
          ) : zeekConnections.length === 0 ? (
            <Flex justify="center" align="center" minH="200px">
              <Text color={textSecondary}>No Zeek connections found</Text>
            </Flex>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Timestamp</Th>
                  <Th>Source IP</Th>
                  <Th>Src Port</Th>
                  <Th>Destination IP</Th>
                  <Th>Dst Port</Th>
                  <Th>Protocol</Th>
                  <Th>Bytes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {zeekConnections.slice(0, 100).map((conn) => (
                  <Tr key={conn.id} _hover={{ bg: hoverBg }}>
                    <Td fontSize="sm">{formatTimestamp(conn.timestamp)}</Td>
                    <Td fontSize="sm" fontWeight="600">
                      <Flex align="center" gap={2}>
                        <Text noOfLines={1} title={conn.source_ip}>
                          {formatIP(conn.source_ip)}
                        </Text>
                        {conn.source_ip && conn.source_ip.length > 20 && (
                          <Badge colorScheme={getIPVersionColorScheme(getIPVersion(conn.source_ip))} fontSize="0.65rem">
                            {getIPVersion(conn.source_ip)}
                          </Badge>
                        )}
                      </Flex>
                    </Td>
                    <Td fontSize="sm">{conn.source_port}</Td>
                    <Td fontSize="sm" fontWeight="600">
                      <Flex align="center" gap={2}>
                        <Text noOfLines={1} title={conn.destination_ip}>
                          {formatIP(conn.destination_ip)}
                        </Text>
                        {conn.destination_ip && conn.destination_ip.length > 20 && (
                          <Badge colorScheme={getIPVersionColorScheme(getIPVersion(conn.destination_ip))} fontSize="0.65rem">
                            {getIPVersion(conn.destination_ip)}
                          </Badge>
                        )}
                      </Flex>
                    </Td>
                    <Td fontSize="sm">{conn.destination_port}</Td>
                    <Td>
                      <Badge colorScheme="blue" fontSize="0.75rem">
                        {conn.protocol}
                      </Badge>
                    </Td>
                    <Td fontSize="sm">{formatBytes(conn.bytes)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
          {zeekConnections.length > 100 && (
            <Text mt={3} fontSize="sm" color={textSecondary} textAlign="center">
              Showing 100 of {zeekConnections.length} connections.
            </Text>
          )}
        </Box>
      </TabPanel>

      {/* All Logs Tab - Combined View */}
      <TabPanel px={0}>
        <Box overflowX="auto">
          {loading && filteredAlerts.length === 0 && zeekConnections.length === 0 ? (
            <Flex justify="center" align="center" minH="200px">
              <Spinner size="lg" />
            </Flex>
          ) : filteredAlerts.length === 0 && zeekConnections.length === 0 ? (
            <Flex justify="center" align="center" minH="200px">
              <Text color={textSecondary}>No logs found</Text>
            </Flex>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Source</Th>
                  <Th>Timestamp</Th>
                  <Th>Type</Th>
                  <Th>Source IP</Th>
                  <Th>Src Port</Th>
                  <Th>Destination IP</Th>
                  <Th>Dst Port</Th>
                  <Th>Protocol</Th>
                  <Th>Bytes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {/* Render Suricata Alerts */}
                {filteredAlerts.slice(0, 50).map((alert) => (
                  <Tr key={`suricata-${alert.id}`} _hover={{ bg: hoverBg }}>
                    <Td>
                      <Badge colorScheme="purple" fontSize="0.75rem">
                        SURICATA
                      </Badge>
                    </Td>
                    <Td fontSize="sm">{formatTimestamp(alert.timestamp)}</Td>
                    <Td fontSize="xs" maxW="200px" isTruncated>
                      <Badge colorScheme={getSeverityColor(alert.severity)} mr={2}>
                        {getSeverityLabel(alert.severity)}
                      </Badge>
                      {alert.signature}
                    </Td>
                    <Td fontSize="sm" fontWeight="600">
                      <Flex align="center" gap={2}>
                        <Text noOfLines={1} title={alert.src_ip}>
                          {formatIP(alert.src_ip)}
                        </Text>
                        {alert.src_ip && alert.src_ip.length > 20 && (
                          <Badge colorScheme={getIPVersionColorScheme(getIPVersion(alert.src_ip))} fontSize="0.6rem">
                            {getIPVersion(alert.src_ip)}
                          </Badge>
                        )}
                      </Flex>
                    </Td>
                    <Td fontSize="sm">{alert.src_port || '—'}</Td>
                    <Td fontSize="sm" fontWeight="600">
                      <Flex align="center" gap={2}>
                        <Text noOfLines={1} title={alert.dest_ip}>
                          {formatIP(alert.dest_ip)}
                        </Text>
                        {alert.dest_ip && alert.dest_ip.length > 20 && (
                          <Badge colorScheme={getIPVersionColorScheme(getIPVersion(alert.dest_ip))} fontSize="0.6rem">
                            {getIPVersion(alert.dest_ip)}
                          </Badge>
                        )}
                      </Flex>
                    </Td>
                    <Td fontSize="sm">{alert.dest_port || '—'}</Td>
                    <Td>
                      <Badge colorScheme="blue" fontSize="0.75rem">
                        {alert.protocol || '—'}
                      </Badge>
                    </Td>
                    <Td fontSize="sm">—</Td>
                  </Tr>
                ))}
                {/* Render Zeek Connections */}
                {zeekConnections.slice(0, 50).map((conn) => (
                  <Tr key={`zeek-${conn.id}`} _hover={{ bg: hoverBg }}>
                    <Td>
                      <Badge colorScheme="cyan" fontSize="0.75rem">
                        ZEEK
                      </Badge>
                    </Td>
                    <Td fontSize="sm">{formatTimestamp(conn.timestamp)}</Td>
                    <Td fontSize="sm" color={textSecondary}>Connection</Td>
                    <Td fontSize="sm" fontWeight="600">
                      <Flex align="center" gap={2}>
                        <Text noOfLines={1} title={conn.source_ip}>
                          {formatIP(conn.source_ip)}
                        </Text>
                        {conn.source_ip && conn.source_ip.length > 20 && (
                          <Badge colorScheme={getIPVersionColorScheme(getIPVersion(conn.source_ip))} fontSize="0.6rem">
                            {getIPVersion(conn.source_ip)}
                          </Badge>
                        )}
                      </Flex>
                    </Td>
                    <Td fontSize="sm">{conn.source_port}</Td>
                    <Td fontSize="sm" fontWeight="600">
                      <Flex align="center" gap={2}>
                        <Text noOfLines={1} title={conn.destination_ip}>
                          {formatIP(conn.destination_ip)}
                        </Text>
                        {conn.destination_ip && conn.destination_ip.length > 20 && (
                          <Badge colorScheme={getIPVersionColorScheme(getIPVersion(conn.destination_ip))} fontSize="0.6rem">
                            {getIPVersion(conn.destination_ip)}
                          </Badge>
                        )}
                      </Flex>
                    </Td>
                    <Td fontSize="sm">{conn.destination_port}</Td>
                    <Td>
                      <Badge colorScheme="blue" fontSize="0.75rem">
                        {conn.protocol}
                      </Badge>
                    </Td>
                    <Td fontSize="sm">{formatBytes(conn.bytes)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
          {(filteredAlerts.length + zeekConnections.length) > 100 && (
            <Text mt={3} fontSize="sm" color={textSecondary} textAlign="center">
              Showing up to 100 combined logs ({filteredAlerts.length} alerts + {zeekConnections.length} connections).
            </Text>
          )}
        </Box>
      </TabPanel>
    </TabPanels>
  </Tabs>
      </Card>

      {/* Alert Details Drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">
            Alert Details
          </DrawerHeader>

          <DrawerBody>
            {selectedAlert && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="600" color={textSecondary} mb={1}>
                    Source
                  </Text>
                  <Badge colorScheme={selectedAlert.source === 'suricata' ? 'purple' : 'cyan'}>
                    {selectedAlert.source.toUpperCase()}
                  </Badge>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={textSecondary} mb={1}>
                    Severity
                  </Text>
                  <Badge colorScheme={getSeverityColor(selectedAlert.severity)}>
                    {getSeverityLabel(selectedAlert.severity)}
                  </Badge>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={textSecondary} mb={1}>
                    Status
                  </Text>
                  <Badge colorScheme={getStatusColor(selectedAlert.status)}>
                    {getStatusLabel(selectedAlert.status)}
                  </Badge>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={textSecondary} mb={1}>
                    Timestamp
                  </Text>
                  <Text fontSize="sm">{formatTimestamp(selectedAlert.timestamp)}</Text>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={textSecondary} mb={1}>
                    Signature / Description
                  </Text>
                  <Text fontSize="sm">{selectedAlert.signature}</Text>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={textSecondary} mb={1}>
                    Source IP:Port
                  </Text>
                  <Flex align="center" gap={2}>
                    <Text fontSize="sm" title={selectedAlert.src_ip}>
                      {formatIP(selectedAlert.src_ip)}:{selectedAlert.src_port || '—'}
                    </Text>
                    {selectedAlert.src_ip && selectedAlert.src_ip.length > 20 && (
                      <Badge colorScheme={getIPVersionColorScheme(getIPVersion(selectedAlert.src_ip))} fontSize="0.65rem">
                        {getIPVersion(selectedAlert.src_ip)}
                      </Badge>
                    )}
                  </Flex>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={textSecondary} mb={1}>
                    Destination IP:Port
                  </Text>
                  <Flex align="center" gap={2}>
                    <Text fontSize="sm" title={selectedAlert.dest_ip}>
                      {formatIP(selectedAlert.dest_ip)}:{selectedAlert.dest_port || '—'}
                    </Text>
                    {selectedAlert.dest_ip && selectedAlert.dest_ip.length > 20 && (
                      <Badge colorScheme={getIPVersionColorScheme(getIPVersion(selectedAlert.dest_ip))} fontSize="0.65rem">
                        {getIPVersion(selectedAlert.dest_ip)}
                      </Badge>
                    )}
                  </Flex>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={textSecondary} mb={1}>
                    Protocol
                  </Text>
                  <Text fontSize="sm">{selectedAlert.protocol || '—'}</Text>
                </Box>

                {selectedAlert.bytes && (
                  <Box>
                    <Text fontSize="sm" fontWeight="600" color={textSecondary} mb={1}>
                      Bytes Transferred
                    </Text>
                    <Text fontSize="sm">{formatBytes(selectedAlert.bytes)}</Text>
                  </Box>
                )}

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={textSecondary} mb={2}>
                    Raw Event Data
                  </Text>
                  <Box
                    p={3}
                    bg={hoverBg}
                    borderRadius="md"
                    fontSize="xs"
                    fontFamily="monospace"
                    overflowX="auto"
                  >
                    <pre>{JSON.stringify(selectedAlert.rawData, null, 2)}</pre>
                  </Box>
                </Box>

                <HStack spacing={2} pt={4}>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => {
                      updateAlertStatus(selectedAlert.id, selectedAlert.source, 'in_progress');
                      onClose();
                    }}
                  >
                    Mark In Progress
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="green"
                    onClick={() => {
                      updateAlertStatus(selectedAlert.id, selectedAlert.source, 'resolved');
                      onClose();
                    }}
                  >
                    Mark Resolved
                  </Button>
                </HStack>
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
