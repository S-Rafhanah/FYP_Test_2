import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  VStack,
  HStack,
  Input,
  useToast,
  Box,
  Image,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import axios from 'axios';

const MFASetup = ({ isOpen, onClose, userId, onMFAEnabled }) => {
  const [step, setStep] = useState(1); // 1: QR Code, 2: Verify, 3: Backup Codes
  const [qrCode, setQRCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Get auth token
  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    if (isOpen && step === 1) {
      initiateMFASetup();
    }
  }, [isOpen, step]);

  const initiateMFASetup = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/mfa/setup`,
        {},
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      setQRCode(response.data.qrCode);
      setSecret(response.data.secret);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to setup MFA');
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Failed to setup MFA',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnableMFA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/mfa/verify-setup`,
        { token: verificationCode },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      setBackupCodes(response.data.backupCodes);
      setStep(3); // Show backup codes
      toast({
        title: 'Success',
        description: 'MFA enabled successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code');
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Invalid verification code',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setQRCode('');
    setSecret('');
    setVerificationCode('');
    setBackupCodes([]);
    setError('');
    if (step === 3 && onMFAEnabled) {
      onMFAEnabled();
    }
    onClose();
  };

  const downloadBackupCodes = () => {
    const element = document.createElement('a');
    const file = new Blob(
      [
        'Syntra IDS Dashboard - MFA Backup Codes\n\n',
        'IMPORTANT: Save these codes in a secure location.\n',
        'Each code can only be used once.\n\n',
        backupCodes.join('\n'),
      ],
      { type: 'text/plain' }
    );
    element.href = URL.createObjectURL(file);
    element.download = 'syntra-mfa-backup-codes.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast({
      title: 'Copied!',
      description: 'Backup codes copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader>
          {step === 1 && 'Set Up Two-Factor Authentication'}
          {step === 2 && 'Verify Your Code'}
          {step === 3 && 'Save Your Backup Codes'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {step === 1 && (
            <VStack spacing={4} align="stretch">
              <Text>
                Scan the QR code below with your authenticator app (Google Authenticator, Authy,
                Microsoft Authenticator, etc.)
              </Text>

              {loading ? (
                <Box textAlign="center" py={8}>
                  <Text>Generating QR code...</Text>
                </Box>
              ) : qrCode ? (
                <Box textAlign="center" borderWidth={1} borderColor={borderColor} borderRadius="md" p={4}>
                  <Image src={qrCode} alt="MFA QR Code" mx="auto" maxW="250px" />
                </Box>
              ) : null}

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Manual Entry</AlertTitle>
                  <AlertDescription>
                    If you can't scan the QR code, enter this secret key manually:
                    <Code display="block" mt={2} p={2} fontSize="sm">
                      {secret}
                    </Code>
                  </AlertDescription>
                </Box>
              </Alert>

              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
            </VStack>
          )}

          {step === 2 && (
            <VStack spacing={4} align="stretch">
              <Text>Enter the 6-digit code from your authenticator app to verify the setup:</Text>

              <Input
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                size="lg"
                textAlign="center"
                fontSize="2xl"
                maxLength={6}
                autoFocus
              />

              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
            </VStack>
          )}

          {step === 3 && (
            <VStack spacing={4} align="stretch">
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Important!</AlertTitle>
                  <AlertDescription>
                    Save these backup codes in a secure location. Each code can only be used once to
                    access your account if you lose your authenticator device.
                  </AlertDescription>
                </Box>
              </Alert>

              <Box borderWidth={1} borderColor={borderColor} borderRadius="md" p={4}>
                <VStack spacing={2}>
                  {backupCodes.map((code, index) => (
                    <Code key={index} w="100%" p={2} fontSize="md" textAlign="center">
                      {code}
                    </Code>
                  ))}
                </VStack>
              </Box>

              <HStack>
                <Button colorScheme="blue" onClick={downloadBackupCodes} flex={1}>
                  Download Codes
                </Button>
                <Button variant="outline" onClick={copyBackupCodes} flex={1}>
                  Copy to Clipboard
                </Button>
              </HStack>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {step === 1 && (
            <>
              <Button variant="ghost" mr={3} onClick={handleClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={() => setStep(2)} isDisabled={!qrCode}>
                Next
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="ghost" mr={3} onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                colorScheme="blue"
                onClick={verifyAndEnableMFA}
                isLoading={loading}
                isDisabled={verificationCode.length !== 6}
              >
                Verify & Enable
              </Button>
            </>
          )}

          {step === 3 && (
            <Button colorScheme="blue" onClick={handleClose} w="100%">
              Done
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default MFASetup;
