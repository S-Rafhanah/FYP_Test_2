import React from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import Card from 'components/card/Card';

export default function IDSSourceIntegration() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Card direction="column" w="100%" px="25px" py="25px">
        <Text color={textColor} fontSize="22px" fontWeight="700" mb="20px">
          IDS Source Integration
        </Text>
        <Text color="secondaryGray.600" fontSize="md" mb="20px">
          This page will allow you to manage IDS sources (Suricata, Zeek, Snort) that feed data to the dashboard.
        </Text>
        <Text color={textColor} fontSize="lg" fontWeight="600" mb="10px">
          Planned Features:
        </Text>
        <Box as="ul" pl="20px" color="secondaryGray.600">
          <li>Add new IDS sources (Suricata, Zeek, Snort)</li>
          <li>Configure connection details (host, port, authentication)</li>
          <li>Test connection to IDS sources</li>
          <li>View connection status (Active/Inactive)</li>
          <li>Monitor last connection time</li>
          <li>Edit source configurations</li>
          <li>Delete sources</li>
          <li>Search and filter sources by type or status</li>
        </Box>
      </Card>
    </Box>
  );
}