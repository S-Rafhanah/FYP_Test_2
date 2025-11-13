// src/pages/securityAnalyst/AlertsManagement.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Badge, Box, Button, Flex, HStack, IconButton, Input,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter,
  ModalHeader, ModalOverlay, Select, Table, Tbody, Td, Text,
  Textarea, Th, Thead, Tr, useColorModeValue, useToast, VStack,
  Icon, InputGroup, InputLeftElement, Tag, TagLabel, TagCloseButton,
  FormControl, FormLabel, Collapse, Tabs, TabList, Tab, TabPanels, TabPanel,
  Alert, AlertIcon, AlertDescription,
} from "@chakra-ui/react";
import {
  FiRefreshCw, FiSearch, FiEdit, FiArchive, FiEye,
  FiFilter, FiX,
} from "react-icons/fi";
import {
  getSuricataAlerts,
  getZeekLogs,
  saveAlertMetadata,
  saveAlertMetadataBulk,
  getAlertMetadata,
  getAllAlertMetadata
} from "../../backend_api";
import { useAuth } from "../../auth/AuthContext";

// Simple hash function to create unique identifiers
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

// Generate stable ID from alert properties (not index-based)
// IDs are based ONLY on signature + IPs, NOT timestamps
// This ensures all alerts of the same type share the same metadata
const generateStableAlertId = (alert, source) => {
  // Use _id if available from backend
  if (alert._id) return alert._id;

  // Otherwise create stable ID from alert properties (WITHOUT timestamp)
  if (source === "Suricata") {
    const signature = alert.alert?.signature || alert.signature || "unknown";
    const srcIp = alert.src_ip || "unknown";
    const destIp = alert.dest_ip || "unknown";
    const srcPort = alert.src_port || "0";
    const destPort = alert.dest_port || "0";

    // Create string for hashing (NO TIMESTAMP)
    const str = `${srcIp}-${srcPort}-${destIp}-${destPort}-${signature}`;
    const hash = simpleHash(str);
    return `suricata-${hash}`.substring(0, 100);
  } else {
    // Zeek logs
    const origH = alert["id.orig_h"] || "unknown";
    const respH = alert["id.resp_h"] || "unknown";
    const origP = alert["id.orig_p"] || "0";
    const respP = alert["id.resp_p"] || "0";
    const service = alert.service || alert.proto || "unknown";

    const str = `${origH}-${origP}-${respH}-${respP}-${service}`;
    const hash = simpleHash(str);
    return `zeek-${hash}`.substring(0, 100);
  }
};

// Get unique ID to handle duplicates
const getUniqueId = (() => {
  const seen = new Set();
  return (baseId) => {
    let id = baseId;
    let counter = 0;
    while (seen.has(id)) {
      counter++;
      id = `${baseId}-${counter}`;
    }
    seen.add(id);
    return id;
  };
})();

// Alert severity badge helper
const getSeverityBadge = (severity) => {
  const colors = {
    critical: "red",
    high: "orange",
    medium: "yellow",
    low: "blue",
    info: "gray",
    1: "red",
    2: "orange",
    3: "yellow",
  };
  return colors[severity] || "gray";
};

