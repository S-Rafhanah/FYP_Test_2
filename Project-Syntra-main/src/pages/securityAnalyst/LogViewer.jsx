// src/pages/securityAnalyst/LogViewer.jsx
import React, { useEffect, useState } from "react";
import {
  Badge, Box, Button, Flex, HStack, IconButton, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter,
  ModalHeader, ModalOverlay, Select, Table, Tbody, Td, Text,
  Th, Thead, Tr, useColorModeValue, useToast, VStack, Icon,
  InputGroup, InputLeftElement, Code, Collapse, FormControl,
  FormLabel, Tabs, TabList, Tab, TabPanels, TabPanel,
} from "@chakra-ui/react";
import {
  FiRefreshCw, FiSearch, FiDownload, FiEye, FiFilter, FiX,
} from "react-icons/fi";
import { getZeekLogs, getZeekConnections } from "../../backend_api";
import { useAuth } from "../../auth/AuthContext";

export default function LogViewer() {
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [zeekLogs, setZeekLogs] = useState([]);
  const [zeekConnections, setZeekConnections] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Modal State
  const [viewModal, setViewModal] = useState({ isOpen: false, log: null });

  const cardBg = useColorModeValue("white", "navy.800");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const headerBg = useColorModeValue("gray.50", "navy.900");
  const codeBg = useColorModeValue("gray.50", "gray.900");

  const fetchLogs = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [logs, connections] = await Promise.all([
        getZeekLogs(100).catch(() => []),
        getZeekConnections(100, 0).catch(() => ({ hits: [] })),
      ]);

      setZeekLogs(logs || []);
      setZeekConnections(connections?.hits || []);
      setFilteredLogs(logs || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      toast({
        title: "Failed to load logs",
        status: "error",
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Apply filters
  useEffect(() => {
    const currentLogs = activeTab === 0 ? zeekLogs : zeekConnections;
    let result = [...currentLogs];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (log) =>
          log["id.orig_h"]?.toLowerCase().includes(term) ||
          log["id.resp_h"]?.toLowerCase().includes(term) ||
          log.src_ip?.toLowerCase().includes(term) ||
          log.dest_ip?.toLowerCase().includes(term) ||
          log.proto?.toLowerCase().includes(term)
      );
    }

    // Protocol filter
    if (protocolFilter) {
      result = result.filter((log) => log.proto === protocolFilter);
    }

    setFilteredLogs(result);
  }, [searchTerm, protocolFilter, zeekLogs, zeekConnections, activeTab]);

  // View Log Details
  const handleViewLog = (log) => {
    setViewModal({ isOpen: true, log });
  };

  // Export logs to CSV
  const handleExportCSV = () => {
    try {
      const logs = activeTab === 0 ? zeekLogs : zeekConnections;
      if (logs.length === 0) {
        toast({
          title: "No logs to export",
          status: "warning",
          duration: 2000,
        });
        return;
      }

      // Get all unique keys
      const keys = new Set();
      logs.forEach((log) => {
        Object.keys(log).forEach((k) => keys.add(k));
      });
      const headers = Array.from(keys);

      // Build CSV
      const csvRows = [];
      csvRows.push(headers.join(","));

      logs.forEach((log) => {
        const values = headers.map((header) => {
          const val = log[header];
          if (val === null || val === undefined) return "";
          // Escape quotes and wrap in quotes
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(","));
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zeek_logs_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Logs exported successfully",
        status: "success",
        duration: 2000,
      });
    } catch (err) {
      console.error("Export error:", err);
      toast({
        title: "Failed to export logs",
        status: "error",
        duration: 2000,
      });
    }
  };

  // Export logs to JSON
  const handleExportJSON = () => {
    try {
      const logs = activeTab === 0 ? zeekLogs : zeekConnections;
      if (logs.length === 0) {
        toast({
          title: "No logs to export",
          status: "warning",
          duration: 2000,
        });
        return;
      }

      const jsonContent = JSON.stringify(logs, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zeek_logs_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Logs exported successfully",
        status: "success",
        duration: 2000,
      });
    } catch (err) {
      console.error("Export error:", err);
      toast({
        title: "Failed to export logs",
        status: "error",
        duration: 2000,
      });
    }
  };

  return (
    <Box>
      {/* Header */}
      <Flex gap={3} align="center" mb={6}>
        <Text fontSize="2xl" fontWeight="bold">
          Network Log Viewer
        </Text>
        <HStack ms="auto" spacing={2}>
          <Text fontSize="xs" color="gray.500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Text>
          <Button
            size="sm"
            leftIcon={<FiDownload />}
            onClick={handleExportCSV}
            colorScheme="green"
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            leftIcon={<FiDownload />}
            onClick={handleExportJSON}
            colorScheme="blue"
          >
            Export JSON
          </Button>
          <IconButton
            aria-label="Toggle Filters"
            icon={<FiFilter />}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            colorScheme={showFilters ? "brand" : "gray"}
          />
          <IconButton
            aria-label="Refresh"
            icon={<FiRefreshCw />}
            size="sm"
            isLoading={loading}
            onClick={fetchLogs}
          />
        </HStack>
      </Flex>

      {/* Search Bar */}
      <Box mb={4}>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search by IP address or protocol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            bg={cardBg}
          />
          {searchTerm && (
            <IconButton
              aria-label="Clear search"
              icon={<FiX />}
              size="sm"
              onClick={() => setSearchTerm("")}
              ml={2}
            />
          )}
        </InputGroup>
      </Box>

      {/* Advanced Filters */}
      <Collapse in={showFilters} animateOpacity>
        <Box
          bg={cardBg}
          borderWidth="1px"
          borderColor={border}
          borderRadius="md"
          p={4}
          mb={4}
        >
          <HStack spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm">Protocol</FormLabel>
              <Select
                placeholder="All Protocols"
                value={protocolFilter}
                onChange={(e) => setProtocolFilter(e.target.value)}
                size="sm"
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="icmp">ICMP</option>
              </Select>
            </FormControl>

            <Button
              size="sm"
              colorScheme="red"
              variant="ghost"
              onClick={() => {
                setProtocolFilter("");
                setSearchTerm("");
              }}
            >
              Clear Filters
            </Button>
          </HStack>
        </Box>
      </Collapse>

      {/* Tabs for Log Types */}
      <Tabs
        colorScheme="brand"
        onChange={(index) => setActiveTab(index)}
        mb={4}
      >
        <TabList>
          <Tab>General Logs ({zeekLogs.length})</Tab>
          <Tab>Connection Logs ({zeekConnections.length})</Tab>
        </TabList>

        <TabPanels>
          {/* General Logs Tab */}
          <TabPanel px={0}>
            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={border}
              borderRadius="16px"
              overflowX="auto"
            >
              <Table variant="simple" size="sm">
                <Thead bg={headerBg}>
                  <Tr>
                    <Th>Timestamp</Th>
                    <Th>Source IP</Th>
                    <Th>Source Port</Th>
                    <Th>Dest IP</Th>
                    <Th>Dest Port</Th>
                    <Th>Protocol</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log, idx) => (
                      <Tr key={idx}>
                        <Td fontSize="sm" whiteSpace="nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </Td>
                        <Td fontSize="sm">{log["id.orig_h"] || log.src_ip || "N/A"}</Td>
                        <Td fontSize="sm">{log["id.orig_p"] || log.src_port || "N/A"}</Td>
                        <Td fontSize="sm">{log["id.resp_h"] || log.dest_ip || "N/A"}</Td>
                        <Td fontSize="sm">{log["id.resp_p"] || log.dest_port || "N/A"}</Td>
                        <Td>
                          <Badge colorScheme="blue" fontSize="xs">
                            {log.proto || "TCP"}
                          </Badge>
                        </Td>
                        <Td>
                          <IconButton
                            aria-label="View details"
                            icon={<FiEye />}
                            size="sm"
                            onClick={() => handleViewLog(log)}
                          />
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={7} textAlign="center" py={8} color="gray.500">
                        No logs found
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </Box>
          </TabPanel>

          {/* Connection Logs Tab */}
          <TabPanel px={0}>
            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={border}
              borderRadius="16px"
              overflowX="auto"
            >
              <Table variant="simple" size="sm">
                <Thead bg={headerBg}>
                  <Tr>
                    <Th>Timestamp</Th>
                    <Th>Source</Th>
                    <Th>Destination</Th>
                    <Th>Protocol</Th>
                    <Th>Duration</Th>
                    <Th>Bytes</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log, idx) => (
                      <Tr key={idx}>
                        <Td fontSize="sm" whiteSpace="nowrap">
                          {new Date(log.timestamp || log.ts).toLocaleString()}
                        </Td>
                        <Td fontSize="sm">
                          {log["id.orig_h"]}:{log["id.orig_p"]}
                        </Td>
                        <Td fontSize="sm">
                          {log["id.resp_h"]}:{log["id.resp_p"]}
                        </Td>
                        <Td>
                          <Badge colorScheme="purple" fontSize="xs">
                            {log.proto || "TCP"}
                          </Badge>
                        </Td>
                        <Td fontSize="sm">
                          {log.duration ? `${log.duration.toFixed(2)}s` : "N/A"}
                        </Td>
                        <Td fontSize="sm">
                          {log.orig_bytes || log.resp_bytes
                            ? `${log.orig_bytes || 0} / ${log.resp_bytes || 0}`
                            : "N/A"}
                        </Td>
                        <Td>
                          <IconButton
                            aria-label="View details"
                            icon={<FiEye />}
                            size="sm"
                            onClick={() => handleViewLog(log)}
                          />
                        </Td>
                      </Tr>
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={7} textAlign="center" py={8} color="gray.500">
                        No connection logs found
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* View Log Details Modal */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, log: null })}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent maxW="800px">
          <ModalHeader>Raw Log Entry</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {viewModal.log && (
              <Box>
                <Text fontWeight="semibold" mb={2}>
                  Complete Log Data:
                </Text>
                <Box
                  bg={codeBg}
                  p={4}
                  borderRadius="md"
                  overflowX="auto"
                  maxH="500px"
                  overflowY="auto"
                >
                  <Code
                    display="block"
                    whiteSpace="pre"
                    fontSize="sm"
                    bg="transparent"
                  >
                    {JSON.stringify(viewModal.log, null, 2)}
                  </Code>
                </Box>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={() => setViewModal({ isOpen: false, log: null })}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
