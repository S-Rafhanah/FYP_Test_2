import React, { useEffect, useState } from 'react';
import { Flex, Text, Avatar, useColorModeValue } from '@chakra-ui/react';

export default function SidebarProfile() {
  // State to store user info
  const [user, setUser] = useState({ name: 'User', avatarUrl: '' });

  // Load the logged-in user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('syntra_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser({
          name: parsedUser.name || 'User',
          avatarUrl: parsedUser.avatarUrl || '', // if empty, initials will show
        });
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
  }, []);

  // Chakra UI dynamic colors
  const bg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const border = useColorModeValue('gray.200', 'whiteAlpha.200');
  const textColor = useColorModeValue('navy.700', 'white');
  const subtitleColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      w="100%"
      px="20px"
      py="14px"
      borderRadius="14px"
      bg={bg}
      borderWidth="1px"
      borderColor={border}
    >
      {/* Avatar will automatically generate initials if no avatarUrl is passed */}
      <Avatar name={user.name} src={user.avatarUrl} size="lg" mb="10px" />

      {/* Welcome message with actual user name */}
      <Text
        textAlign="center"
        whiteSpace="pre-line"
        color={textColor}
        fontWeight="600"
        fontSize="md"
      >
        {`Welcome\n${user.name}`}
      </Text>
    </Flex>
  );
}
