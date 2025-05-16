import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Avatar,
  IconButton,
  Input,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  List,
  ListItem,
  Badge,
  Divider,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useToast,
  Code
} from '@chakra-ui/react';
import { FaPlus, FaUserPlus, FaPhone, FaVideo, FaEnvelope, FaUserCheck, FaUserTimes, FaBug } from 'react-icons/fa';
import { useAuth } from '../lib/contexts/AuthContext';
import {
  User,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  searchUsersByUsername,
  listAllUsers,
  getUserProfile
} from '../lib/chatService';

interface FriendsListProps {
  onStartChat: (friend: User) => void;
  onStartCall: (friend: User) => void;
}

export default function FriendsList({ onStartChat, onStartCall }: FriendsListProps) {
  const { currentUser } = useAuth();
  const [friends, setFriends] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [friendRequestUsername, setFriendRequestUsername] = useState('');
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    if (currentUser) {
      loadFriendsAndRequests();
    }
  }, [currentUser]);

  const loadFriendsAndRequests = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const [userFriends, userRequests] = await Promise.all([
        getFriends(currentUser.uid),
        getFriendRequests(currentUser.uid)
      ]);
      
      setFriends(userFriends);
      setFriendRequests(userRequests);
    } catch (error) {
      console.error('Error loading friends:', error);
      toast({
        title: 'Error loading friends',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchUsername.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      console.log("Searching for:", searchUsername.trim());
      const results = await searchUsersByUsername(searchUsername.trim());
      console.log("Search results:", results);
      
      // Filter out current user and existing friends
      const filteredResults = results.filter(user => 
        user.id !== currentUser?.uid && 
        !friends.some(friend => friend.id === user.id)
      );
      
      setSearchResults(filteredResults);
      
      if (filteredResults.length === 0) {
        toast({
          title: 'No users found',
          description: 'Try a different username or check your spelling',
          status: 'info',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Error searching users',
        description: 'There was an error searching for users. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Add debug function to list all users
  const handleListAllUsers = async () => {
    try {
      const allUsers = await listAllUsers(20);
      setSearchResults(allUsers.filter(user => user.id !== currentUser?.uid));
      
      toast({
        title: 'Debug: All Users Listed',
        description: `Found ${allUsers.length} users in database`,
        status: 'info',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Error listing users:', error);
      toast({
        title: 'Error listing users',
        description: 'There was an error listing all users',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    if (!currentUser) return;
    
    try {
      await sendFriendRequest(currentUser.uid, userId);
      toast({
        title: 'Friend request sent',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      setSearchResults(searchResults.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: 'Error sending friend request',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleDirectFriendRequest = async () => {
    if (!currentUser || !friendRequestUsername.trim()) return;
    
    try {
      console.log(`Searching for user: ${friendRequestUsername.trim()}`);
      
      const results = await searchUsersByUsername(friendRequestUsername.trim());
      console.log(`Search results:`, results);
      
      if (results.length === 0) {
        console.log('No users found with that username');
        toast({
          title: 'User not found',
          description: 'No user found with that username',
          status: 'warning',
          duration: 3000,
          isClosable: true
        });
        return;
      }
      
      const user = results[0]; // Take the first matching user
      console.log(`Found user:`, user);
      
      if (user.id === currentUser.uid) {
        console.log('User tried to add themselves');
        toast({
          title: 'Cannot add yourself',
          status: 'warning',
          duration: 3000,
          isClosable: true
        });
        return;
      }
      
      // Check if already friends
      if (friends.some(friend => friend.id === user.id)) {
        console.log('Users are already friends');
        toast({
          title: 'Already friends',
          description: 'You are already friends with this user',
          status: 'info',
          duration: 3000,
          isClosable: true
        });
        return;
      }
      
      // Check if already sent a request
      const userProfile = await getUserProfile(user.id);
      if (userProfile?.friendRequests?.includes(currentUser.uid)) {
        console.log('Friend request already sent');
        toast({
          title: 'Request already sent',
          description: 'You have already sent a friend request to this user',
          status: 'info',
          duration: 3000,
          isClosable: true
        });
        return;
      }
      
      console.log(`Sending friend request to ${user.id}`);
      await sendFriendRequest(currentUser.uid, user.id);
      console.log('Friend request sent successfully');
      
      toast({
        title: 'Friend request sent',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      setFriendRequestUsername('');
      onAddClose();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: 'Error sending friend request',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleAcceptFriendRequest = async (userId: string) => {
    if (!currentUser) return;
    
    try {
      await acceptFriendRequest(currentUser.uid, userId);
      toast({
        title: 'Friend request accepted',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      loadFriendsAndRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: 'Error accepting friend request',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleRejectFriendRequest = async (userId: string) => {
    if (!currentUser) return;
    
    try {
      await rejectFriendRequest(currentUser.uid, userId);
      toast({
        title: 'Friend request rejected',
        status: 'info',
        duration: 3000,
        isClosable: true
      });
      setFriendRequests(friendRequests.filter(req => req.id !== userId));
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast({
        title: 'Error rejecting friend request',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  return (
    <Box width="280px" height="100vh" bg="gray.800" p={4} display="flex" flexDirection="column">
      <HStack mb={4} justifyContent="space-between">
        <Heading size="md" color="white">Friends</Heading>
        <IconButton
          aria-label="Add Friend"
          icon={<FaUserPlus />}
          size="sm"
          colorScheme="green"
          onClick={onAddOpen}
        />
      </HStack>
      
      <Tabs colorScheme="purple" isFitted variant="line" flex="1" display="flex" flexDirection="column">
        <TabList>
          <Tab>All</Tab>
          <Tab>
            Requests
            {friendRequests.length > 0 && (
              <Badge ml={2} colorScheme="red" borderRadius="full">
                {friendRequests.length}
              </Badge>
            )}
          </Tab>
        </TabList>
        
        <TabPanels flex="1" overflowY="auto">
          {/* All Friends Tab */}
          <TabPanel p={2}>
            {isLoading ? (
              <Text color="gray.400">Loading friends...</Text>
            ) : friends.length === 0 ? (
              <VStack spacing={4} align="center" justify="center" height="100%">
                <Text color="gray.400">No friends yet</Text>
                <Button leftIcon={<FaUserPlus />} size="sm" onClick={onAddOpen}>
                  Add Friend
                </Button>
              </VStack>
            ) : (
              <List spacing={2}>
                {friends.map(friend => (
                  <ListItem 
                    key={friend.id}
                    p={2}
                    borderRadius="md"
                    _hover={{ bg: 'gray.700' }}
                  >
                    <HStack>
                      <Avatar 
                        size="sm" 
                        name={friend.displayName || friend.username} 
                        src={friend.photoURL} 
                        bg={
                          friend.status === 'online' ? 'green.500' :
                          friend.status === 'away' ? 'yellow.500' :
                          friend.status === 'dnd' ? 'red.500' : 'gray.500'
                        }
                      />
                      <VStack spacing={0} align="start" flex="1">
                        <Text color="white" fontSize="sm" fontWeight="medium">{friend.displayName || friend.username}</Text>
                        <Text color="gray.400" fontSize="xs">{friend.status}</Text>
                      </VStack>
                      <HStack spacing={1}>
                        <IconButton
                          aria-label="Message"
                          icon={<FaEnvelope />}
                          size="xs"
                          variant="ghost"
                          onClick={() => onStartChat(friend)}
                        />
                        <IconButton
                          aria-label="Call"
                          icon={<FaPhone />}
                          size="xs"
                          variant="ghost"
                          onClick={() => onStartCall(friend)}
                        />
                      </HStack>
                    </HStack>
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>
          
          {/* Friend Requests Tab */}
          <TabPanel p={2}>
            {isLoading ? (
              <Text color="gray.400">Loading requests...</Text>
            ) : friendRequests.length === 0 ? (
              <Text color="gray.400">No pending friend requests</Text>
            ) : (
              <List spacing={2}>
                {friendRequests.map(request => (
                  <ListItem 
                    key={request.id}
                    p={2}
                    borderRadius="md"
                    bg="gray.700"
                  >
                    <VStack spacing={2} align="stretch">
                      <HStack>
                        <Avatar size="sm" name={request.username} src={request.photoURL} />
                        <Text color="white" fontWeight="medium">{request.username}</Text>
                      </HStack>
                      <HStack justify="flex-end" spacing={2}>
                        <Button
                          leftIcon={<FaUserTimes />}
                          size="xs"
                          variant="outline"
                          colorScheme="red"
                          onClick={() => handleRejectFriendRequest(request.id)}
                        >
                          Reject
                        </Button>
                        <Button
                          leftIcon={<FaUserCheck />}
                          size="xs"
                          colorScheme="green"
                          onClick={() => handleAcceptFriendRequest(request.id)}
                        >
                          Accept
                        </Button>
                      </HStack>
                    </VStack>
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* Add Friend Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>Add Friend</ModalHeader>
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Username</FormLabel>
              <HStack>
                <Input 
                  placeholder="Enter a username" 
                  value={friendRequestUsername} 
                  onChange={(e) => setFriendRequestUsername(e.target.value)}
                />
                <Button colorScheme="purple" onClick={handleDirectFriendRequest}>
                  Add
                </Button>
              </HStack>
            </FormControl>
            
            <Divider my={4} />
            
            <FormControl mb={4}>
              <FormLabel>Search Users</FormLabel>
              <HStack>
                <Input 
                  placeholder="Search by username" 
                  value={searchUsername} 
                  onChange={(e) => setSearchUsername(e.target.value)}
                />
                <Button onClick={handleSearch}>
                  Search
                </Button>
              </HStack>
            </FormControl>
            
            {/* Debug button to list all users */}
            <Button 
              leftIcon={<FaBug />} 
              size="sm" 
              colorScheme="orange" 
              onClick={handleListAllUsers}
              mb={4}
            >
              Debug: List All Users
            </Button>
            
            {searchResults.length > 0 ? (
              <List spacing={2} mt={2}>
                {searchResults.map(user => (
                  <ListItem 
                    key={user.id}
                    p={2}
                    borderRadius="md"
                    bg="gray.700"
                  >
                    <HStack justify="space-between">
                      <HStack>
                        <Avatar size="sm" name={user.username} src={user.photoURL} />
                        <Text>{user.username}</Text>
                      </HStack>
                      <Button
                        leftIcon={<FaUserPlus />}
                        size="sm"
                        colorScheme="green"
                        onClick={() => handleSendFriendRequest(user.id)}
                      >
                        Add
                      </Button>
                    </HStack>
                  </ListItem>
                ))}
              </List>
            ) : (
              searchUsername.trim() !== '' && (
                <Text color="gray.400" textAlign="center" mt={2}>
                  No users found matching "{searchUsername}"
                </Text>
              )
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onAddClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 