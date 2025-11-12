import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  useDisclosure,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  FormControl,
  FormLabel,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdSecurity, MdLock, MdLockOpen } from 'react-icons/md';
import axios from 'axios';
import MFASetup from './MFASetup';

const MFAManagement = ({ userId }) => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disablePassword, setDisablePassword] = useState('');
  const { isOpen: isSetupOpen, onOpen: onSetupOpen, onClose: onSetupClose } = useDisclosure();
  const { isOpen: isDisableOpen, onOpen: onDisableOpen, onClose: onDisableClose } = useDisclosure();
  const toast = useToast();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Get auth token
  const getToken = () => localStorage.getItem('accessToken');

  // Get current user from localStorage
  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  };

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    setLoading(true);
    try {
      const user = getCurrentUser();
      if (!user || !user.id) {
        throw new Error('User not found');
      }

      const response = await axios.get(
        `${API_URL}/api/auth/mfa/status/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      setMfaEnabled(response.data.mfa_enabled);
    } catch (err) {
      console.error('Error checking MFA status:', err);
      toast({
        title: 'Error',
        description: 'Failed to check MFA status',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMFAEnabled = () => {
    setMfaEnabled(true);
    onSetupClose();
  };

  const handleDisableMFA = async () => {
    if (!disablePassword) {
      toast({
        title: 'Error',
        description: 'Password is required to disable MFA',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/auth/mfa/disable`,
        { password: disablePassword },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      setMfaEnabled(false);
      setDisablePassword('');
      onDisableClose();
      toast({
        title: 'Success',
        description: 'MFA has been disabled',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to disable MFA',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Card bg={bgColor} borderWidth={1} borderColor={borderColor}>
        <CardBody>
          <Text>Loading MFA settings...</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card bg={bgColor} borderWidth={1} borderColor={borderColor}>
        <CardHeader>
          <HStack justify="space-between">
            <HStack>
              <MdSecurity size={24} />
              <Heading size="md">Two-Factor Authentication</Heading>
            </HStack>
            <Badge colorScheme={mfaEnabled ? 'green' : 'gray'}>
              {mfaEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack align="stretch" spacing={4}>
            <Text>
              Two-factor authentication adds an extra layer of security to your account. You'll need
              to enter a code from your authenticator app each time you sign in.
            </Text>

            {mfaEnabled ? (
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>MFA is enabled</AlertTitle>
                  <AlertDescription>
                    Your account is protected with two-factor authentication.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>MFA is not enabled</AlertTitle>
                  <AlertDescription>
                    We recommend enabling MFA to secure your account.
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            <HStack>
              {mfaEnabled ? (
                <Button
                  leftIcon={<MdLockOpen />}
                  colorScheme="red"
                  variant="outline"
                  onClick={onDisableOpen}
                >
                  Disable MFA
                </Button>
              ) : (
                <Button leftIcon={<MdLock />} colorScheme="blue" onClick={onSetupOpen}>
                  Enable MFA
                </Button>
              )}
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* MFA Setup Modal */}
      <MFASetup
        isOpen={isSetupOpen}
        onClose={onSetupClose}
        userId={userId}
        onMFAEnabled={handleMFAEnabled}
      />

      {/* Disable MFA Modal */}
      <Modal isOpen={isDisableOpen} onClose={onDisableClose}>
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader>Disable Two-Factor Authentication</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Are you sure?</AlertTitle>
                  <AlertDescription>
                    Disabling MFA will make your account less secure. Enter your password to
                    confirm.
                  </AlertDescription>
                </Box>
              </Alert>

              <FormControl>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDisableClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDisableMFA}
              isDisabled={!disablePassword}
            >
              Disable MFA
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default MFAManagement;
