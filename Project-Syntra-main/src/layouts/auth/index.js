import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Auth imports
import ForgotPassword from 'pages/auth/ForgotPassword';
import SignIn from 'pages/auth/SignIn';

// Chakra imports
import { Box, useColorModeValue } from '@chakra-ui/react';

// Layout components
import { SidebarContext } from 'contexts/SidebarContext';

export default function Auth() {
  const [toggleSidebar, setToggleSidebar] = useState(false);
  const authBg = useColorModeValue('white', 'navy.900');

  return (
    <Box>
      <SidebarContext.Provider value={{ toggleSidebar, setToggleSidebar }}>
        <Box
          bg={authBg}
          float="right"
          minHeight="100vh"
          height="100%"
          position="relative"
          w="100%"
          transition="all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)"
          transitionDuration=".2s, .2s, .35s"
          transitionProperty="top, bottom, width"
          transitionTimingFunction="linear, linear, ease"
        >
          <Routes>
            <Route path="sign-in" element={<SignIn />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<Navigate to="/auth/sign-in" replace />} />
          </Routes>
        </Box>
      </SidebarContext.Provider>
    </Box>
  );
}
