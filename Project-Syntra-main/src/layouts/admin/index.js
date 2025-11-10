// Chakra imports
import { Portal, Box, useDisclosure } from '@chakra-ui/react';
import Footer from 'components/footer/FooterAdmin.js';
// Layout components
import Navbar from 'components/navbar/NavbarAdmin.js';
import Sidebar from 'components/sidebar/Sidebar.js';
import { SidebarContext } from 'contexts/SidebarContext';
import React, { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import adminRoutes from 'routes/adminRoutes';

// Custom Chakra theme
export default function Dashboard(props) {
  const { ...rest } = props;
  const [fixed] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState(false);

  const getRoute = () => window.location.pathname !== '/admin/full-screen-maps';

  const getActiveRoute = (routesArr) => {
    let activeRoute = 'Default Brand Text';
    for (let i = 0; i < routesArr.length; i++) {
      if (routesArr[i].collapse) {
        const r = getActiveRoute(routesArr[i].items);
        if (r !== activeRoute) return r;
      } else if (routesArr[i].category) {
        const r = getActiveRoute(routesArr[i].items);
        if (r !== activeRoute) return r;
      } else if (
        window.location.href.indexOf(routesArr[i].layout + routesArr[i].path) !== -1
      ) {
        return routesArr[i].name;
      }
    }
    return activeRoute;
  };

  const getActiveNavbar = (routesArr) => {
    let activeNavbar = false;
    for (let i = 0; i < routesArr.length; i++) {
      if (routesArr[i].collapse) {
        const r = getActiveNavbar(routesArr[i].items);
        if (r !== activeNavbar) return r;
      } else if (routesArr[i].category) {
        const r = getActiveNavbar(routesArr[i].items);
        if (r !== activeNavbar) return r;
      } else if (
        window.location.href.indexOf(routesArr[i].layout + routesArr[i].path) !== -1
      ) {
        return routesArr[i].secondary;
      }
    }
    return activeNavbar;
  };

  const getActiveNavbarText = (routesArr) => {
    let activeNavbar = false;
    for (let i = 0; i < routesArr.length; i++) {
      if (routesArr[i].collapse) {
        const r = getActiveNavbarText(routesArr[i].items);
        if (r !== activeNavbar) return r;
      } else if (routesArr[i].category) {
        const r = getActiveNavbarText(routesArr[i].items);
        if (r !== activeNavbar) return r;
      } else if (
        window.location.href.indexOf(routesArr[i].layout + routesArr[i].path) !== -1
      ) {
        return routesArr[i].messageNavbar;
      }
    }
    return activeNavbar;
  };

  const getRoutes = (routesArr) =>
    routesArr.map((route, key) => {
      if (route.layout === '/admin') {
        return <Route path={`${route.path}`} element={route.component} key={key} />;
      }
      if (route.collapse) return getRoutes(route.items);
      return null;
    });

  document.documentElement.dir = 'ltr';
  const { onOpen } = useDisclosure();

  return (
    <Box>
      <Box>
        <SidebarContext.Provider value={{ toggleSidebar, setToggleSidebar }}>
          <Sidebar routes={adminRoutes} display="none" {...rest} />
          <Box
            float="right"
            minHeight="100vh"
            height="100%"
            overflow="auto"
            position="relative"
            maxHeight="100%"
            w={{ base: '100%', xl: 'calc( 100% - 290px )' }}
            maxWidth={{ base: '100%', xl: 'calc( 100% - 290px )' }}
            transition="all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)"
            transitionDuration=".2s, .2s, .35s"
            transitionProperty="top, bottom, width"
            transitionTimingFunction="linear, linear, ease"
          >
            <Portal>
              <Box>
                <Navbar
                  onOpen={onOpen}
                  logoText={'Horizon UI Dashboard PRO'}
                  brandText={getActiveRoute(adminRoutes)}
                  secondary={getActiveNavbar(adminRoutes)}
                  message={getActiveNavbarText(adminRoutes)}
                  fixed={fixed}
                  {...rest}
                />
              </Box>
            </Portal>

            {getRoute() ? (
              <Box mx="auto" p={{ base: '20px', md: '30px' }} pe="20px" minH="100vh" pt="50px">
                <Routes>
                  {getRoutes(adminRoutes)}
                  <Route path="/" element={<Navigate to="/admin/default" replace />} />
                </Routes>
              </Box>
            ) : null}
            <Box>
              <Footer />
            </Box>
          </Box>
        </SidebarContext.Provider>
      </Box>
    </Box>
  );
}
