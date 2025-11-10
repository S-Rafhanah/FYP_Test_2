import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { FiSearch, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';

const statusColor = (s) =>
  ({
    Active: 'green',
    Inactive: 'yellow',
    Pending: 'blue',
    Deleted: 'red',
    Suspended: 'orange',
  }[s] || 'gray');

export default function UserAccounts() {
  // ===== Color tokens aligned to SignIn page =====
  const textColor = useColorModeValue('navy.700', 'white');
  const textColorSecondary = useColorModeValue('gray.600', 'gray.300');
  const textColorBrand = useColorModeValue('brand.500', 'brand.400');
  const cardBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const hoverBg = useColorModeValue('gray.200', 'whiteAlpha.200');

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure(); // Add modal
  const viewDisclosure = useDisclosure(); // View modal
  const editDisclosure = useDisclosure(); // Edit modal

  // NEW: delete confirmations (two-step)
  const deleteStep1 = useDisclosure();
  const deleteStep2 = useDisclosure();
  const cancelRef1 = useRef();
  const cancelRef2 = useRef();

  // ===== Table state =====
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // ===== Filters (Role & Status) =====
  const [filterRole, setFilterRole] = useState(''); // '' = show all roles
  const [filterStatus, setFilterStatus] = useState(''); // '' = show all statuses

  // ===== Filtered rows based on dropdown selections =====
  const filteredRows = useMemo(() => {
    return rows.filter((user) => {
      const roleMatch = !filterRole || user.role === filterRole;
      const statusMatch = !filterStatus || user.status === filterStatus;
      return roleMatch && statusMatch;
    });
  }, [rows, filterRole, filterStatus]);

  // ===== Selected user (view / edit / delete) =====
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ===== Add form state =====
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: '',
  });
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  // ===== Edit form state =====
  const [editForm, setEditForm] = useState({
    id: null,
    name: '',
    email: '',
    role: '',
    password: '',
    confirm: '',
  });
  const [editTouched, setEditTouched] = useState({});
  const [updating, setUpdating] = useState(false);

  // ===== Validation (Add) =====
  const errors = useMemo(() => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 8)
      e.password = 'Use at least 8 characters.';
    if (!form.confirm) e.confirm = 'Please confirm the password.';
    else if (form.confirm !== form.password)
      e.confirm = 'Passwords do not match.';
    if (!form.role) e.role = 'Select a role.';
    return e;
  }, [form]);

  // ===== Validation (Edit – password optional) =====
  const editErrors = useMemo(() => {
    const e = {};
    if (!editForm.name.trim()) e.name = 'Full name is required.';
    if (!editForm.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email))
      e.email = 'Enter a valid email.';
    if (!editForm.role) e.role = 'Select a role.';
    if (editForm.password) {
      if (editForm.password.length < 8)
        e.password = 'Use at least 8 characters.';
      if (editForm.confirm !== editForm.password)
        e.confirm = 'Passwords do not match.';
    }
    return e;
  }, [editForm]);

  // ===== Helpers =====
  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));
  const handleBlur = (field) => setTouched((t) => ({ ...t, [field]: true }));
  const resetForm = () => {
    setForm({ name: '', email: '', password: '', confirm: '', role: '' });
    setTouched({});
  };

  const handleEditChange = (field) => (e) =>
    setEditForm((f) => ({ ...f, [field]: e.target.value }));
  const handleEditBlur = (field) =>
    setEditTouched((t) => ({ ...t, [field]: true }));
  const resetEditForm = () => {
    setEditForm({
      id: null,
      name: '',
      email: '',
      role: '',
      password: '',
      confirm: '',
    });
    setEditTouched({});
  };

  // ===== Load users from backend on mount =====
  const loadUsers = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await fetch('/api/users'); // CRA dev proxy -> http://localhost:3001
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
      const data = await res.json();
      const mapped = data.map((u) => ({
        id: u.id, // keep id for edit/delete
        name: u.name,
        email: u.email,
        status: u.status || 'Active',
        role: u.role,
        joined: u.joined_at
          ? new Date(u.joined_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '—',
        lastActive: u.last_active ? 'recently' : '—',
      }));
      setRows(mapped);
    } catch (err) {
      setLoadError(err.message || 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // ===== Create user (Save Info) =====
  const handleSave = async () => {
    if (Object.keys(errors).length) {
      setTouched({
        name: true,
        email: true,
        password: true,
        confirm: true,
        role: true,
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to create user');
      }

      const created = await res.json();

      // Optimistic update (keep id)
      setRows((r) => [
        {
          id: created.id,
          name: created.name,
          email: created.email,
          status: 'Active',
          role: created.role,
          joined: created.joined_at
            ? new Date(created.joined_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : new Date().toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
          lastActive: 'just now',
        },
        ...r,
      ]);

      toast({
        title: 'Successfully created user account',
        status: 'success',
        isClosable: true,
      });
      onClose();
      resetForm();
    } catch (err) {
      toast({
        title: 'Could not create user',
        description: err.message,
        status: 'error',
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  // ===== Update user (Edit modal) =====
  const handleUpdate = async () => {
    if (Object.keys(editErrors).length) {
      setEditTouched({
        name: true,
        email: true,
        role: true,
        ...(editForm.password ? { password: true, confirm: true } : {}),
      });
      return;
    }
    setUpdating(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        role: editForm.role,
      };
      if (editForm.password) payload.password = editForm.password;

      const res = await fetch(`/api/users/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to update user');
      }

      const updated = await res.json();

      setRows((prev) =>
        prev.map((row) =>
          row.id === updated.id
            ? {
                ...row,
                name: updated.name,
                email: updated.email,
                role: updated.role,
                status: updated.status || row.status,
              }
            : row,
        ),
      );

      toast({ title: 'User updated', status: 'success', isClosable: true });
      editDisclosure.onClose();
      resetEditForm();
    } catch (err) {
      toast({
        title: 'Could not update user',
        description: err.message,
        status: 'error',
        isClosable: true,
      });
    } finally {
      setUpdating(false);
    }
  };

  // ===== Delete user (two-step confirm) =====
  const askDelete = (row) => {
    setDeleteTarget(row);
    deleteStep1.onOpen();
  };

  const proceedDeleteStep2 = () => {
    deleteStep1.onClose();
    deleteStep2.onOpen();
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to delete user');
      }

      // Remove from table
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));

      toast({
        title: 'Successfully deleted user account',
        status: 'success',
        isClosable: true,
      });
      deleteStep2.onClose();
      setDeleteTarget(null);
    } catch (err) {
      toast({
        title: 'Could not delete user',
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
            placeholder="Search users..."
            color={textColor}
            _placeholder={{ color: textColorSecondary }}
            borderColor={borderColor}
            _hover={{ borderColor }}
            _focus={{ borderColor }}
            bg={useColorModeValue('white', 'transparent')}
          />
        </InputGroup>

        <Select
          maxW="200px"
          placeholder="Role" // empty selection means "All"
          value={filterRole} // <-- controlled
          onChange={(e) => setFilterRole(e.target.value)}
          color={textColor}
          borderColor={borderColor}
          _hover={{ borderColor }}
          _focus={{ borderColor }}
          sx={{ option: { color: textColor } }}
          bg={useColorModeValue('white', 'transparent')}
        >
          <option value="Platform Administrator">Platform Administrator</option>
          <option value="Network Administrator">Network Administrator</option>
          <option value="Security Analyst">Security Analyst</option>
        </Select>

        <Select
          maxW="200px"
          placeholder="Status" // empty selection means "All"
          value={filterStatus} // <-- controlled
          onChange={(e) => setFilterStatus(e.target.value)}
          color={textColor}
          borderColor={borderColor}
          _hover={{ borderColor }}
          _focus={{ borderColor }}
          sx={{ option: { color: textColor } }}
          bg={useColorModeValue('white', 'transparent')}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Pending">Pending</option>
          <option value="Suspended">Suspended</option>
          <option value="Deleted">Deleted</option>
        </Select>

        <Button ms="auto" variant="brand" onClick={onOpen}>
          + Add User
        </Button>
      </Flex>

      {/* Loading / Error / Table */}
      {loading ? (
        <Flex align="center" gap={3}>
          <Spinner /> <Text color={textColorSecondary}>Loading users…</Text>
        </Flex>
      ) : loadError ? (
        <Text color="red.400">Failed to load users: {loadError}</Text>
      ) : (
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              {[
                'Full Name',
                'Email',
                'Status',
                'Role',
                'Joined Date',
                'Last Active',
                'Actions',
              ].map((h) => (
                <Th key={h} color={textColorSecondary}>
                  {h}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {filteredRows.map((r) => (
              <Tr key={r.id ?? r.email}>
                <Td>
                  <Text fontWeight="semibold" color={textColor}>
                    {r.name}
                  </Text>
                </Td>
                <Td>
                  <Text color={textColorSecondary}>{r.email}</Text>
                </Td>
                <Td>
                  <Badge colorScheme={statusColor(r.status)}>{r.status}</Badge>
                </Td>
                <Td>
                  <Text color={textColor}>{r.role}</Text>
                </Td>
                <Td>
                  <Text color={textColorSecondary}>{r.joined}</Text>
                </Td>
                <Td>
                  <Text color={textColorSecondary}>{r.lastActive}</Text>
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
                      setSelectedUser(r);
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
                      setSelectedUser(r);
                      setEditForm({
                        id: r.id,
                        name: r.name,
                        email: r.email,
                        role: r.role,
                        password: '',
                        confirm: '',
                      });
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
                    onClick={() => askDelete(r)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          resetForm();
        }}
        size="lg"
        isCentered
      >
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>Add User</ModalHeader>
          <ModalCloseButton color={textColorSecondary} />
          <ModalBody>
            <Flex direction="column" gap={4}>
              <FormControl isInvalid={touched.name && !!errors.name}>
                <FormLabel color={textColor}>Full Name</FormLabel>
                <Input
                  value={form.name}
                  onChange={handleChange('name')}
                  onBlur={() => handleBlur('name')}
                  placeholder="Jane Doe"
                  color={textColor}
                  _placeholder={{ color: textColorSecondary }}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  bg={useColorModeValue('white', 'transparent')}
                />
                <FormErrorMessage>{errors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={touched.email && !!errors.email}>
                <FormLabel color={textColor}>Email address</FormLabel>
                <Input
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  onBlur={() => handleBlur('email')}
                  placeholder="jane.doe@company.com"
                  color={textColor}
                  _placeholder={{ color: textColorSecondary }}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  bg={useColorModeValue('white', 'transparent')}
                />
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={touched.password && !!errors.password}>
                <FormLabel color={textColor}>Password</FormLabel>
                <Input
                  type="password"
                  value={form.password}
                  onChange={handleChange('password')}
                  onBlur={() => handleBlur('password')}
                  placeholder="Minimum 8 characters"
                  color={textColor}
                  _placeholder={{ color: textColorSecondary }}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  bg={useColorModeValue('white', 'transparent')}
                />
                <FormErrorMessage>{errors.password}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={touched.confirm && !!errors.confirm}>
                <FormLabel color={textColor}>Confirm Password</FormLabel>
                <Input
                  type="password"
                  value={form.confirm}
                  onChange={handleChange('confirm')}
                  onBlur={() => handleBlur('confirm')}
                  color={textColor}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  bg={useColorModeValue('white', 'transparent')}
                />
                <FormErrorMessage>{errors.confirm}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={touched.role && !!errors.role}>
                <FormLabel color={textColor}>Role</FormLabel>
                <Select
                  placeholder="Select role"
                  value={form.role}
                  onChange={handleChange('role')}
                  onBlur={() => handleBlur('role')}
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
                <FormErrorMessage>{errors.role}</FormErrorMessage>
              </FormControl>
            </Flex>
          </ModalBody>

          <ModalFooter>
            <Button
              mr={3}
              onClick={() => {
                onClose();
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
              Save Info
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View User Modal (read-only) */}
      <Modal
        isOpen={viewDisclosure.isOpen}
        onClose={viewDisclosure.onClose}
        size="md"
        isCentered
      >
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader color={textColor}>User Details</ModalHeader>
          <ModalCloseButton color={textColorSecondary} />
          <ModalBody>
            {selectedUser ? (
              <Box>
                <Text color={textColor} mb={2}>
                  <strong>Full Name:</strong> {selectedUser.name}
                </Text>
                <Text color={textColor} mb={2}>
                  <strong>Email:</strong> {selectedUser.email}
                </Text>
                <Text color={textColor} mb={2}>
                  <strong>Role:</strong> {selectedUser.role}
                </Text>
                <Text color={textColor} mb={2}>
                  <strong>Status:</strong> {selectedUser.status}
                </Text>
                <Text color={textColorSecondary} mb={2}>
                  <strong>Joined Date:</strong> {selectedUser.joined}
                </Text>
                <Text color={textColorSecondary}>
                  <strong>Last Active:</strong> {selectedUser.lastActive}
                </Text>
              </Box>
            ) : (
              <Text color={textColorSecondary}>No user selected.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="brand" onClick={viewDisclosure.onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit User Modal */}
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
          <ModalHeader color={textColor}>Edit User</ModalHeader>
          <ModalCloseButton color={textColorSecondary} />
          <ModalBody>
            <Flex direction="column" gap={4}>
              <FormControl isInvalid={editTouched.name && !!editErrors.name}>
                <FormLabel color={textColor}>Full Name</FormLabel>
                <Input
                  value={editForm.name}
                  onChange={handleEditChange('name')}
                  onBlur={() => handleEditBlur('name')}
                  placeholder="Jane Doe"
                  color={textColor}
                  _placeholder={{ color: textColorSecondary }}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  bg={useColorModeValue('white', 'transparent')}
                />
                <FormErrorMessage>{editErrors.name}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={editTouched.email && !!editErrors.email}>
                <FormLabel color={textColor}>Email address</FormLabel>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={handleEditChange('email')}
                  onBlur={() => handleEditBlur('email')}
                  placeholder="jane.doe@company.com"
                  color={textColor}
                  _placeholder={{ color: textColorSecondary }}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  bg={useColorModeValue('white', 'transparent')}
                />
                <FormErrorMessage>{editErrors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={editTouched.role && !!editErrors.role}>
                <FormLabel color={textColor}>Role</FormLabel>
                <Select
                  placeholder="Select role"
                  value={editForm.role}
                  onChange={handleEditChange('role')}
                  onBlur={() => handleEditBlur('role')}
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
                <FormErrorMessage>{editErrors.role}</FormErrorMessage>
              </FormControl>

              <FormControl
                isInvalid={editTouched.password && !!editErrors.password}
              >
                <FormLabel color={textColor}>New Password (optional)</FormLabel>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={handleEditChange('password')}
                  onBlur={() => handleEditBlur('password')}
                  placeholder="Leave blank to keep current password"
                  color={textColor}
                  _placeholder={{ color: textColorSecondary }}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  bg={useColorModeValue('white', 'transparent')}
                />
                <FormErrorMessage>{editErrors.password}</FormErrorMessage>
              </FormControl>

              <FormControl
                isInvalid={editTouched.confirm && !!editErrors.confirm}
              >
                <FormLabel color={textColor}>Confirm New Password</FormLabel>
                <Input
                  type="password"
                  value={editForm.confirm}
                  onChange={handleEditChange('confirm')}
                  onBlur={() => handleEditBlur('confirm')}
                  color={textColor}
                  borderColor={borderColor}
                  _hover={{ borderColor }}
                  _focus={{ borderColor }}
                  bg={useColorModeValue('white', 'transparent')}
                />
                <FormErrorMessage>{editErrors.confirm}</FormErrorMessage>
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

      {/* Delete: Step 1 confirmation */}
      <AlertDialog
        isOpen={deleteStep1.isOpen}
        leastDestructiveRef={cancelRef1}
        onClose={deleteStep1.onClose}
        isCentered
      >
        <AlertDialogOverlay />
        <AlertDialogContent bg={cardBg}>
          <AlertDialogHeader color={textColor}>
            Delete account?
          </AlertDialogHeader>
          <AlertDialogBody color={textColorSecondary}>
            You’re about to delete{' '}
            <Text as="span" color={textColor} fontWeight="semibold">
              {deleteTarget?.name}
            </Text>
            . This action will remove the account and related records.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              ref={cancelRef1}
              onClick={deleteStep1.onClose}
              variant="ghost"
              color={textColor}
            >
              Cancel
            </Button>
            <Button colorScheme="red" onClick={proceedDeleteStep2} ml={3}>
              Delete Account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete: Step 2 double-confirm */}
      <AlertDialog
        isOpen={deleteStep2.isOpen}
        leastDestructiveRef={cancelRef2}
        onClose={deleteStep2.onClose}
        isCentered
      >
        <AlertDialogOverlay />
        <AlertDialogContent bg={cardBg}>
          <AlertDialogHeader color={textColor}>
            Are you absolutely sure?
          </AlertDialogHeader>
          <AlertDialogBody color={textColorSecondary}>
            This action is permanent. The account for{' '}
            <Text as="span" color={textColor} fontWeight="semibold">
              {deleteTarget?.email}
            </Text>{' '}
            will be removed and cannot be recovered.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              ref={cancelRef2}
              onClick={deleteStep2.onClose}
              variant="ghost"
              color={textColor}
            >
              Back
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDelete}
              ml={3}
              isLoading={deleting}
              loadingText="Deleting..."
            >
              Permanently Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
