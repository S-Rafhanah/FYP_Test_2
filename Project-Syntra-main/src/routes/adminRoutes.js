// routes/adminRoutes.js
import React from 'react';
import { Icon } from '@chakra-ui/react';
import { MdBarChart, MdPerson, MdHome, MdOutlineShoppingCart } from 'react-icons/md';

// Admin Imports
import MainDashboard from 'pages/admin/default';
import NFTMarketplace from 'pages/admin/marketplace';
import Profile from 'pages/admin/profile';
import DataTables from 'pages/admin/dataTables';

const adminRoutes = [
  {
    name: 'Main Dashboard',
    layout: '/admin',
    path: '/default',
    icon: <Icon as={MdHome} w="20px" h="20px" color="inherit" />,
    component: <MainDashboard />,
    roles: [], // ← empty = any authenticated user
  },
  {
    name: 'NFT Marketplace',
    layout: '/admin',
    path: '/nft-marketplace',
    icon: <Icon as={MdOutlineShoppingCart} w="20px" h="20px" color="inherit" />,
    component: <NFTMarketplace />,
    secondary: true,
    roles: [], // any authed user
  },
  {
    name: 'Data Tables',
    layout: '/admin',
    path: '/data-tables',
    icon: <Icon as={MdBarChart} w="20px" h="20px" color="inherit" />,
    component: <DataTables />,
    roles: [], // any authed user
  },
  {
    name: 'Profile',
    layout: '/admin',
    path: '/profile',
    icon: <Icon as={MdPerson} w="20px" h="20px" color="inherit" />,
    component: <Profile />,
    roles: [], // any authed user
  },
];

export default adminRoutes;
