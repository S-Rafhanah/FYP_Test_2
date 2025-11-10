import React from "react";
import { Box, Flex, useColorModeValue } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";

import Navbar from "../../components/navbar/NavbarAdmin";
import Sidebar from "../../components/sidebar/Sidebar";
import securityAnalystRoutes from "../../routes/securityAnalystRoutes";

export default function SecurityAnalystLayout() {
  const bgColor = useColorModeValue("gray.50", "navy.900");

  return (
    <Flex minH="100vh" bg={bgColor}>
      {/* Sidebar */}
      <Sidebar routes={securityAnalystRoutes} />

      {/* Main content area */}
      <Flex
        direction="column"
        flex="1"
        ms={{ base: 0, xl: "300px" }}
        pt={{ base: "80px", xl: "88px" }}
        px={{ base: 4, md: 6 }}
        as="main"
        position="relative"
      >
        {/* Top bar */}
        <Navbar brandText="Security Analyst" secondary={false} onOpen={() => {}} />

        {/* Page content */}
        <Box p={6}>
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}
