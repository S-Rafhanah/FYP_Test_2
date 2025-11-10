import React from "react";
import { Box, Flex, useColorModeValue } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";

import Navbar from "../../components/navbar/NavbarAdmin";
import Sidebar from "../../components/sidebar/Sidebar";
import platformAdminRoutes from "../../routes/platformAdminRoutes";

export default function PlatformAdminLayout() {
  const bgColor = useColorModeValue("gray.50", "navy.900");

  return (
    <Flex minH="100vh" bg={bgColor}>
      {/* Sidebar */}
      <Sidebar routes={platformAdminRoutes} />

      {/* Main content area */}
      <Flex
        direction="column"
        flex="1"
        ms={{ base: 0, xl: "300px" }}   // reserve space for fixed sidebar
        pt={{ base: "80px", xl: "88px" }} // push below top navbar
        px={{ base: 4, md: 6 }}
        as="main"
        position="relative"
      >
        {/* Top bar */}
        <Navbar brandText="Platform Admin" secondary={false} onOpen={() => {}} />

        {/* Page body placeholder */}
        <Box p={6}>
          <Outlet />   {/* <— children render here */}
        </Box>
      </Flex>
    </Flex>
  );
}