export default function AlertsManagement() {
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suricataAlerts, setSuricataAlerts] = useState([]);
  const [zeekLogs, setZeekLogs] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [alertNameFilter, setAlertNameFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [consolidateAlerts, setConsolidateAlerts] = useState(true); // Default to consolidated view
  const [alertLimit, setAlertLimit] = useState(50); // Default to 50 for better performance

  // Modal State
  const [viewModal, setViewModal] = useState({ isOpen: false, alert: null });
  const [updateModal, setUpdateModal] = useState({
    isOpen: false,
    alert: null,
    classification: "",
    status: "",
    tags: [],
    triageLevel: "",
    notes: "",
  });
  const [archiveModal, setArchiveModal] = useState({
    isOpen: false,
    alert: null,
    reason: "",
  });

  const cardBg = useColorModeValue("white", "navy.800");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const headerBg = useColorModeValue("gray.50", "navy.900");

  const fetchAlerts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);

      // Fetch alerts and saved metadata in parallel
      const [suricata, zeek, allMetadata] = await Promise.all([
        getSuricataAlerts(alertLimit).catch(() => []),
        getZeekLogs(alertLimit).catch(() => []),
        getAllAlertMetadata().catch(() => [])
      ]);

      // Create metadata lookup object
      const metadataObj = {};
      (allMetadata || []).forEach(item => {
        metadataObj[item.alert_id] = item;
      });

      console.log(`[Load] Loaded ${allMetadata?.length || 0} saved alert metadata records from database`);
      if (allMetadata && allMetadata.length > 0) {
        console.log(`[Load] Sample IDs from DB:`, allMetadata.slice(0, 3).map(m => m.alert_id.substring(0, 60)));
      }

      // Enrich Suricata alerts with saved metadata from database
      const enrichedSuricata = (suricata || []).map((alert, index) => {
        const baseId = generateStableAlertId(alert, "Suricata");
        const id = getUniqueId(baseId);
        const savedMetadata = metadataObj[id] || metadataObj[baseId];

        if (savedMetadata) {
          console.log(`📋 [Load] Suricata alert #${index} ID: ${id.substring(0, 60)} - Found metadata!`);
        } else if (index < 3) {
          // Log first 3 alerts for debugging
          console.log(`[Load] Suricata alert #${index} ID: ${id.substring(0, 60)} - No metadata`);
        }

        // Safely parse tags from saved metadata
        let parsedTags = alert.tags || [];
        if (savedMetadata?.tags) {
          try {
            parsedTags = typeof savedMetadata.tags === 'string' && savedMetadata.tags.trim()
              ? JSON.parse(savedMetadata.tags)
              : savedMetadata.tags;
          } catch (e) {
            console.warn(`Failed to parse tags for alert ${id}:`, e);
            parsedTags = alert.tags || [];
          }
        }

        return {
          ...alert,
          id,
          source: "Suricata",
          signature: alert.alert?.signature || alert.signature || "Unknown",
          severity: alert.alert?.severity || alert.severity || 3,
          classification: savedMetadata?.classification || alert.classification || "Unclassified",
          status: savedMetadata?.status || alert.status || "New",
          tags: parsedTags,
          triageLevel: savedMetadata?.triageLevel || alert.triageLevel || "Medium",
          notes: savedMetadata?.notes || alert.notes || "",
          archived: savedMetadata?.archived || alert.archived || false,
          archiveReason: savedMetadata?.archiveReason || alert.archiveReason || "",
        };
      });

      // Enrich Zeek logs with saved metadata
      const enrichedZeek = (zeek || []).map((log) => {
        const baseId = generateStableAlertId(log, "Zeek");
        const id = getUniqueId(baseId);
        const savedMetadata = metadataObj[id] || metadataObj[baseId];

        // Safely parse tags from saved metadata
        let parsedTags = log.tags || [];
        if (savedMetadata?.tags) {
          try {
            parsedTags = typeof savedMetadata.tags === 'string' && savedMetadata.tags.trim()
              ? JSON.parse(savedMetadata.tags)
              : savedMetadata.tags;
          } catch (e) {
            console.warn(`Failed to parse tags for log ${id}:`, e);
            parsedTags = log.tags || [];
          }
        }

        return {
          ...log,
          id,
          source: "Zeek",
          signature: log.service || log.proto || "Network Activity",
          severity: 3,
          classification: savedMetadata?.classification || log.classification || "Network Log",
          status: savedMetadata?.status || log.status || "New",
          tags: parsedTags,
          triageLevel: savedMetadata?.triageLevel || log.triageLevel || "Low",
          notes: savedMetadata?.notes || log.notes || "",
          archived: savedMetadata?.archived || log.archived || false,
          archiveReason: savedMetadata?.archiveReason || log.archiveReason || "",
        };
      });

      setSuricataAlerts(enrichedSuricata);
      setZeekLogs(enrichedZeek);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      toast({
        title: "Failed to load alerts",
        status: "error",
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast, alertLimit]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Combine all alerts
  const allAlerts = useMemo(() => {
    return [...suricataAlerts, ...zeekLogs]
      .filter(a => !a.archived)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [suricataAlerts, zeekLogs]);

  // Get unique alert signatures for filter dropdown
  const uniqueSignatures = useMemo(() => {
    return [...new Set(allAlerts.map(a => a.signature))].sort();
  }, [allAlerts]);

  // Apply filters
  const filterAlerts = useCallback((alerts) => {
    let result = alerts.filter(a => !a.archived);

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.src_ip?.toLowerCase().includes(term) ||
          a.dest_ip?.toLowerCase().includes(term) ||
          a["id.orig_h"]?.toLowerCase().includes(term) ||
          a["id.resp_h"]?.toLowerCase().includes(term) ||
          a.signature?.toLowerCase().includes(term)
      );
    }

    // Alert name/signature filter
    if (alertNameFilter) {
      result = result.filter((a) => a.signature === alertNameFilter);
    }

    // Severity filter
    if (severityFilter) {
      result = result.filter((a) => {
        const sev = a.severity;
        if (severityFilter === "critical") return sev === 1 || sev === "critical";
        if (severityFilter === "high") return sev === 1;
        if (severityFilter === "medium") return sev === 2;
        if (severityFilter === "low") return sev === 3;
        return false;
      });
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }

    return result;
  }, [searchTerm, alertNameFilter, severityFilter, statusFilter]);

  // Consolidated alerts logic - group similar alerts within time windows
  const consolidatedAlerts = useMemo(() => {
    if (!consolidateAlerts) return filterAlerts(allAlerts);

    const filtered = filterAlerts(allAlerts);
    const groups = {};
    const timeWindow = 5 * 60 * 1000; // 5 minutes in milliseconds

    filtered.forEach(alert => {
      // Create a key based on signature + src_ip + dest_ip
      const key = `${alert.signature}-${alert.src_ip || alert["id.orig_h"]}-${alert.dest_ip || alert["id.resp_h"]}`;

      if (!groups[key]) {
        groups[key] = {
          ...alert,
          hitCount: 1,
          firstSeen: alert.timestamp,
          lastSeen: alert.timestamp,
          consolidatedIds: [alert.id],
        };
      } else {
        const group = groups[key];
        const alertTime = new Date(alert.timestamp).getTime();
        const groupTime = new Date(group.firstSeen).getTime();

        // Check if within time window
        if (Math.abs(alertTime - groupTime) <= timeWindow) {
          group.hitCount++;
          group.consolidatedIds.push(alert.id);

          // Update timestamps
          if (alertTime < new Date(group.firstSeen).getTime()) {
            group.firstSeen = alert.timestamp;
          }
          if (alertTime > new Date(group.lastSeen).getTime()) {
            group.lastSeen = alert.timestamp;
            // Use the latest alert's properties for the consolidated view
            Object.assign(group, alert, {
              hitCount: group.hitCount,
              firstSeen: group.firstSeen,
              lastSeen: alert.timestamp,
              consolidatedIds: group.consolidatedIds,
            });
          }
        }
      }
    });

    return Object.values(groups).sort((a, b) =>
      new Date(b.lastSeen) - new Date(a.lastSeen)
    );
  }, [allAlerts, consolidateAlerts, filterAlerts]);

  const filteredAllAlerts = consolidateAlerts ? consolidatedAlerts : filterAlerts(allAlerts);
  const filteredSuricataAlerts = useMemo(() =>
    filterAlerts(suricataAlerts.filter(a => !a.archived)),
    [suricataAlerts, filterAlerts]
  );
  const filteredZeekLogs = useMemo(() =>
    filterAlerts(zeekLogs.filter(a => !a.archived)),
    [zeekLogs, filterAlerts]
  );

  // View Alert Details
  const handleViewAlert = (alert) => {
    setViewModal({ isOpen: true, alert });
  };

  // Open Update Modal
  const handleOpenUpdateModal = (alert) => {
    setUpdateModal({
      isOpen: true,
      alert,
      classification: alert.classification || "Unclassified",
      status: alert.status || "New",
      tags: alert.tags || [],
      triageLevel: alert.triageLevel || "Medium",
      notes: alert.notes || "",
    });
  };

  // Update Alert
  const handleUpdateAlert = async () => {
    const metadata = {
      classification: updateModal.classification,
      status: updateModal.status,
      tags: updateModal.tags,
      triageLevel: updateModal.triageLevel,
      notes: updateModal.notes,
    };

    try {
      // If this is a consolidated alert, save metadata for ALL alerts in the group
      if (updateModal.alert.consolidatedIds && updateModal.alert.consolidatedIds.length > 0) {
        console.log(`[Save] Consolidated alert - saving ${updateModal.alert.consolidatedIds.length} alerts`);
        console.log(`[Save] Alert IDs:`, updateModal.alert.consolidatedIds.map(id => id.substring(0, 60)));
        await saveAlertMetadataBulk(updateModal.alert.consolidatedIds, metadata);
        console.log(`✅ Saved metadata for ${updateModal.alert.consolidatedIds.length} consolidated alerts`);
      } else {
        // Single alert - save metadata normally
        console.log(`[Save] Single alert ID: ${updateModal.alert.id.substring(0, 60)}`);
        await saveAlertMetadata(updateModal.alert.id, metadata);
        console.log(`✅ Saved metadata for alert ID: ${updateModal.alert.id}`);
      }
    } catch (error) {
      console.error('Error saving metadata:', error);
      toast({
        title: "Error saving metadata",
        description: error.message,
        status: "error",
        duration: 3000,
      });
      return;
    }

    // Update local state
    const updateAlertInList = (alerts) =>
      alerts.map((a) =>
        a.id === updateModal.alert.id
          ? {
              ...a,
              classification: updateModal.classification,
              status: updateModal.status,
              tags: updateModal.tags,
              triageLevel: updateModal.triageLevel,
              notes: updateModal.notes,
            }
          : a
      );

    if (updateModal.alert.source === "Suricata") {
      setSuricataAlerts(updateAlertInList(suricataAlerts));
    } else {
      setZeekLogs(updateAlertInList(zeekLogs));
    }

    toast({
      title: "Alert updated and saved successfully",
      status: "success",
      duration: 2000,
    });
    setUpdateModal({ isOpen: false, alert: null });
  };

  // Archive Alert
  const handleArchiveAlert = async () => {
    if (!archiveModal.reason.trim()) {
      toast({
        title: "Please provide a reason for archiving",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    const metadata = {
      archived: true,
      archiveReason: archiveModal.reason,
    };

    try {
      // If this is a consolidated alert, archive ALL alerts in the group
      if (archiveModal.alert.consolidatedIds && archiveModal.alert.consolidatedIds.length > 0) {
        await saveAlertMetadataBulk(archiveModal.alert.consolidatedIds, metadata);
      } else {
        await saveAlertMetadata(archiveModal.alert.id, metadata);
      }
    } catch (error) {
      console.error('Error saving archive status:', error);
      toast({
        title: "Error archiving alert",
        description: error.message,
        status: "error",
        duration: 3000,
      });
      return;
    }

    // Update local state
    const archiveInList = (alerts) =>
      alerts.map((a) =>
        a.id === archiveModal.alert.id
          ? { ...a, archived: true, archiveReason: archiveModal.reason }
          : a
      );

    if (archiveModal.alert.source === "Suricata") {
      setSuricataAlerts(archiveInList(suricataAlerts));
    } else {
      setZeekLogs(archiveInList(zeekLogs));
    }

    toast({
      title: "Alert archived successfully",
      status: "success",
      duration: 2000,
    });
    setArchiveModal({ isOpen: false, alert: null, reason: "" });
  };

  // Add tag in update modal
  const handleAddTag = (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      const newTag = e.target.value.trim();
      const currentTags = updateModal.tags || [];
      if (!currentTags.includes(newTag)) {
        setUpdateModal({ ...updateModal, tags: [...currentTags, newTag] });
      }
      e.target.value = "";
    }
  };

  // Remove tag
  const handleRemoveTag = (tag) => {
    setUpdateModal({
      ...updateModal,
      tags: (updateModal.tags || []).filter((t) => t !== tag),
    });
  };

  const getSeverityLabel = (severity) => {
    if (severity === 1 || severity === "critical") return "HIGH";
    if (severity === 2 || severity === "high") return "MEDIUM";
    if (severity === 3 || severity === "medium") return "LOW";
    return "INFO";
  };

  // Render alerts table
  const renderAlertsTable = (alerts, showSource = false) => (
    <Table variant="simple">
      <Thead bg={headerBg}>
        <Tr>
          <Th>Timestamp</Th>
          {showSource && <Th>Source</Th>}
          {consolidateAlerts && <Th>Hits</Th>}
          <Th>Alert Name</Th>
          <Th>Source IP</Th>
          <Th>Dest IP</Th>
          <Th>Severity</Th>
          <Th>Status</Th>
          <Th>Classification</Th>
          <Th>Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <Tr key={alert.id}>
              <Td fontSize="sm" whiteSpace="nowrap">
                {consolidateAlerts && alert.hitCount > 1 ? (
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" color="gray.500">First: {new Date(alert.firstSeen).toLocaleString()}</Text>
                    <Text fontSize="xs" fontWeight="semibold">Last: {new Date(alert.lastSeen).toLocaleString()}</Text>
                  </VStack>
                ) : (
                  new Date(alert.timestamp).toLocaleString()
                )}
              </Td>
              {showSource && (
                <Td>
                  <Badge
                    colorScheme={alert.source === "Suricata" ? "orange" : "teal"}
                    fontSize="xs"
                  >
                    {alert.source}
                  </Badge>
                </Td>
              )}
              {consolidateAlerts && (
                <Td>
                  <Badge
                    colorScheme={alert.hitCount > 1 ? "purple" : "gray"}
                    fontSize="sm"
                    fontWeight="bold"
                  >
                    {alert.hitCount || 1}
                  </Badge>
                </Td>
              )}
              <Td fontSize="sm" maxW="250px" isTruncated fontWeight="medium">
                {alert.signature}
              </Td>
              <Td fontSize="sm">
                {alert.src_ip || alert["id.orig_h"] || "N/A"}
              </Td>
              <Td fontSize="sm">
                {alert.dest_ip || alert["id.resp_h"] || "N/A"}
              </Td>
              <Td>
                <Badge
                  colorScheme={getSeverityBadge(alert.severity)}
                  fontSize="xs"
                >
                  {getSeverityLabel(alert.severity)}
                </Badge>
              </Td>
              <Td>
                <Badge
                  colorScheme={
                    alert.status === "Resolved"
                      ? "green"
                      : alert.status === "In Progress"
                      ? "blue"
                      : "gray"
                  }
                  fontSize="xs"
                >
                  {alert.status}
                </Badge>
              </Td>
              <Td fontSize="sm">{alert.classification}</Td>
              <Td>
                <HStack spacing={1}>
                  <IconButton
                    aria-label="View details"
                    icon={<FiEye />}
                    size="sm"
                    onClick={() => handleViewAlert(alert)}
                  />
                  <IconButton
                    aria-label="Edit alert"
                    icon={<FiEdit />}
                    size="sm"
                    colorScheme="blue"
                    onClick={() => handleOpenUpdateModal(alert)}
                  />
                  <IconButton
                    aria-label="Archive alert"
                    icon={<FiArchive />}
                    size="sm"
                    colorScheme="red"
                    onClick={() =>
                      setArchiveModal({ isOpen: true, alert, reason: "" })
                    }
                  />
                </HStack>
              </Td>
            </Tr>
          ))
        ) : (
          <Tr>
            <Td colSpan={consolidateAlerts ? (showSource ? 10 : 9) : (showSource ? 9 : 8)} textAlign="center" py={8} color="gray.500">
              No alerts found
            </Td>
          </Tr>
        )}
      </Tbody>
    </Table>
  );

  return (
    <Box>
      {/* Header */}
      <Flex gap={3} align="center" mb={6}>
        <Text fontSize="2xl" fontWeight="bold">
          Alerts Management
        </Text>
        <HStack ms="auto" spacing={2}>
          <Button
            size="sm"
            colorScheme={consolidateAlerts ? "brand" : "gray"}
            variant={consolidateAlerts ? "solid" : "outline"}
            onClick={() => setConsolidateAlerts(!consolidateAlerts)}
          >
            {consolidateAlerts ? "Consolidated" : "Raw Logs"}
          </Button>
          <Select
            size="sm"
            width="120px"
            value={alertLimit}
            onChange={(e) => setAlertLimit(Number(e.target.value))}
          >
            <option value={50}>50 Logs</option>
            <option value={100}>100 Logs</option>
            <option value={150}>150 Logs</option>
            <option value={200}>200 Logs</option>
          </Select>
          <Text fontSize="xs" color="gray.500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Text>
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
            onClick={fetchAlerts}
          />
        </HStack>
      </Flex>

      {/* Info Banner for Consolidated View */}
      {consolidateAlerts && (
        <Alert status="info" mb={4} borderRadius="md">
          <AlertIcon />
          <AlertDescription fontSize="sm">
            <strong>SIEM Mode:</strong> Similar alerts (same signature, IPs) within 5-minute windows are grouped.
            The "Hits" column shows the number of consolidated events. Changes apply to all alerts in the group.
          </AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <Box mb={4}>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search by IP address or alert name..."
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
          <HStack spacing={4} flexWrap="wrap">
            <FormControl minW="200px">
              <FormLabel fontSize="sm">Alert Name</FormLabel>
              <Select
                placeholder="All Alert Types"
                value={alertNameFilter}
                onChange={(e) => setAlertNameFilter(e.target.value)}
                size="sm"
              >
                {uniqueSignatures.map((sig) => (
                  <option key={sig} value={sig}>
                    {sig}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl minW="150px">
              <FormLabel fontSize="sm">Severity</FormLabel>
              <Select
                placeholder="All Severities"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                size="sm"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </FormControl>

            <FormControl minW="150px">
              <FormLabel fontSize="sm">Status</FormLabel>
              <Select
                placeholder="All Statuses"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                size="sm"
              >
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="False Positive">False Positive</option>
              </Select>
            </FormControl>

            <Button
              size="sm"
              colorScheme="red"
              variant="ghost"
              mt="auto"
              onClick={() => {
                setSeverityFilter("");
                setStatusFilter("");
                setSearchTerm("");
                setAlertNameFilter("");
              }}
            >
              Clear All Filters
            </Button>
          </HStack>
        </Box>
      </Collapse>

      {/* Alerts Tabs */}
      <Tabs
        colorScheme="brand"
        onChange={(index) => setActiveTab(index)}
      >
        <TabList>
          <Tab>All Alerts ({filteredAllAlerts.length})</Tab>
          <Tab>Suricata IDS ({filteredSuricataAlerts.length})</Tab>
          <Tab>Zeek Network ({filteredZeekLogs.length})</Tab>
        </TabList>

        <TabPanels>
          {/* All Alerts Tab */}
          <TabPanel px={0}>
            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={border}
              borderRadius="16px"
              overflowX="auto"
            >
              {renderAlertsTable(filteredAllAlerts, true)}
            </Box>
          </TabPanel>

          {/* Suricata Alerts Tab */}
          <TabPanel px={0}>
            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={border}
              borderRadius="16px"
              overflowX="auto"
            >
              {renderAlertsTable(filteredSuricataAlerts, false)}
            </Box>
          </TabPanel>

          {/* Zeek Logs Tab */}
          <TabPanel px={0}>
            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={border}
              borderRadius="16px"
              overflowX="auto"
            >
              {renderAlertsTable(filteredZeekLogs, false)}
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* View Alert Modal */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, alert: null })}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Alert Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {viewModal.alert && (
              <VStack align="stretch" spacing={3}>
                {viewModal.alert.hitCount > 1 && (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <AlertDescription>
                      This represents <strong>{viewModal.alert.hitCount}</strong> similar alerts grouped together.
                    </AlertDescription>
                  </Alert>
                )}
                <Box>
                  <Text fontWeight="semibold" mb={1}>
                    Alert Name / Signature
                  </Text>
                  <Text fontSize="sm">
                    {viewModal.alert.signature}
                  </Text>
                </Box>
                <HStack>
                  <Box flex="1">
                    <Text fontWeight="semibold" mb={1}>
                      Source
                    </Text>
                    <Badge colorScheme={viewModal.alert.source === "Suricata" ? "orange" : "teal"}>
                      {viewModal.alert.source}
                    </Badge>
                  </Box>
                  <Box flex="1">
                    <Text fontWeight="semibold" mb={1}>
                      Classification
                    </Text>
                    <Text fontSize="sm">{viewModal.alert.classification}</Text>
                  </Box>
                </HStack>
                <HStack>
                  <Box flex="1">
                    <Text fontWeight="semibold" mb={1}>
                      Source IP
                    </Text>
                    <Text fontSize="sm">
                      {viewModal.alert.src_ip || viewModal.alert["id.orig_h"] || "N/A"}
                    </Text>
                  </Box>
                  <Box flex="1">
                    <Text fontWeight="semibold" mb={1}>
                      Destination IP
                    </Text>
                    <Text fontSize="sm">
                      {viewModal.alert.dest_ip || viewModal.alert["id.resp_h"] || "N/A"}
                    </Text>
                  </Box>
                </HStack>
                <HStack>
                  <Box flex="1">
                    <Text fontWeight="semibold" mb={1}>
                      Severity
                    </Text>
                    <Badge
                      colorScheme={getSeverityBadge(viewModal.alert.severity)}
                    >
                      {getSeverityLabel(viewModal.alert.severity)}
                    </Badge>
                  </Box>
                  <Box flex="1">
                    <Text fontWeight="semibold" mb={1}>
                      Status
                    </Text>
                    <Badge>{viewModal.alert.status}</Badge>
                  </Box>
                </HStack>
                <Box>
                  <Text fontWeight="semibold" mb={1}>
                    Timestamp
                  </Text>
                  <Text fontSize="sm">
                    {viewModal.alert.hitCount > 1
                      ? `First: ${new Date(viewModal.alert.firstSeen).toLocaleString()} | Last: ${new Date(viewModal.alert.lastSeen).toLocaleString()}`
                      : new Date(viewModal.alert.timestamp).toLocaleString()
                    }
                  </Text>
                </Box>
                {viewModal.alert.tags?.length > 0 && (
                  <Box>
                    <Text fontWeight="semibold" mb={1}>
                      Tags
                    </Text>
                    <HStack flexWrap="wrap">
                      {viewModal.alert.tags.map((tag) => (
                        <Tag key={tag} colorScheme="blue" size="sm">
                          {tag}
                        </Tag>
                      ))}
                    </HStack>
                  </Box>
                )}
                {viewModal.alert.notes && (
                  <Box>
                    <Text fontWeight="semibold" mb={1}>
                      Notes
                    </Text>
                    <Text fontSize="sm">{viewModal.alert.notes}</Text>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setViewModal({ isOpen: false, alert: null })}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Update Alert Modal */}
      <Modal
        isOpen={updateModal.isOpen}
        onClose={() => setUpdateModal({ isOpen: false, alert: null })}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Update Alert</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {updateModal.alert?.hitCount > 1 && (
              <Alert status="warning" mb={4} borderRadius="md">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  Changes will apply to all <strong>{updateModal.alert.hitCount}</strong> alerts in this group.
                </AlertDescription>
              </Alert>
            )}
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Classification</FormLabel>
                <Select
                  value={updateModal.classification}
                  onChange={(e) =>
                    setUpdateModal({ ...updateModal, classification: e.target.value })
                  }
                >
                  <option value="Unclassified">Unclassified</option>
                  <option value="Malware">Malware</option>
                  <option value="Intrusion Attempt">Intrusion Attempt</option>
                  <option value="Policy Violation">Policy Violation</option>
                  <option value="Reconnaissance">Reconnaissance</option>
                  <option value="Port Scan">Port Scan</option>
                  <option value="False Positive">False Positive</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  value={updateModal.status}
                  onChange={(e) =>
                    setUpdateModal({ ...updateModal, status: e.target.value })
                  }
                >
                  <option value="New">New</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="False Positive">False Positive</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Triage Level</FormLabel>
                <Select
                  value={updateModal.triageLevel}
                  onChange={(e) =>
                    setUpdateModal({ ...updateModal, triageLevel: e.target.value })
                  }
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Tags (Press Enter to add)</FormLabel>
                <Input
                  placeholder="Add a tag and press Enter"
                  onKeyDown={handleAddTag}
                />
                <HStack mt={2} flexWrap="wrap">
                  {(updateModal.tags || []).map((tag) => (
                    <Tag key={tag} colorScheme="blue" size="md">
                      <TagLabel>{tag}</TagLabel>
                      <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                    </Tag>
                  ))}
                </HStack>
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  value={updateModal.notes}
                  onChange={(e) =>
                    setUpdateModal({ ...updateModal, notes: e.target.value })
                  }
                  placeholder="Add notes about this alert..."
                  rows={4}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setUpdateModal({ isOpen: false, alert: null })}
            >
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleUpdateAlert}>
              Update Alert
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Archive Alert Modal */}
      <Modal
        isOpen={archiveModal.isOpen}
        onClose={() => setArchiveModal({ isOpen: false, alert: null, reason: "" })}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Archive Alert</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {archiveModal.alert?.hitCount > 1 && (
              <Alert status="warning" mb={4} borderRadius="md">
                <AlertIcon />
                <AlertDescription fontSize="sm">
                  This will archive all <strong>{archiveModal.alert.hitCount}</strong> alerts in this group.
                </AlertDescription>
              </Alert>
            )}
            <Text mb={4}>
              Are you sure you want to archive this alert? Please provide a reason:
            </Text>
            <Textarea
              placeholder="Reason for archiving (e.g., False positive, Irrelevant)"
              value={archiveModal.reason}
              onChange={(e) =>
                setArchiveModal({ ...archiveModal, reason: e.target.value })
              }
              rows={4}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() =>
                setArchiveModal({ isOpen: false, alert: null, reason: "" })
              }
            >
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleArchiveAlert}>
              Archive
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
