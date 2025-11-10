import {
  Avatar,
  Button,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  useColorMode,
  useDisclosure, // <-- added
  AlertDialog, // <-- added
  AlertDialogOverlay, // <-- added
  AlertDialogContent, // <-- added
  AlertDialogHeader, // <-- added
  AlertDialogBody, // <-- added
  AlertDialogFooter, // <-- added
} from '@chakra-ui/react';
import { ItemContent } from 'components/menu/ItemContent';
import { SearchBar } from 'components/navbar/searchBar/SearchBar';
import { SidebarResponsive } from 'components/sidebar/Sidebar';
import PropTypes from 'prop-types';
import React, { useRef } from 'react'; // <-- useRef added
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

import { MdNotificationsNone } from 'react-icons/md';
import { IoMdMoon, IoMdSunny } from 'react-icons/io';
import { FaEthereum } from 'react-icons/fa';

export default function HeaderLinks(props) {
  const { secondary } = props;
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();

  // auth
  const { logout, user: authUser } = useAuth();

  // user display
  const rawUser =
    typeof window !== 'undefined' ? localStorage.getItem('syntra_user') : null;
  const storedUser = rawUser ? JSON.parse(rawUser) : null;
  const displayName = authUser?.name ?? storedUser?.name ?? 'User';
  const avatarUrl = authUser?.avatarUrl ?? storedUser?.avatarUrl ?? '';

  // colors
  const navbarIcon = useColorModeValue('gray.400', 'white');
  const menuBg = useColorModeValue('white', 'navy.800');
  const hoverBg = useColorModeValue('gray.100', 'whiteAlpha.100'); // <-- hover only
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textColorBrand = useColorModeValue('brand.700', 'brand.400');
  const ethColor = useColorModeValue('gray.700', 'white');
  const borderColor = useColorModeValue('#E6ECFA', 'rgba(135, 140, 189, 0.3)');
  const ethBg = useColorModeValue('secondaryGray.300', 'navy.900');
  const ethBox = useColorModeValue('white', 'navy.800');
  const shadow = useColorModeValue(
    '14px 17px 40px 4px rgba(112, 144, 176, 0.18)',
    '14px 17px 40px 4px rgba(112, 144, 176, 0.06)',
  );
  const borderButton = useColorModeValue('secondaryGray.500', 'whiteAlpha.200');

  // logout confirmation dialog
  const {
    isOpen: isLogoutOpen,
    onOpen: onLogoutOpen,
    onClose: onLogoutClose,
  } = useDisclosure();
  const cancelRef = useRef();

  const handleLogout = () => {
    try {
      logout?.();
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('syntra_token');
    localStorage.removeItem('user');
    localStorage.removeItem('syntra_user');
    navigate('/auth/sign-in', { replace: true });
  };

  return (
    <Flex
      w={{ sm: '100%', md: 'auto' }}
      alignItems="center"
      flexDirection="row"
      bg={menuBg}
      flexWrap={secondary ? { base: 'wrap', md: 'nowrap' } : 'unset'}
      p="10px"
      borderRadius="30px"
      boxShadow={shadow}
    >
      <SearchBar
        mb={() => (secondary ? { base: '10px', md: 'unset' } : 'unset')}
        me="10px"
        borderRadius="30px"
      />

      <Flex
        bg={ethBg}
        display={secondary ? 'flex' : 'none'}
        borderRadius="30px"
        ms="auto"
        p="6px"
        align="center"
        me="6px"
      >
        <Flex
          align="center"
          justify="center"
          bg={ethBox}
          h="29px"
          w="29px"
          borderRadius="30px"
          me="7px"
        >
          <Icon color={ethColor} w="9px" h="14px" as={FaEthereum} />
        </Flex>
        <Text
          w="max-content"
          color={ethColor}
          fontSize="sm"
          fontWeight="700"
          me="6px"
        >
          1,924
          <Text as="span" display={{ base: 'none', md: 'unset' }}>
            {' '}
            ETH
          </Text>
        </Text>
      </Flex>

      {/* Notifications menu */}
      <Menu autoSelect={false}>
        <MenuButton p="0px">
          <Icon
            mt="6px"
            as={MdNotificationsNone}
            color={navbarIcon}
            w="18px"
            h="18px"
            me="10px"
          />
        </MenuButton>
        <MenuList
          boxShadow="none" // no glow by default
          _hover={{ boxShadow: shadow }} // glow only on hover
          transition="box-shadow .15s ease"
          p="20px"
          borderRadius="20px"
          bg={menuBg}
          border="none"
          mt="22px"
          me={{ base: '30px', md: 'unset' }}
          minW={{ base: 'unset', md: '400px', xl: '450px' }}
          maxW={{ base: '360px', md: 'unset' }}
        >
          <Flex w="100%" mb="20px">
            <Text fontSize="md" fontWeight="600" color={textColor}>
              Notifications
            </Text>
            <Text
              fontSize="sm"
              fontWeight="500"
              color={textColorBrand}
              ms="auto"
              cursor="pointer"
            >
              Mark all read
            </Text>
          </Flex>
          <Flex flexDirection="column">
            <MenuItem
              bg="transparent"
              _hover={{ bg: hoverBg }}
              px="0"
              borderRadius="8px"
              mb="10px"
            >
              <ItemContent info="Horizon UI Dashboard PRO" />
            </MenuItem>
            <MenuItem
              bg="transparent"
              _hover={{ bg: hoverBg }}
              px="0"
              borderRadius="8px"
              mb="10px"
            >
              <ItemContent info="Horizon Design System Free" />
            </MenuItem>
          </Flex>
        </MenuList>
      </Menu>

      <Button
        variant="no-hover"
        bg="transparent"
        p="0px"
        minW="unset"
        minH="unset"
        h="18px"
        w="max-content"
        onClick={toggleColorMode}
      >
        <Icon
          me="10px"
          h="18px"
          w="18px"
          color={navbarIcon}
          as={colorMode === 'light' ? IoMdMoon : IoMdSunny}
        />
      </Button>

      {/* Profile menu */}
      <Menu autoSelect={false}>
        <MenuButton p="0px">
          <Avatar
            _hover={{ cursor: 'pointer' }}
            color="white"
            name={displayName}
            src={avatarUrl || undefined}
            bg="#11047A"
            size="sm"
            w="40px"
            h="40px"
          />
        </MenuButton>

        <MenuList
          boxShadow="none" // no glow by default
          _hover={{ boxShadow: shadow }} // glow only when hovering the list
          transition="box-shadow .15s ease"
          p="0px"
          mt="10px"
          borderRadius="20px"
          bg={menuBg}
          border="none"
        >
          <Flex w="100%" mb="0px">
            <Text
              ps="20px"
              pt="16px"
              pb="10px"
              w="100%"
              borderBottom="1px solid"
              borderColor={borderColor}
              fontSize="sm"
              fontWeight="700"
              color={textColor}
            >
              👋&nbsp; Hey, {displayName}
            </Text>
          </Flex>

          <Flex flexDirection="column" p="10px">
            <MenuItem
              bg="transparent"
              _hover={{ bg: hoverBg }} // subtle background on hover
              borderRadius="8px"
              px="14px"
              transition="background-color .12s ease"
            >
              <Text fontSize="sm">Profile Settings</Text>
            </MenuItem>

            <MenuItem
              bg="transparent"
              _hover={{ bg: hoverBg }}
              borderRadius="8px"
              px="14px"
              transition="background-color .12s ease"
            >
              <Text fontSize="sm">Newsletter Settings</Text>
            </MenuItem>

            <MenuItem
              bg="transparent"
              _hover={{ bg: hoverBg, color: 'red.400' }} // keep red text, add hover bg
              color="red.400"
              borderRadius="8px"
              px="14px"
              onClick={onLogoutOpen} // <-- open confirm dialog
              transition="background-color .12s ease"
            >
              <Text fontSize="sm">Log out</Text>
            </MenuItem>
          </Flex>
        </MenuList>
      </Menu>

      {/* Logout confirmation dialog */}
      <AlertDialog
        isOpen={isLogoutOpen}
        leastDestructiveRef={cancelRef}
        onClose={onLogoutClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg={menuBg}>
            <AlertDialogHeader
              fontSize="lg"
              fontWeight="bold"
              color={textColor}
            >
              Confirm Logout
            </AlertDialogHeader>

            <AlertDialogBody color={textColor}>
              Are you sure you want to log out?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onLogoutClose}>
                No
              </Button>
              <Button
                colorScheme="red"
                ml={3}
                onClick={() => {
                  onLogoutClose();
                  handleLogout();
                }}
              >
                Yes
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Flex>
  );
}

HeaderLinks.propTypes = {
  variant: PropTypes.string,
  fixed: PropTypes.bool,
  secondary: PropTypes.bool,
  onOpen: PropTypes.func,
};
