// chakra imports
import { Box, Button, Flex, Stack, Text, useColorModeValue, useDisclosure, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter } from "@chakra-ui/react";
import { FiLogOut } from "react-icons/fi";
// custom components
import Profile from "components/sidebar/components/Profile";
import Links from "components/sidebar/components/Links";
import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
// ⭐ add: auth hook
import { useAuth } from "auth/AuthContext";

function SidebarContent(props) {
  const { routes } = props;
  const navigate = useNavigate();

  // ⭐ add: get user + role checker from context
  const { user, hasRole, logout } = useAuth();

  // ⭐ add: filter routes by RBAC
  const visibleRoutes = (routes || []).filter((r) => hasRole(r?.roles || []));

  // Sidebar header (optional show real user data)
  const userName = user?.name || "User";
  const avatarUrl = ""; // plug in later if you store avatars

  // Logout confirmation dialog
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

  // Colors
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const buttonBg = useColorModeValue("white", "whiteAlpha.100");
  const buttonHoverBg = useColorModeValue("gray.100", "whiteAlpha.200");
  const buttonBorder = useColorModeValue("gray.200", "whiteAlpha.300");

  const handleLogout = () => {
    try {
      logout?.();
    } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('syntra_token');
    localStorage.removeItem('syntra_user');
    navigate('/auth/sign-in', { replace: true });
  };

  return (
    <Flex direction="column" height="100%" pt="25px" px="16px" borderRadius="30px">
      <Profile name={userName} avatarUrl={avatarUrl} />

      <Stack direction="column" mb="auto" mt="8px" flex="1">
        <Box ps="20px" pe={{ md: "16px", "2xl": "1px" }}>
          {/* ⭐ pass filtered routes to Links */}
          {visibleRoutes.length > 0 ? (
            <Links routes={visibleRoutes} />
          ) : (
            <Text color="gray.500" fontSize="sm" px="2">
              No accessible sections.
            </Text>
          )}
        </Box>
      </Stack>

      {/* Log Out Button at Bottom */}
      <Box px="20px" pb="20px" pt="10px">
        <Button
          leftIcon={<FiLogOut />}
          width="100%"
          variant="outline"
          borderColor={buttonBorder}
          bg={buttonBg}
          _hover={{ bg: buttonHoverBg }}
          color={textColor}
          fontWeight="500"
          fontSize="sm"
          onClick={onOpen}
        >
          Log Out
        </Button>
      </Box>

      {/* Logout Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Confirm Log Out?
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to log out of your account?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} borderRadius="10px">
                No
              </Button>
              <Button
                bg="black"
                color="white"
                _hover={{ bg: "gray.800" }}
                onClick={() => {
                  onClose();
                  handleLogout();
                }}
                ml={3}
                borderRadius="10px"
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

export default SidebarContent;