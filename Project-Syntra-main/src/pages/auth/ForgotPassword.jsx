import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  Select,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FaChevronLeft } from 'react-icons/fa';
import DefaultAuth from 'layouts/auth/Default';
import illustration from 'assets/img/auth/auth.jpeg';
// import api from "./././services/api"; // when backend is ready

export default function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();

  // CHANGED: username → email
  const [email, setEmail] = React.useState('');
  const [userType, setUserType] = React.useState('Security Analyst');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const textColor = useColorModeValue('navy.700', 'white');
  const textColorSecondary = 'gray.400';
  const brandStars = useColorModeValue('brand.500', 'brand.400');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    // CHANGED: validate email instead of username
    if (!email) {
      setErr('Email is required.');
      return;
    }
    setLoading(true);
    try {
      // TODO: replace with real API call
      // await api.post("/auth/forgot-password", { email, userType });
      await new Promise((r) => setTimeout(r, 500));

      toast({
        title: 'Request submitted',
        description:
          'Your reset request has been recorded. A Platform Admin will review and configure your password.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      navigate('/auth/sign-in', { replace: true });
    } catch (e) {
      setErr('Failed to submit request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DefaultAuth illustrationBackground={illustration} image={illustration}>
      <NavLink to="/auth/sign-in">
        <Flex
          align="center"
          ps={{ base: '10px', lg: '0px' }}
          mt={{ base: '24px', md: '40px' }}
          w="fit-content"
          mb="24px"
        >
          <Icon
            as={FaChevronLeft}
            me="10px"
            h="14px"
            w="9px"
            color="secondaryGray.600"
          />
          <Text fontSize="sm" color="secondaryGray.600">
            Back to Login
          </Text>
        </Flex>
      </NavLink>

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
          <Heading color={textColor} fontSize="32px" mb="10px">
            Forgot Password
          </Heading>
          <Text
            mb="24px"
            ms="4px"
            color={textColorSecondary}
            fontWeight="400"
            fontSize="md"
          >
            Enter your email. A Platform Admin will reset/configure it.
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
              {/* Optional: User Type for context (unchanged) */}
              <FormLabel
                ms="4px"
                fontSize="sm"
                fontWeight="500"
                color={textColor}
                display="flex"
              >
                User Type
              </FormLabel>
              <Select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                mb="24px"
                size="lg"
                fontSize="sm"
                variant="auth"
                color={textColor}
                sx={{
                  option: { color: textColor },
                }}
              >
                <option>Platform Administrator</option>
                <option>Network Administrator</option>
                <option>Security Analyst</option>
              </Select>

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
                mb="20px"
                fontWeight="500"
                size="lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />

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
                isLoading={loading}
                loadingText="Submitting"
              >
                Submit Request
              </Button>
            </FormControl>
          </form>
        </Flex>
      </Flex>
    </DefaultAuth>
  );
}
