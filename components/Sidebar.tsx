import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Box, VStack, HStack, IconButton, Tooltip, Divider, Avatar, Text, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, FormControl, FormLabel } from '@chakra-ui/react';
import { FaPlus, FaCompass } from 'react-icons/fa';
import { useAuth } from '../lib/contexts/AuthContext';
import { Server, getUserServers, createServer } from '../lib/chatService';

export default function Sidebar() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isJoinOpen, onOpen: onJoinOpen, onClose: onJoinClose } = useDisclosure();
  const [newServerName, setNewServerName] = useState('');
  const [serverImage, setServerImage] = useState<File | null>(null);
  const [joinServerId, setJoinServerId] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchServers();
    }
  }, [currentUser]);

  const fetchServers = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const userServers = await getUserServers(currentUser.uid);
      setServers(userServers);
    } catch (error) {
      console.error('Error fetching servers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateServer = async () => {
    if (!currentUser || !newServerName.trim()) return;
    
    try {
      const serverId = await createServer(newServerName, currentUser.uid, serverImage || undefined);
      onCreateClose();
      setNewServerName('');
      setServerImage(null);
      
      // Navigate to the new server
      router.push(`/servers/${serverId}`);
    } catch (error) {
      console.error('Error creating server:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setServerImage(e.target.files[0]);
    }
  };

  const navigateToServer = (serverId: string) => {
    router.push(`/servers/${serverId}`);
  };

  return (
    <Box bg="gray.800" width="72px" height="100vh" p={2}>
      <VStack spacing={4}>
        {/* Home button */}
        <Tooltip label="Home" placement="right">
          <IconButton
            aria-label="Home"
            icon={
              <Avatar size="md" name="ChatCord" bg="purple.500">
                <Text fontSize="lg" fontWeight="bold">C</Text>
              </Avatar>
            }
            variant="ghost"
            onClick={() => router.push('/')}
            borderRadius="full"
            _hover={{ bg: 'purple.500' }}
          />
        </Tooltip>

        <Divider />

        {/* Server list */}
        <VStack spacing={2} width="100%" overflowY="auto">
          {servers.map((server) => (
            <Tooltip key={server.id} label={server.name} placement="right">
              <IconButton
                aria-label={server.name}
                icon={
                  server.imageUrl ? (
                    <Avatar size="md" src={server.imageUrl} />
                  ) : (
                    <Avatar size="md" name={server.name} />
                  )
                }
                variant="ghost"
                borderRadius="full"
                onClick={() => navigateToServer(server.id)}
                _hover={{ bg: 'gray.700' }}
              />
            </Tooltip>
          ))}
        </VStack>

        <Divider />

        {/* Add server button */}
        <Tooltip label="Create a server" placement="right">
          <IconButton
            aria-label="Create a server"
            icon={<FaPlus />}
            colorScheme="green"
            borderRadius="full"
            onClick={onCreateOpen}
          />
        </Tooltip>

        {/* Explore servers button */}
        <Tooltip label="Explore servers" placement="right">
          <IconButton
            aria-label="Explore servers"
            icon={<FaCompass />}
            colorScheme="blue"
            borderRadius="full"
            onClick={onJoinOpen}
          />
        </Tooltip>
      </VStack>

      {/* Create Server Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose}>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>Create a new server</ModalHeader>
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Server Name</FormLabel>
              <Input 
                placeholder="Enter server name" 
                value={newServerName} 
                onChange={(e) => setNewServerName(e.target.value)} 
              />
            </FormControl>
            <FormControl>
              <FormLabel>Server Image (Optional)</FormLabel>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                p={1}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleCreateServer}>
              Create Server
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Join Server Modal */}
      <Modal isOpen={isJoinOpen} onClose={onJoinClose}>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>Join a server</ModalHeader>
          <ModalBody>
            <FormControl>
              <FormLabel>Server ID</FormLabel>
              <Input 
                placeholder="Enter server ID" 
                value={joinServerId} 
                onChange={(e) => setJoinServerId(e.target.value)} 
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onJoinClose}>
              Cancel
            </Button>
            <Button colorScheme="blue">
              Join Server
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 