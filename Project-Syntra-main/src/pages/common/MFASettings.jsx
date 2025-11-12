import React from 'react';
import {
  Box,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import MFAManagement from '../../components/mfa/MFAManagement';

export default function MFASettings() {
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex
        direction="column"
        gap={4}
        maxW="800px"
        mx="auto"
      >
        <MFAManagement />
      </Flex>
    </Box>
  );
}
