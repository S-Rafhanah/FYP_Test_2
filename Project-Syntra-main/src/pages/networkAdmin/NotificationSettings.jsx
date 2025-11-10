import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
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
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Textarea,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Switch,
  Tooltip,
  HStack,
  VStack,
  Divider,
  Spinner,
  Tag,
  TagLabel,
  TagCloseButton,
} from '@chakra-ui/react';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdRefresh,
  MdSend,
  MdNotifications,
  MdNotificationsOff,
  MdSearch,
} from 'react-icons/md';
import Card from 'components/card/Card';
import {
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  toggleNotificationStatus,
  testNotification,
} from '../../backend_api';
import { useAuth } from '../../auth/AuthContext';

export default function NotificationSettings() {
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const cancelRef = React.useRef();

  // Color mode values
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textSecondary = useColorModeValue('secondaryGray.700', 'whiteAlpha.700');
  const cardBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  // Data state
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    notification_name: '',
    trigger_condition: 'Any Alert',
    severity_filter: '',
    delivery_method: 'Email',
    recipients: '',
    message_template: '',
    status: 'Enabled',
  });

  // Recipient management for tags
  const [recipientInput, setRecipientInput] = useState('');
  const [recipientList, setRecipientList] = useState([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      toast({
        title: 'Failed to load notifications',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Open modal for creating new notification
  const handleCreate = () => {
    setEditingNotification(null);
    setFormData({
      notification_name: '',
      trigger_condition: 'Any Alert',
      severity_filter: '',
      delivery_method: 'Email',
      recipients: '',
      message_template: '',
      status: 'Enabled',
    });
    setRecipientList([]);
    onOpen();
  };

  // Open modal for editing existing notification
  const handleEdit = (notification) => {
    setEditingNotification(notification);
    setFormData({
      notification_name: notification.notification_name,
      trigger_condition: notification.trigger_condition,
      severity_filter: notification.severity_filter || '',
      delivery_method: notification.delivery_method,
      recipients: notification.recipients,
      message_template: notification.message_template || '',
      status: notification.status,
    });
    // Parse recipients into tags
    const recipients = notification.recipients.split(',').map((r) => r.trim()).filter((r) => r);
    setRecipientList(recipients);
    onOpen();
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Build recipients string from tags
      const recipientsString = recipientList.join(', ');

      if (!formData.notification_name || !formData.trigger_condition || !recipientsString) {
        toast({
          title: 'Missing required fields',
          description: 'Please fill in all required fields',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const dataToSubmit = {
        ...formData,
        recipients: recipientsString,
      };

      if (editingNotification) {
        await updateNotification(editingNotification.id, dataToSubmit);
        toast({
          title: 'Notification updated',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        await createNotification(dataToSubmit);
        toast({
          title: 'Notification created',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      }

      onClose();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to save notification:', err);
      toast({
        title: 'Failed to save notification',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    try {
      await deleteNotification(deletingId);
      toast({
        title: 'Notification deleted',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      onDeleteClose();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
      toast({
        title: 'Failed to delete notification',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (id) => {
    try {
      const result = await toggleNotificationStatus(id);
      toast({
        title: 'Status updated',
        description: `Notification ${result.status.toLowerCase()}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      toast({
        title: 'Failed to update status',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle test notification
  const handleTest = async (id) => {
    try {
      const result = await testNotification(id);
      toast({
        title: 'Test notification sent',
        description: `Sent to ${result.details.delivery_method}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Failed to test notification:', err);
      toast({
        title: 'Failed to send test notification',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Add recipient tag
  const handleAddRecipient = () => {
    const trimmed = recipientInput.trim();
    if (trimmed && !recipientList.includes(trimmed)) {
      setRecipientList([...recipientList, trimmed]);
      setRecipientInput('');
    }
  };

  // Remove recipient tag
  const handleRemoveRecipient = (recipient) => {
    setRecipientList(recipientList.filter((r) => r !== recipient));
  };

  // Handle enter key in recipient input
  const handleRecipientKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRecipient();
    }
  };

  // Filter notifications based on search query
  const filteredNotifications = notifications.filter((notification) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      notification.notification_name.toLowerCase().includes(query) ||
      notification.trigger_condition.toLowerCase().includes(query) ||
      notification.delivery_method.toLowerCase().includes(query) ||
      notification.recipients.toLowerCase().includes(query) ||
      (notification.severity_filter && notification.severity_filter.toLowerCase().includes(query))
    );
  });

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Card direction="column" w="100%" px="25px" py="25px" bg={cardBg}>
        {/* Header */}
        <Flex justify="space-between" align="center" mb="20px" flexWrap="wrap" gap={3}>
          <Box>
            <Text color={textColor} fontSize="22px" fontWeight="700" mb="4px">
              Alert Notification Settings
            </Text>
            <Text color={textSecondary} fontSize="sm">
              Configure notification rules for alert delivery
            </Text>
          </Box>
          <HStack spacing={2}>
            <Button
              leftIcon={<Icon as={MdRefresh} />}
              onClick={fetchNotifications}
              isLoading={loading}
              size="sm"
              variant="outline"
            >
              Refresh
            </Button>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              onClick={handleCreate}
              colorScheme="brand"
              size="sm"
            >
              Create Rule
            </Button>
          </HStack>
        </Flex>

        {/* Search Bar */}
        <Flex mb="20px">
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search by name, condition, method, or recipients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          {searchQuery && (
            <Text fontSize="sm" color={textSecondary} ml={3} alignSelf="center">
              {filteredNotifications.length} of {notifications.length} rules
            </Text>
          )}
        </Flex>

        {/* Notifications Table */}
        <Box overflowX="auto">
          {loading && filteredNotifications.length === 0 ? (
            <Flex justify="center" align="center" minH="200px">
              <Spinner size="lg" />
            </Flex>
          ) : filteredNotifications.length === 0 && !searchQuery ? (
            <Flex
              direction="column"
              justify="center"
              align="center"
              minH="200px"
              p={8}
              borderWidth="2px"
              borderStyle="dashed"
              borderColor={borderColor}
              borderRadius="md"
            >
              <Icon as={MdNotifications} w={12} h={12} color="gray.400" mb={3} />
              <Text color={textSecondary} fontSize="lg" fontWeight="600" mb={2}>
                No notification rules
              </Text>
              <Text color={textSecondary} fontSize="sm" mb={4}>
                Create your first notification rule to get started
              </Text>
              <Button leftIcon={<Icon as={MdAdd} />} onClick={handleCreate} colorScheme="brand">
                Create Rule
              </Button>
            </Flex>
          ) : filteredNotifications.length === 0 ? (
            <Flex
              direction="column"
              justify="center"
              align="center"
              minH="200px"
              p={8}
            >
              <Icon as={MdSearch} w={12} h={12} color="gray.400" mb={3} />
              <Text color={textSecondary} fontSize="lg" fontWeight="600" mb={2}>
                No matching notification rules
              </Text>
              <Text color={textSecondary} fontSize="sm" mb={4}>
                Try adjusting your search query
              </Text>
              <Button size="sm" variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            </Flex>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Rule Name</Th>
                  <Th>Trigger Condition</Th>
                  <Th>Severity Filter</Th>
                  <Th>Delivery Method</Th>
                  <Th>Recipients</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredNotifications.map((notification) => (
                  <Tr key={notification.id} _hover={{ bg: hoverBg }}>
                    <Td fontWeight="600" fontSize="sm">
                      {notification.notification_name}
                    </Td>
                    <Td fontSize="sm">{notification.trigger_condition}</Td>
                    <Td fontSize="sm">
                      {notification.severity_filter ? (
                        <Badge colorScheme="orange">{notification.severity_filter}</Badge>
                      ) : (
                        <Text color={textSecondary}>All</Text>
                      )}
                    </Td>
                    <Td fontSize="sm">
                      <Badge colorScheme="blue">{notification.delivery_method}</Badge>
                    </Td>
                    <Td fontSize="xs" maxW="200px" isTruncated>
                      {notification.recipients}
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={notification.status === 'Enabled' ? 'green' : 'gray'}
                        fontSize="xs"
                      >
                        {notification.status}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <Tooltip label={notification.status === 'Enabled' ? 'Disable' : 'Enable'}>
                          <IconButton
                            icon={
                              <Icon
                                as={
                                  notification.status === 'Enabled'
                                    ? MdNotifications
                                    : MdNotificationsOff
                                }
                              />
                            }
                            size="sm"
                            variant="ghost"
                            colorScheme={notification.status === 'Enabled' ? 'green' : 'gray'}
                            onClick={() => handleToggleStatus(notification.id)}
                          />
                        </Tooltip>
                        <Tooltip label="Test notification">
                          <IconButton
                            icon={<Icon as={MdSend} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="purple"
                            onClick={() => handleTest(notification.id)}
                          />
                        </Tooltip>
                        <Tooltip label="Edit">
                          <IconButton
                            icon={<Icon as={MdEdit} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="blue"
                            onClick={() => handleEdit(notification)}
                          />
                        </Tooltip>
                        <Tooltip label="Delete">
                          <IconButton
                            icon={<Icon as={MdDelete} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => {
                              setDeletingId(notification.id);
                              onDeleteOpen();
                            }}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingNotification ? 'Edit Notification Rule' : 'Create Notification Rule'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Rule Name</FormLabel>
                <Input
                  placeholder="e.g., High Severity Alerts"
                  value={formData.notification_name}
                  onChange={(e) =>
                    setFormData({ ...formData, notification_name: e.target.value })
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Trigger Condition</FormLabel>
                <Select
                  value={formData.trigger_condition}
                  onChange={(e) =>
                    setFormData({ ...formData, trigger_condition: e.target.value })
                  }
                >
                  <option value="Any Alert">Any Alert</option>
                  <option value="Suricata Alert">Suricata Alert Only</option>
                  <option value="Zeek Connection">Zeek Connection Only</option>
                  <option value="Threshold Exceeded">Threshold Exceeded</option>
                  <option value="New Source IP">New Source IP Detected</option>
                  <option value="Port Scan Detected">Port Scan Detected</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Severity Filter (Optional)</FormLabel>
                <Select
                  value={formData.severity_filter}
                  onChange={(e) =>
                    setFormData({ ...formData, severity_filter: e.target.value })
                  }
                >
                  <option value="">All Severities</option>
                  <option value="High">High Only</option>
                  <option value="Medium">Medium and Above</option>
                  <option value="Low">Low and Above</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Delivery Method</FormLabel>
                <Select
                  value={formData.delivery_method}
                  onChange={(e) =>
                    setFormData({ ...formData, delivery_method: e.target.value })
                  }
                >
                  <option value="Email">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="Slack">Slack</option>
                  <option value="Telegram">Telegram</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Recipients</FormLabel>
                <Input
                  placeholder="Add recipient (email, phone, webhook URL, etc.)"
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyPress={handleRecipientKeyPress}
                  onBlur={handleAddRecipient}
                />
                <Flex flexWrap="wrap" gap={2} mt={2}>
                  {recipientList.map((recipient) => (
                    <Tag key={recipient} size="md" colorScheme="blue" borderRadius="full">
                      <TagLabel>{recipient}</TagLabel>
                      <TagCloseButton onClick={() => handleRemoveRecipient(recipient)} />
                    </Tag>
                  ))}
                </Flex>
                <Text fontSize="xs" color={textSecondary} mt={1}>
                  Press Enter or blur to add recipient
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Message Template (Optional)</FormLabel>
                <Textarea
                  placeholder="Custom message template. Available variables: {alert_name}, {severity}, {source_ip}, {timestamp}"
                  value={formData.message_template}
                  onChange={(e) =>
                    setFormData({ ...formData, message_template: e.target.value })
                  }
                  rows={4}
                />
                <Text fontSize="xs" color={textSecondary} mt={1}>
                  Leave empty to use default template
                </Text>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Enable this notification rule</FormLabel>
                <Switch
                  isChecked={formData.status === 'Enabled'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.checked ? 'Enabled' : 'Disabled',
                    })
                  }
                  colorScheme="green"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="brand" onClick={handleSubmit}>
              {editingNotification ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Notification Rule
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? This notification rule will be permanently deleted and can't be
              recovered.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConfirm} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
