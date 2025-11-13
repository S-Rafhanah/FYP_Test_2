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

// Generate stable ID from alert properties (timestamp-independent for persistence)
// This ensures all alerts of the same type (signature + IPs) share metadata
const generateStableAlertId = (alert, source) => {
  // Use _id if available from backend
  if (alert._id) return alert._id;

  // Create stable ID without timestamp - metadata persists for all alerts of this type
  if (source === "Suricata") {
    // Use signature + src_ip + dest_ip (NO timestamp)
    const signature = alert.alert?.signature || alert.signature || "unknown";
    const srcIp = alert.src_ip || "unknown";
    const destIp = alert.dest_ip || "unknown";
    const srcPort = alert.src_port || "0";
    const destPort = alert.dest_port || "0";

    // Create string for hashing (timestamp removed for stability)
    const str = `${srcIp}-${srcPort}-${destIp}-${destPort}-${signature}`;
    const hash = simpleHash(str);
    return `suricata-${hash}`;
  } else {
    // Use uid or create from multiple fields for Zeek
    if (alert.uid) return `zeek-${alert.uid}`;

    const origH = alert["id.orig_h"] || "unknown";
    const respH = alert["id.resp_h"] || "unknown";
    const origP = alert["id.orig_p"] || "0";
    const respP = alert["id.resp_p"] || "0";
    const service = alert.service || "";
    const proto = alert.proto || "";

    // Create string for hashing (timestamp removed for stability)
    const str = `${origH}-${origP}-${respH}-${respP}-${service}-${proto}`;
    const hash = simpleHash(str);
    return `zeek-${hash}`;
  }
};

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
      const [suricata, zeek, allMetadata] = await Promise.all([
        getSuricataAlerts(200).catch(() => []),
        getZeekLogs(200).catch(() => []),
        getAllAlertMetadata().catch(() => []),
      ]);

      // Convert metadata array to object keyed by alert_id
      const metadataObj = {};
      (allMetadata || []).forEach(item => {
        metadataObj[item.alert_id] = item;
      });

      console.log(`[Load] Loaded ${allMetadata?.length || 0} saved alert metadata records from database`);
      if (allMetadata && allMetadata.length > 0) {
        console.log(`[Load] Sample IDs from DB:`, allMetadata.slice(0, 3).map(m => m.alert_id.substring(0, 60)));
      }

      // Track IDs to ensure uniqueness within this batch
      const usedIds = new Set();
      const getUniqueId = (baseId) => {
        let uniqueId = baseId;
        let counter = 1;
        while (usedIds.has(uniqueId)) {
          uniqueId = `${baseId}-dup${counter}`;
          counter++;
        }
        usedIds.add(uniqueId);
        return uniqueId;
      };

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

        return {
          ...alert,
          id,
          source: "Suricata",
          signature: alert.alert?.signature || alert.signature || "Unknown",
          // Use saved metadata if available, otherwise use defaults
          severity: savedMetadata?.severity || alert.alert?.severity || alert.severity || 3,
          classification: savedMetadata?.classification || alert.classification || "Unclassified",
          status: savedMetadata?.status || alert.status || "New",
          tags: savedMetadata?.tags || alert.tags || [],
          triageLevel: savedMetadata?.triageLevel || alert.triageLevel || "Medium",
          notes: savedMetadata?.notes || alert.notes || "",
          archived: savedMetadata?.archived || alert.archived || false,
        };
      });

      // Enrich Zeek logs with saved metadata from database
      const enrichedZeek = (zeek || []).map((log) => {
        const baseId = generateStableAlertId(log, "Zeek");
        const id = getUniqueId(baseId);
        const savedMetadata = metadataObj[id] || metadataObj[baseId];

        if (savedMetadata) {
          console.log(`📋 Loading saved metadata for Zeek log: ${id.substring(0, 50)}...`);
        }

        return {
          ...log,
          id,
          source: "Zeek",
          signature: log.service || log.proto || "Network Activity",
          // Use saved metadata if available, otherwise use defaults
          severity: savedMetadata?.severity || 3,
          classification: savedMetadata?.classification || log.classification || "Network Log",
          status: savedMetadata?.status || log.status || "New",
          tags: savedMetadata?.tags || log.tags || [],
          triageLevel: savedMetadata?.triageLevel || log.triageLevel || "Low",
          notes: savedMetadata?.notes || log.notes || "",
          archived: savedMetadata?.archived || log.archived || false,
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
  }, [isAuthenticated, toast]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Combine all alerts - memoized for performance
  const allAlerts = useMemo(() =>
    [...suricataAlerts, ...zeekLogs]
      .filter(a => !a.archived)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  , [suricataAlerts, zeekLogs]);

  // Get unique alert signatures for filter dropdown - memoized
  const uniqueSignatures = useMemo(() =>
    [...new Set(allAlerts.map(a => a.signature))].sort()
  , [allAlerts]);

  // Apply filters - memoized for performance
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

  // Consolidate alerts - group similar alerts within 5-minute window
  const consolidateAlertsList = useCallback((alerts) => {
    if (!consolidateAlerts) return alerts;

    const TIME_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
    const groups = new Map();

    alerts.forEach(alert => {
      const srcIp = alert.src_ip || alert["id.orig_h"] || "unknown";
      const destIp = alert.dest_ip || alert["id.resp_h"] || "unknown";
      const signature = alert.signature || "Unknown";

      // Create group key
      const groupKey = `${signature}|${srcIp}|${destIp}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(alert);
    });

    // Consolidate each group
    const consolidated = [];
    groups.forEach((groupAlerts) => {
      // Sort by timestamp
      groupAlerts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Check if alerts are within time window
      const subgroups = [];
      let currentSubgroup = [groupAlerts[0]];

      for (let i = 1; i < groupAlerts.length; i++) {
        const prevTime = new Date(groupAlerts[i - 1].timestamp).getTime();
        const currTime = new Date(groupAlerts[i].timestamp).getTime();

        if (currTime - prevTime <= TIME_WINDOW) {
          currentSubgroup.push(groupAlerts[i]);
        } else {
          subgroups.push(currentSubgroup);
          currentSubgroup = [groupAlerts[i]];
        }
      }
      subgroups.push(currentSubgroup);

      // Create consolidated alert for each subgroup
      subgroups.forEach(subgroup => {
        const firstAlert = subgroup[0];
        const lastAlert = subgroup[subgroup.length - 1];

        consolidated.push({
          ...lastAlert, // Use latest alert as base
          id: firstAlert.id, // Use first alert's ID for metadata
          count: subgroup.length,
          firstSeen: firstAlert.timestamp,
          lastSeen: lastAlert.timestamp,
          consolidatedIds: subgroup.map(a => a.id), // Track all IDs in group
        });
      });
    });

    // Sort by last seen (most recent first)
    return consolidated.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  }, [consolidateAlerts]);

  const filteredAllAlerts = useMemo(() =>
    consolidateAlertsList(filterAlerts(allAlerts)),
    [consolidateAlertsList, filterAlerts, allAlerts]
  );
  const filteredSuricataAlerts = useMemo(() =>
    consolidateAlertsList(filterAlerts(suricataAlerts.filter(a => !a.archived))),
    [consolidateAlertsList, filterAlerts, suricataAlerts]
  );
  const filteredZeekLogs = useMemo(() =>
    consolidateAlertsList(filterAlerts(zeekLogs.filter(a => !a.archived))),
    [consolidateAlertsList, filterAlerts, zeekLogs]
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

  // Update Alert - now persists to backend database
  const handleUpdateAlert = async () => {
    const metadata = {
      classification: updateModal.classification,
      status: updateModal.status,
      tags: updateModal.tags,
      triageLevel: updateModal.triageLevel,
      notes: updateModal.notes,
      archived: false,
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
      toast({
        title: "Error saving metadata",
        description: error.message || "Failed to save alert metadata",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return; // Don't proceed with UI updates if save failed
    }

    // Also update React state for immediate UI feedback
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

  // Archive Alert - now persists to backend database
  const handleArchiveAlert = async () => {
    if (!archiveModal.reason.trim()) {
      toast({
        title: "Please provide a reason for archiving",
        status: "warning",
        duration: 2000,
      });
      return;
    }

    const alert = archiveModal.alert;
    const metadata = {
      classification: alert.classification,
      status: alert.status,
      tags: alert.tags || [],
      triageLevel: alert.triageLevel,
      notes: alert.notes || "",
      archived: true,
      archiveReason: archiveModal.reason,
    };

    try {
      // Save archive status to database
      await saveAlertMetadata(alert.id, metadata);
      console.log(`✅ Archived alert ID: ${alert.id}`);
    } catch (error) {
      toast({
        title: "Error archiving alert",
        description: error.message || "Failed to save archive status",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return; // Don't proceed with UI updates if save failed
    }

    // Also update React state for immediate UI feedback
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
      title: "Alert archived and saved successfully",
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
          <Th>Alert Name</Th>
          <Th>Hits</Th>
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
                {alert.count > 1 ? (
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" opacity={0.7}>First: {new Date(alert.firstSeen).toLocaleString()}</Text>
                    <Text fontSize="xs" opacity={0.7}>Last: {new Date(alert.lastSeen).toLocaleString()}</Text>
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
              <Td fontSize="sm" maxW="250px" isTruncated fontWeight="medium">
                {alert.signature}
              </Td>
              <Td>
                <Badge
                  colorScheme={alert.count > 1 ? "purple" : "gray"}
                  fontSize="sm"
                  fontWeight="bold"
                >
                  {alert.count || 1}
                </Badge>
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
            <Td colSpan={showSource ? 10 : 9} textAlign="center" py={8} color="gray.500">
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
      <Flex gap={3} align="center" mb={4}>
        <Text fontSize="2xl" fontWeight="bold">
          Alerts Management
        </Text>
        <HStack ms="auto" spacing={2}>
          <Button
            size="sm"
            onClick={() => setConsolidateAlerts(!consolidateAlerts)}
            colorScheme={consolidateAlerts ? "brand" : "gray"}
            variant={consolidateAlerts ? "solid" : "outline"}
          >
            {consolidateAlerts ? "Consolidated" : "Raw Logs"}
          </Button>
          <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
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

      {/* Consolidated Alerts Info */}
      <Alert status="info" borderRadius="md" mb={4} fontSize="sm">
        <AlertIcon />
        <Box>
          <AlertDescription>
            <strong>SIEM-Style Alert Consolidation:</strong> {consolidateAlerts ? (
              <>Similar alerts (same signature, IPs) within 5 minutes are grouped together.
              The count badge shows how many events occurred. Toggle to "Raw Logs" to see individual packets.</>
            ) : (
              <>Viewing raw IDS/Network logs - each packet is shown separately.
              Toggle to "Consolidated" to group similar alerts together (recommended for most analysis).</>
            )}
          </AlertDescription>
        </Box>
      </Alert>

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
                    {new Date(viewModal.alert.timestamp).toLocaleString()}
                  </Text>
                </Box>
                {viewModal.alert.tags?.length > 0 && (
                  <Box>
                    <Text fontWeight="semibold" mb={1}>
                      Tags
                    </Text>
                    <HStack>
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
