import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Flex,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  HStack,
  Image,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { useAuth } from '../lib/contexts/AuthContext';
import { FaDiscord } from 'react-icons/fa';

export default function Home() {
  const router = useRouter();
  const { currentUser, login, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await login(email, password);
      
      toast({
        title: 'Login successful',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      await signup(email, password);
      
      toast({
        title: 'Account created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex minH="100vh" direction={{ base: 'column', md: 'row' }}>
      {/* Left Side - Hero Section */}
      <Box
        w={{ base: '100%', md: '60%' }}
        bg="purple.500"
        p={8}
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        color="white"
      >
        <VStack spacing={6} maxW="600px" textAlign="center">
          <FaDiscord size={80} />
          <Heading size="2xl">Welcome to ChatCord</Heading>
          <Text fontSize="xl">
            A Discord-like chat application with real-time messaging, voice chat, and more!
          </Text>
          <HStack spacing={4} mt={4}>
            <Button colorScheme="whiteAlpha" size="lg">
              Learn More
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Right Side - Login/Signup Forms */}
      <Box
        w={{ base: '100%', md: '40%' }}
        bg="gray.800"
        p={8}
        display="flex"
        flexDirection="column"
        justifyContent="center"
      >
        <Tabs isFitted variant="enclosed" colorScheme="purple">
          <TabList mb="1em">
            <Tab>Login</Tab>
            <Tab>Sign Up</Tab>
          </TabList>
          <TabPanels>
            {/* Login Panel */}
            <TabPanel>
              <form onSubmit={handleLogin}>
                <VStack spacing={4} align="flex-start">
                  <Heading size="lg">Login to Your Account</Heading>
                  {error && (
                    <Text color="red.500">{error}</Text>
                  )}
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </FormControl>
                  <Button
                    type="submit"
                    colorScheme="purple"
                    width="full"
                    mt={4}
                    isLoading={isLoading}
                  >
                    Login
                  </Button>
                </VStack>
              </form>
            </TabPanel>

            {/* Sign Up Panel */}
            <TabPanel>
              <form onSubmit={handleSignup}>
                <VStack spacing={4} align="flex-start">
                  <Heading size="lg">Create an Account</Heading>
                  {error && (
                    <Text color="red.500">{error}</Text>
                  )}
                  <FormControl isRequired>
                    <FormLabel>Username</FormLabel>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                    />
                  </FormControl>
                  <Button
                    type="submit"
                    colorScheme="purple"
                    width="full"
                    mt={4}
                    isLoading={isLoading}
                  >
                    Sign Up
                  </Button>
                </VStack>
              </form>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Flex>
  );
} 