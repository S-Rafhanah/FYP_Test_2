import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  Alert,
  AlertIcon,
  Heading,
  useColorModeValue,
  Link,
} from '@chakra-ui/react';

const MFAVerification = ({ onVerify, onCancel, email }) => {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const textColor = useColorModeValue('navy.700', 'white');
  const textColorSecondary = 'gray.400';
  const brandStars = useColorModeValue('brand.500', 'brand.400');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!code || (useBackupCode ? code.length === 0 : code.length !== 6)) {
      setError(useBackupCode ? 'Please enter a backup code' : 'Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await onVerify(code, useBackupCode);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setCode('');
    setError('');
  };

  return (
    <Box>
      <Heading
        color={textColor}
        fontSize="36px"
        mb="10px"
        textAlign="center"
      >
        Two-Factor Authentication
      </Heading>
      <Text
        mb="36px"
        ms="4px"
        color={textColorSecondary}
        fontWeight="400"
        fontSize="md"
        textAlign="center"
      >
        Enter the {useBackupCode ? 'backup code' : '6-digit code'} from your authenticator app
      </Text>

      <form onSubmit={handleSubmit}>
        <VStack spacing="24px">
          <FormControl>
            <FormLabel
              display="flex"
              ms="4px"
              fontSize="sm"
              fontWeight="500"
              color={textColor}
              mb="8px"
            >
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
              <Text color={brandStars}>*</Text>
            </FormLabel>
            <Input
              isRequired={true}
              variant="auth"
              fontSize="sm"
              placeholder={useBackupCode ? 'Enter backup code' : '000000'}
              value={code}
              onChange={(e) => {
                if (useBackupCode) {
                  setCode(e.target.value.toUpperCase());
                } else {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }
              }}
              size="lg"
              textAlign="center"
              fontSize={useBackupCode ? 'md' : '2xl'}
              maxLength={useBackupCode ? 20 : 6}
              autoFocus
            />
          </FormControl>

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <Button
            fontSize="sm"
            variant="brand"
            fontWeight="500"
            w="100%"
            h="50"
            type="submit"
            isLoading={loading}
            isDisabled={!code || (!useBackupCode && code.length !== 6)}
          >
            Verify
          </Button>

          <VStack spacing={2} w="100%">
            <Link
              color={brandStars}
              fontSize="sm"
              fontWeight="500"
              onClick={toggleBackupCode}
              cursor="pointer"
            >
              {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
            </Link>

            <Link
              color={textColorSecondary}
              fontSize="sm"
              fontWeight="500"
              onClick={onCancel}
              cursor="pointer"
            >
              Cancel and return to login
            </Link>
          </VStack>
        </VStack>
      </form>
    </Box>
  );
};

export default MFAVerification;
