import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import DefaultAuth from 'layouts/auth/Default';
import illustration from 'assets/img/auth/auth.jpeg';
import { MdOutlineRemoveRedEye } from 'react-icons/md';
import { RiEyeCloseLine } from 'react-icons/ri';

function SignIn() {
  // UI state
  const [show, setShow] = React.useState(false);
  const handleClick = () => setShow(!show);

  // Auth + routing
  const { login } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [userType, setUserType] = React.useState('Platform Admin'); // dropdown role selector
  const [email, setEmail] = React.useState(''); // treat as email
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Map dropdown label → base path (URL prefix drives role)
  const baseFor = (label) => {
    switch (label) {
      case 'Platform Admin':
        return '/platform-admin';
      case 'Network Admin':
        return '/network-admin';
      case 'Security Analyst':
        return '/security-analyst';
      default:
        return '/platform-admin';
    }
  };

  const textColor = useColorModeValue('navy.700', 'white');
  const textColorSecondary = 'gray.400';
  const textColorBrand = useColorModeValue('brand.500', 'white');
  const brandStars = useColorModeValue('brand.500', 'brand.400');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    if (!userType || !email || !password) {
      setErr('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      // CRA dev proxy forwards /api → http://localhost:3001
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          expectedRole: userType, // optional server-side role check
        }),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.error || 'Login failed.');
      }

      const { token, user } = await res.json();

      // Persist for refreshes / sidebar profile
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', token);


      // If your AuthContext expects token + user
      login?.(token, user);

      // Route from user.role (source of truth) — even if dropdown differed
      const base = baseFor(user.role || userType);
      navigate(`${base}/dashboard`, { replace: true });
    } catch (e2) {
      setErr(e2.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DefaultAuth illustrationBackground={illustration} image={illustration}>
      <Flex
        maxW={{ base: '100%', md: 'max-content' }}
        w="100%"
        mx={{ base: 'auto', lg: '0px' }}
        me="auto"
        h="100%"
        alignItems="start"
        justifyContent="center"
        mb={{ base: '30px', md: '60px' }}
        px={{ base: '25px', md: '0px' }}
        mt={{ base: '40px', md: '14vh' }}
        flexDirection="column"
      >
        <Box me="auto">
          <Heading color={textColor} fontSize="36px" mb="10px">
            Welcome
          </Heading>
          <Text
            mb="36px"
            ms="4px"
            color={textColorSecondary}
            fontWeight="400"
            fontSize="md"
          >
            Choose your role and enter your credentials.
          </Text>
        </Box>

        <Flex
          zIndex="2"
          direction="column"
          w={{ base: '100%', md: '420px' }}
          maxW="100%"
          background="transparent"
          borderRadius="15px"
          mx={{ base: 'auto', lg: 'unset' }}
          me="auto"
          mb={{ base: '20px', md: 'auto' }}
        >
          <form onSubmit={handleSubmit}>
            <FormControl>
              {/* User Type (role) */}
              <FormLabel
                display="flex"
                ms="4px"
                fontSize="sm"
                fontWeight="500"
                color={textColor}
                mb="8px"
              >
                User Type<Text color={brandStars}>*</Text>
              </FormLabel>
              <Select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                mb="24px"
                size="lg"
                fontSize="sm"
                variant="auth"
                color={textColor}
                sx={{ option: { color: textColor } }}
              >
                <option value="Platform Administrator">
                  Platform Administrator
                </option>
                <option value="Network Administrator">
                  Network Administrator
                </option>
                <option value="Security Analyst">Security Analyst</option>
              </Select>

              {/* Email (used to authenticate against users.db) */}
              <FormLabel
                display="flex"
                ms="4px"
                fontSize="sm"
                fontWeight="500"
                color={textColor}
                mb="8px"
              >
                Email<Text color={brandStars}>*</Text>
              </FormLabel>
              <Input
                isRequired
                variant="auth"
                fontSize="sm"
                type="email"
                placeholder="Enter your email"
                mb="24px"
                fontWeight="500"
                size="lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />

              {/* Password */}
              <FormLabel
                ms="4px"
                fontSize="sm"
                fontWeight="500"
                color={textColor}
                display="flex"
              >
                Password<Text color={brandStars}>*</Text>
              </FormLabel>
              <InputGroup size="md">
                <Input
                  isRequired
                  fontSize="sm"
                  placeholder="Enter your password"
                  mb="24px"
                  size="lg"
                  type={show ? 'text' : 'password'}
                  variant="auth"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
                <InputRightElement display="flex" alignItems="center" mt="4px">
                  <Icon
                    color={textColorSecondary}
                    _hover={{ cursor: 'pointer' }}
                    as={show ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                    onClick={handleClick}
                  />
                </InputRightElement>
              </InputGroup>

              {err && (
                <Text color="red.400" fontSize="sm" mb="12px">
                  {err}
                </Text>
              )}

              <Button
                type="submit"
                fontSize="sm"
                variant="brand"
                fontWeight="500"
                w="100%"
                h="50"
                mb="12px"
                isLoading={submitting}
                loadingText="Signing in..."
              >
                Sign In
              </Button>

              <Flex justify="center" align="center" mt="8px" w="100%">
                <NavLink to="/auth/forgot-password">
                  <Text color={textColorBrand} fontSize="sm" fontWeight="500">
                    Forgot password?
                  </Text>
                </NavLink>
              </Flex>
            </FormControl>
          </form>
        </Flex>
      </Flex>
    </DefaultAuth>
  );
}

export default SignIn;
