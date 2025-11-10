import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Spinner,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@chakra-ui/react';
import { FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';

// ---- Helper: normalize legacy short labels to full names ----
const normalizeProfileName = (n = '') => {
  const map = {
    'Platform Admin': 'Platform Administrator',
    'Network Admin': 'Network Administrator',
    'platform admin': 'Platform Administrator',
    'network admin': 'Network Administrator',
  };
  return map[n] || n;
};

const statusColor = (s) =>
  ({
    Active: 'green',
    Inactive: 'yellow',
  }[s] || 'gray');

export default function ProfileTypes() {
  // Colors (aligned with your pages)
  const textColor = useColorModeValue('navy.700', 'white');
  const textColorSecondary = useColorModeValue('gray.600', 'gray.300');
  const cardBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const hoverBg = useColorModeValue('gray.200', 'whiteAlpha.200');

  const toast = useToast();

  // Disclosures
  const addDisclosure = useDisclosure(); // Add modal
  const viewDisclosure = useDisclosure(); // View modal
  const editDisclosure = useDisclosure(); // Edit modal
  const deleteDisclosure = useDisclosure(); // Delete confirm

  // Table state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Selected profile for view/edit/delete
  const [selected, setSelected] = useState(null);

  // Add form state
  const [form, setForm] = useState({ name: '', status: 'Active' });
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    id: null,
    name: '',
    status: 'Active',
  });
  const [editTouched, setEditTouched] = useState({});
  const [updating, setUpdating] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(false);
  const cancelRef = React.useRef();

  // Validation: Add
  const errors = useMemo(() => {
    const e = {};
    if (!form.name) e.name = 'Please select a profile type.';
    if (!form.status) e.status = 'Please select a status.';
    return e;
  }, [form]);

  // Validation: Edit
  const editErrors = useMemo(() => {
    const e = {};
    if (!editForm.name) e.name = 'Please select a profile type.';
    if (!editForm.status) e.status = 'Please select a status.';
    return e;
  }, [editForm]);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));
  const handleBlur = (field) => setTouched((t) => ({ ...t, [field]: true }));
  const resetForm = () => {
    setForm({ name: '', status: 'Active' });
    setTouched({});
  };

  const handleEditChange = (field) => (e) =>
    setEditForm((f) => ({ ...f, [field]: e.target.value }));
  const handleEditBlur = (field) =>
    setEditTouched((t) => ({ ...t, [field]: true }));
  const resetEditForm = () => {
    setEditForm({ id: null, name: '', status: 'Active' });
    setEditTouched({});
  };

  // Load profiles from backend
  const loadProfiles = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await fetch('/api/profile-types'); // CRA dev proxy -> 3001
      if (!res.ok) throw new Error(`Failed to load profiles (${res.status})`);
      const data = await res.json();
      const mapped = data.map((p) => ({
        id: p.id,
        name: normalizeProfileName(p.name),
        status: p.status || 'Active',
        created: p.created_at
          ? new Date(p.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '—',
      }));
      setRows(mapped);
    } catch (err) {
      setLoadError(err.message || 'Error loading profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // Create profile
  const handleSave = async () => {
    if (Object.keys(errors).length) {
      setTouched({ name: true, status: true });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/profile-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          status: form.status,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to create profile');
      }
      const created = await res.json();
      setRows((prev) => [
        {
          id: created.id,
          name: normalizeProfileName(created.name),
          status: created.status || 'Active',
          created: created.created_at
            ? new Date(created.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : new Date().toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
        },
        ...prev,
      ]);
      toast({ title: 'Profile created', status: 'success', isClosable: true });
      addDisclosure.onClose();
      resetForm();
    } catch (err) {
      toast({
        title: 'Could not create profile',
        description: err.message,
        status: 'error',
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  // Update profile
  const handleUpdate = async () => {
    if (Object.keys(editErrors).length) {
      setEditTouched({ name: true, status: true });
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/profile-types/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          status: editForm.status,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to update profile');
      }
      const updated = await res.json();
      setRows((prev) =>
        prev.map((r) =>
          r.id === updated.id
            ? {
                ...r,
                name: normalizeProfileName(updated.name),
                status: updated.status || r.status,
              }
            : r,
        ),
      );
      toast({ title: 'Profile updated', status: 'success', isClosable: true });
      editDisclosure.onClose();
      resetEditForm();
    } catch (err) {
      toast({
        title: 'Could not update profile',
        description: err.message,
        status: 'error',
        isClosable: true,
      });
    } finally {
      setUpdating(false);
    }
  };

  // Delete profile
  const handleDelete = async () => {
    if (!selected?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/profile-types/${selected.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to delete profile');
      }
      setRows((prev) => prev.filter((r) => r.id !== selected.id));
      toast({
        title: 'Successfully deleted profile',
        status: 'success',
        isClosable: true,
      });
      deleteDisclosure.onClose();
      setSelected(null);
    } catch (err) {
      toast({
        title: 'Could not delete profile',
        description: err.message,
        status: 'error',
        isClosable: true,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box color={textColor}>
      {/* Toolbar */}
      <Flex gap={3} wrap="wrap" mb={4} align="center">
        <InputGroup maxW="320px">
          <InputLeftElement pointerEvents="none">
            <FiSearch />
          </InputLeftElement>
          <Input
            placeholder="Search profiles..."
            color={textColor}
            _placeholder={{ color: textColorSecondary }}
            borderColor={borderColor}
            _hover={{ borderColor }}
            _focus={{ borderColor }}
            bg={useColorModeValue('white', 'transparent')}
          />
        </InputGroup>

        <Button
          ms="auto"
          variant="brand"
          leftIcon={<FiPlus />}
          onClick={addDisclosure.onOpen}
        >
          Add Profile
        </Button>
      </Flex>

      {/* Loading / Error / Table */}
      {loading ? (
        <Flex align="center" gap={3}>
          <Spinner /> <Text color={textColorSecondary}>Loading profiles…</Text>
        </Flex>
      ) : loadError ? (
        <Text color="red.400">Failed to load profiles: {loadError}</Text>
      ) : (
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              {['Profile Name', 'Status', 'Created At', 'Actions'].map((h) => (
                <Th key={h} color={textColorSecondary}>
                  {h}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td>
                  <Text fontWeight="semibold" color={textColor}>
                    {r.name}
                  </Text>
                </Td>
                <Td>
                  <Badge colorScheme={statusColor(r.status)}>{r.status}</Badge>
                </Td>
                <Td>
                  <Text color={textColorSecondary}>{r.created}</Text>
                </Td>
                <Td isNumeric>
                  <IconButton
                    aria-label="View"
                    icon={<FiEye />}
                    variant="ghost"
                    size="sm"
                    color={textColor}
                    mr={1}
                    _hover={{ bg: hoverBg }}
                    onClick={() => {
                      setSelected(r);
                      viewDisclosure.onOpen();
                    }}
                  />
                  <IconButton
                    aria-label="Edit"
                    icon={<FiEdit2 />}
                    variant="ghost"
                    size="sm"
                    color={textColor}
                    mr={1}
                    _hover={{ bg: hoverBg }}
                    onClick={() => {
                      setSelected(r);
                      setEditForm({ id: r.id, name: r.name, status: r.status });
                      setEditTouched({});
                      editDisclosure.onOpen();
                    }}
                  />
                  <IconButton
                    aria-label="Delete"
                    icon={<FiTrash2 />}
                    variant="ghost"
                    size="sm"
                    colorScheme="red"
                    _hover={{ bg: hoverBg }}
                    onClick={() => {
                      setSelected(r);
                      deleteDisclosure.onOpen();
                    }}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Add Profile Modal */}
      <Modal
        isOpen={addDisclosure.isOpen}
        onClose={() => {
          addDisclosure.onClose();
          resetForm();
        }}
        size="lg"
        isCentered
      >
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>Add Profile</ModalHeader>
          <ModalCloseButton color={textColorSecondary} />
          <ModalBody>
            <Flex direction="column" gap={4}>
              <FormControl isInvalid={touched.name && !!errors.name}>
                <FormLabel color={textColor}>Profile Type</FormLabel>
                <Select
                  placeholder="Select profile type"
                  value={form.name}
                  onChange={handleChange('name')}
                  onBlur={() => handleBlur('name')}
                  color={textColor}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  sx={{ option: { color: textColor } }}
                  bg={useColorModeValue('white', 'transparent')}
                >
                  <option value="Platform Administrator">
                    Platform Administrator
                  </option>
                  <option value="Network Administrator">
                    Network Administrator
                  </option>
                  <option value="Security Analyst">Security Analyst</option>
                </Select>
                <FormErrorMessage>{errors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={touched.status && !!errors.status}>
                <FormLabel color={textColor}>Status</FormLabel>
                <Select
                  value={form.status}
                  onChange={handleChange('status')}
                  onBlur={() => handleBlur('status')}
                  color={textColor}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  sx={{ option: { color: textColor } }}
                  bg={useColorModeValue('white', 'transparent')}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Select>
                <FormErrorMessage>{errors.status}</FormErrorMessage>
              </FormControl>
            </Flex>
          </ModalBody>

          <ModalFooter>
            <Button
              mr={3}
              onClick={() => {
                addDisclosure.onClose();
                resetForm();
              }}
              variant="ghost"
              color={textColor}
            >
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={handleSave}
              isLoading={saving}
              loadingText="Saving..."
            >
              Save Profile
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Profile Modal (read-only) */}
      <Modal
        isOpen={viewDisclosure.isOpen}
        onClose={viewDisclosure.onClose}
        size="md"
        isCentered
      >
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>Profile Details</ModalHeader>
          <ModalCloseButton color={textColorSecondary} />
          <ModalBody>
            {selected ? (
              <Box>
                <Text color={textColor} mb={2}>
                  <strong>Profile Name:</strong> {selected.name}
                </Text>
                <Text color={textColor} mb={2}>
                  <strong>Status:</strong> {selected.status}
                </Text>
                <Text color={textColorSecondary}>
                  <strong>Created At:</strong> {selected.created}
                </Text>
              </Box>
            ) : (
              <Text color={textColorSecondary}>No profile selected.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="brand" onClick={viewDisclosure.onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editDisclosure.isOpen}
        onClose={() => {
          editDisclosure.onClose();
          resetEditForm();
        }}
        size="lg"
        isCentered
      >
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>Edit Profile</ModalHeader>
          <ModalCloseButton color={textColorSecondary} />
          <ModalBody>
            <Flex direction="column" gap={4}>
              <FormControl isInvalid={editTouched.name && !!editErrors.name}>
                <FormLabel color={textColor}>Profile Type</FormLabel>
                <Select
                  placeholder="Select profile type"
                  value={editForm.name}
                  onChange={handleEditChange('name')}
                  onBlur={() => handleEditBlur('name')}
                  color={textColor}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  sx={{ option: { color: textColor } }}
                  bg={useColorModeValue('white', 'transparent')}
                >
                  <option value="Platform Administrator">
                    Platform Administrator
                  </option>
                  <option value="Network Administrator">
                    Network Administrator
                  </option>
                  <option value="Security Analyst">Security Analyst</option>
                </Select>
                <FormErrorMessage>{editErrors.name}</FormErrorMessage>
              </FormControl>

              <FormControl
                isInvalid={editTouched.status && !!editErrors.status}
              >
                <FormLabel color={textColor}>Status</FormLabel>
                <Select
                  value={editForm.status}
                  onChange={handleEditChange('status')}
                  onBlur={() => handleEditBlur('status')}
                  color={textColor}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  sx={{ option: { color: textColor } }}
                  bg={useColorModeValue('white', 'transparent')}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Select>
                <FormErrorMessage>{editErrors.status}</FormErrorMessage>
              </FormControl>
            </Flex>
          </ModalBody>

          <ModalFooter>
            <Button
              mr={3}
              onClick={() => {
                editDisclosure.onClose();
                resetEditForm();
              }}
              variant="ghost"
              color={textColor}
            >
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={handleUpdate}
              isLoading={updating}
              loadingText="Saving..."
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog
        isOpen={deleteDisclosure.isOpen}
        leastDestructiveRef={cancelRef}
        onClose={deleteDisclosure.onClose}
        isCentered
      >
        <AlertDialogOverlay />
        <AlertDialogContent bg={cardBg}>
          <AlertDialogHeader color={textColor} fontSize="lg" fontWeight="bold">
            Delete Profile
          </AlertDialogHeader>

          <AlertDialogBody color={textColorSecondary}>
            Are you sure you want to delete “{selected?.name}”? This action
            cannot be undone.
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button
              ref={cancelRef}
              onClick={deleteDisclosure.onClose}
              variant="ghost"
              color={textColor}
            >
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDelete}
              ml={3}
              isLoading={deleting}
              loadingText="Deleting..."
            >
              Delete Profile
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
