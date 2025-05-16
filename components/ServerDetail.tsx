import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Divider,
  IconButton,
  Avatar,
  Badge,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  FormControl,
  FormLabel,
  Select,
  List,
  ListItem
} from '@chakra-ui/react';
import { FaPlus, FaHashtag, FaVolumeUp } from 'react-icons/fa';
import { useAuth } from '../lib/contexts/AuthContext';
import {
  Server,
  Channel,
  User,
  getServer,
  getServerChannels,
  createChannel
} from '../lib/chatService';

interface ServerDetailProps {
  serverId: string;
  onChannelSelect: (channel: Channel) => void;
}

export default function ServerDetail({ serverId, onChannelSelect }: ServerDetailProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [server, setServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newChannelName, setNewChannelName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text');

  useEffect(() => {
    if (serverId) {
      fetchServerDetails();
    }
  }, [serverId]);

  const fetchServerDetails = async () => {
    try {
      const serverData = await getServer(serverId);
      if (serverData) {
        setServer(serverData);
      }

      const channelList = await getServerChannels(serverId);
      setChannels(channelList);

      if (channelList.length > 0 && !selectedChannel) {
        handleChannelSelect(channelList[0]);
      }
    } catch (error) {
      console.error('Error fetching server details:', error);
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    onChannelSelect(channel);
  };

  const handleCreateChannel = async () => {
    if (!currentUser || !newChannelName.trim() || !serverId) return;

    try {
      await createChannel(serverId, newChannelName, channelType);
      onClose();
      setNewChannelName('');
      setChannelType('text');
      fetchServerDetails();
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  if (!server) {
    return (
      <Box bg="gray.700" width="240px" height="100vh" p={4}>
        <Text>Loading server details...</Text>
      </Box>
    );
  }

  return (
    <Box bg="gray.700" width="240px" height="100vh" display="flex" flexDirection="column">
      {/* Server Header */}
      <Box p={4} borderBottom="1px solid" borderColor="gray.600">
        <Heading size="md" isTruncated>{server.name}</Heading>
      </Box>

      {/* Channels Section */}
      <Box flex="1" overflowY="auto" p={2}>
        <HStack justifyContent="space-between" mb={2}>
          <Text fontSize="sm" fontWeight="bold" color="gray.400">CHANNELS</Text>
          {currentUser && server.ownerId === currentUser.uid && (
            <IconButton
              aria-label="Add Channel"
              icon={<FaPlus />}
              size="xs"
              variant="ghost"
              onClick={onOpen}
            />
          )}
        </HStack>

        <List spacing={1}>
          {channels.map((channel) => (
            <ListItem 
              key={channel.id}
              onClick={() => handleChannelSelect(channel)}
              bg={selectedChannel?.id === channel.id ? 'gray.600' : 'transparent'}
              _hover={{ bg: 'gray.600' }}
              borderRadius="md"
              p={2}
              cursor="pointer"
            >
              <HStack>
                {channel.type === 'text' ? (
                  <FaHashtag />
                ) : (
                  <FaVolumeUp />
                )}
                <Text fontSize="sm">{channel.name}</Text>
              </HStack>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Create Channel Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>Create Channel</ModalHeader>
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Channel Name</FormLabel>
              <Input 
                placeholder="Enter channel name" 
                value={newChannelName} 
                onChange={(e) => setNewChannelName(e.target.value)} 
              />
            </FormControl>
            <FormControl>
              <FormLabel>Channel Type</FormLabel>
              <Select 
                value={channelType} 
                onChange={(e) => setChannelType(e.target.value as 'text' | 'voice')}
              >
                <option value="text">Text Channel</option>
                <option value="voice">Voice Channel</option>
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleCreateChannel}>
              Create Channel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 