import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  Textarea,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Spinner,
} from '@chakra-ui/react';
import { MdAdd, MdEdit, MdDelete, MdSearch } from 'react-icons/md';
import Card from 'components/card/Card';
import { getIDSRules, createIDSRule, updateIDSRule, deleteIDSRule, searchIDSRules } from 'backend_api';

export default function IDSRuleManagement() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRule, setSelectedRule] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const [formData, setFormData] = useState({
    rule_name: '',
    rule_sid: '',
    category: '',
    severity: '',
    rule_content: '',
    description: '',
    status: 'Active',
  });

  const toast = useToast();
  const cancelRef = React.useRef();

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const bgButton = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const bgHover = useColorModeValue({ bg: 'secondaryGray.400' }, { bg: 'whiteAlpha.50' });
  const bgFocus = useColorModeValue({ bg: 'secondaryGray.300' }, { bg: 'whiteAlpha.100' });

  // Fetch all rules on component mount
  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await getIDSRules();
      setRules(data);
    } catch (error) {
      toast({
        title: 'Error fetching rules',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchRules();
      return;
    }

    try {
      setLoading(true);
      const data = await searchIDSRules(searchQuery);
      setRules(data);
    } catch (error) {
      toast({
        title: 'Search failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      rule_name: '',
      rule_sid: '',
      category: '',
      severity: '',
      rule_content: '',
      description: '',
      status: 'Active',
    });
    onAddOpen();
  };

  const handleEdit = (rule) => {
    setSelectedRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_sid: rule.rule_sid || '',
      category: rule.category,
      severity: rule.severity,
      rule_content: rule.rule_content,
      description: rule.description || '',
      status: rule.status,
    });
    onEditOpen();
  };

  const handleDeleteClick = (rule) => {
    setSelectedRule(rule);
    onDeleteOpen();
  };

  const handleSubmitAdd = async () => {
    try {
      setIsSubmitting(true);
      await createIDSRule(formData);
      toast({
        title: 'Rule created',
        description: 'IDS rule has been created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onAddClose();
      fetchRules();
    } catch (error) {
      toast({
        title: 'Error creating rule',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    try {
      setIsSubmitting(true);
      await updateIDSRule(selectedRule.id, formData);
      toast({
        title: 'Rule updated',
        description: 'IDS rule has been updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onEditClose();
      fetchRules();
    } catch (error) {
      toast({
        title: 'Error updating rule',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsSubmitting(true);
      await deleteIDSRule(selectedRule.id);
      toast({
        title: 'Rule deleted',
        description: 'IDS rule has been deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onDeleteClose();
      fetchRules();
    } catch (error) {
      toast({
        title: 'Error deleting rule',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High':
        return 'red';
      case 'Medium':
        return 'orange';
      case 'Low':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? 'green' : 'gray';
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Card
        direction="column"
        w="100%"
        px="0px"
        overflowX={{ sm: 'scroll', lg: 'hidden' }}
      >
        {/* Header */}
        <Flex px="25px" justify="space-between" mb="20px" align="center">
          <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%">
            IDS Rule Management
          </Text>
          <Button
            leftIcon={<MdAdd />}
            colorScheme="brand"
            variant="solid"
            onClick={handleAdd}
          >
            Add New Rule
          </Button>
        </Flex>

        {/* Search Bar */}
        <Flex px="25px" mb="20px" gap="10px">
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <MdSearch color="gray" />
            </InputLeftElement>
            <Input
              placeholder="Search by rule name, SID, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </InputGroup>
          <Button onClick={handleSearch} colorScheme="brand">
            Search
          </Button>
          {searchQuery && (
            <Button
              onClick={() => {
                setSearchQuery('');
                fetchRules();
              }}
            >
              Clear
            </Button>
          )}
        </Flex>

        {/* Table */}
        {loading ? (
          <Flex justify="center" align="center" py="40px">
            <Spinner size="xl" color="brand.500" />
          </Flex>
        ) : rules.length === 0 ? (
          <Flex justify="center" align="center" py="40px">
            <Text color={textColor} fontSize="md">
              No rules found. Click "Add New Rule" to create one.
            </Text>
          </Flex>
        ) : (
          <Box overflowX="auto">
            <Table variant="simple" color="gray.500" mb="24px">
              <Thead>
                <Tr>
                  <Th borderColor={borderColor}>Rule Name</Th>
                  <Th borderColor={borderColor}>Rule SID</Th>
                  <Th borderColor={borderColor}>Category</Th>
                  <Th borderColor={borderColor}>Severity</Th>
                  <Th borderColor={borderColor}>Status</Th>
                  <Th borderColor={borderColor}>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rules.map((rule) => (
                  <Tr key={rule.id} _hover={bgHover}>
                    <Td borderColor={borderColor}>
                      <Text color={textColor} fontSize="sm" fontWeight="700">
                        {rule.rule_name}
                      </Text>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Text color={textColor} fontSize="sm">
                        {rule.rule_sid || 'N/A'}
                      </Text>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Text color={textColor} fontSize="sm">
                        {rule.category}
                      </Text>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Badge colorScheme={getSeverityColor(rule.severity)}>
                        {rule.severity}
                      </Badge>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Badge colorScheme={getStatusColor(rule.status)}>
                        {rule.status}
                      </Badge>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Flex gap="8px">
                        <IconButton
                          icon={<MdEdit />}
                          aria-label="Edit rule"
                          size="sm"
                          onClick={() => handleEdit(rule)}
                          bg={bgButton}
                          _hover={bgHover}
                          _focus={bgFocus}
                        />
                        <IconButton
                          icon={<MdDelete />}
                          aria-label="Delete rule"
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => handleDeleteClick(rule)}
                        />
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Card>

      {/* Add Rule Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New IDS Rule</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl isRequired mb={4}>
              <FormLabel>Rule Name</FormLabel>
              <Input
                placeholder="Enter rule name"
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Rule SID</FormLabel>
              <Input
                placeholder="Enter rule SID (optional)"
                value={formData.rule_sid}
                onChange={(e) => setFormData({ ...formData, rule_sid: e.target.value })}
              />
            </FormControl>

            <FormControl isRequired mb={4}>
              <FormLabel>Category</FormLabel>
              <Select
                placeholder="Select category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Malware">Malware</option>
                <option value="Intrusion">Intrusion</option>
                <option value="DDoS">DDoS</option>
                <option value="SQL Injection">SQL Injection</option>
                <option value="XSS">XSS</option>
                <option value="Brute Force">Brute Force</option>
                <option value="Port Scan">Port Scan</option>
                <option value="Other">Other</option>
              </Select>
            </FormControl>

            <FormControl isRequired mb={4}>
              <FormLabel>Severity</FormLabel>
              <Select
                placeholder="Select severity"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </Select>
            </FormControl>

            <FormControl isRequired mb={4}>
              <FormLabel>Rule Content</FormLabel>
              <Textarea
                placeholder="Enter rule content/signature"
                value={formData.rule_content}
                onChange={(e) => setFormData({ ...formData, rule_content: e.target.value })}
                rows={4}
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Description</FormLabel>
              <Textarea
                placeholder="Enter rule description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onAddClose} mr={3}>
              Cancel
            </Button>
            <Button
              colorScheme="brand"
              onClick={handleSubmitAdd}
              isLoading={isSubmitting}
              isDisabled={!formData.rule_name || !formData.category || !formData.severity || !formData.rule_content}
            >
              Create Rule
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Rule Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit IDS Rule</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl isRequired mb={4}>
              <FormLabel>Rule Name</FormLabel>
              <Input
                placeholder="Enter rule name"
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Rule SID</FormLabel>
              <Input
                placeholder="Enter rule SID (optional)"
                value={formData.rule_sid}
                onChange={(e) => setFormData({ ...formData, rule_sid: e.target.value })}
              />
            </FormControl>

            <FormControl isRequired mb={4}>
              <FormLabel>Category</FormLabel>
              <Select
                placeholder="Select category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Malware">Malware</option>
                <option value="Intrusion">Intrusion</option>
                <option value="DDoS">DDoS</option>
                <option value="SQL Injection">SQL Injection</option>
                <option value="XSS">XSS</option>
                <option value="Brute Force">Brute Force</option>
                <option value="Port Scan">Port Scan</option>
                <option value="Other">Other</option>
              </Select>
            </FormControl>

            <FormControl isRequired mb={4}>
              <FormLabel>Severity</FormLabel>
              <Select
                placeholder="Select severity"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </Select>
            </FormControl>

            <FormControl isRequired mb={4}>
              <FormLabel>Rule Content</FormLabel>
              <Textarea
                placeholder="Enter rule content/signature"
                value={formData.rule_content}
                onChange={(e) => setFormData({ ...formData, rule_content: e.target.value })}
                rows={4}
              />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Description</FormLabel>
              <Textarea
                placeholder="Enter rule description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onEditClose} mr={3}>
              Cancel
            </Button>
            <Button
              colorScheme="brand"
              onClick={handleSubmitEdit}
              isLoading={isSubmitting}
              isDisabled={!formData.rule_name || !formData.category || !formData.severity || !formData.rule_content}
            >
              Update Rule
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
              Delete IDS Rule
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the rule "{selectedRule?.rule_name}"? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleConfirmDelete}
                ml={3}
                isLoading={isSubmitting}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}