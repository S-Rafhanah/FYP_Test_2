import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Box, Flex, HStack, Text, useColorModeValue } from "@chakra-ui/react";

export default function SidebarLinks({ routes = [] }) {
  const location = useLocation();

  // Colors
  const activeColor   = useColorModeValue("gray.700", "white");
  const inactiveColor = useColorModeValue("secondaryGray.600", "secondaryGray.600");
  const activeIcon    = useColorModeValue("brand.500", "white");
  const textColor     = useColorModeValue("secondaryGray.500", "white");
  const brandColor    = useColorModeValue("brand.500", "brand.400");

  // URL base ("/platform-admin", "/network-admin", "/security-analyst", etc.)
  const base = "/" + (location.pathname.split("/")[1] || "");

  const isActive = (r) => {
    const to = `${r.layout ?? ""}${r.path ?? ""}`;
    return (
      location.pathname === to ||
      (to && location.pathname.startsWith(to + "/"))
    );
  };

  const renderRoute = (r, idx) => {
    // Category / collapse support
    if (r.category || r.collapse || r.items) {
      const items = r.items || r.routes || [];
      return (
        <Box key={`cat-${idx}`} mt="18px">
          {r.name && (
            <Text
              fontSize="md"
              color={activeColor}
              fontWeight="bold"
              mx="auto"
              ps={{ sm: "10px", xl: "16px" }}
              pt="18px"
              pb="12px"
            >
              {r.name}
            </Text>
          )}
          {items.map(renderRoute)}
        </Box>
      );
    }

    // Only show links that belong to the current base
    if (r.layout && r.layout !== base) return null;
    if (!r.path) return null;

    const to = `${r.layout ?? ""}${r.path}`;

    return (
      <NavLink key={to} to={to}>
        <Box>
          <HStack spacing={isActive(r) ? "22px" : "26px"} py="5px" ps="10px">
            <Flex w="100%" alignItems="center" justifyContent="center">
              {r.icon && (
                <Box color={isActive(r) ? activeIcon : textColor} me="18px">
                  {r.icon}
                </Box>
              )}
              <Text
                me="auto"
                color={isActive(r) ? activeColor : inactiveColor}
                fontWeight={isActive(r) ? "bold" : "normal"}
              >
                {r.name}
              </Text>
            </Flex>
            <Box
              h="36px"
              w="4px"
              bg={isActive(r) ? brandColor : "transparent"}
              borderRadius="5px"
            />
          </HStack>
        </Box>
      </NavLink>
    );
  };

  return <>{routes.map(renderRoute)}</>;
}