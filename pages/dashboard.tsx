import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Flex, Box, Text, Button, useToast } from '@chakra-ui/react';
import { useAuth } from '../lib/contexts/AuthContext';
import FriendsList from '../components/FriendsList';
import DirectChat from '../components/DirectChat';
import { User, getFriends } from '../lib/chatService';
import { connectSocket } from '../lib/socket';
import { VoiceChatService } from '../lib/voiceChat';

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [voiceChatService] = useState(new VoiceChatService());
  const toast = useToast();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/');
    } else if (currentUser) {
      // Connect to socket
      const socket = connectSocket(currentUser.uid);
      voiceChatService.setSocket(socket);
      
      // Load friends
      fetchFriends();
    }
  }, [currentUser, loading, router]);

  const fetchFriends = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const userFriends = await getFriends(currentUser.uid);
      setFriends(userFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({
        title: 'Error fetching friends',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = (friend: User) => {
    setSelectedFriend(friend);
  };

  const handleStartCall = async (friend: User) => {
    try {
      // Create a unique call ID using both user IDs
      const callId = [currentUser!.uid, friend.id].sort().join('-');
      
      // Start voice chat
      await voiceChatService.startCall(callId, currentUser!.uid);
      
      toast({
        title: `Calling ${friend.username}...`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Error starting call',
        description: 'Could not access microphone',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (loading || !currentUser) {
    return (
      <Flex
        height="100vh"
        width="100vw"
        alignItems="center"
        justifyContent="center"
        bg="gray.800"
      >
        <Text fontSize="xl" color="white">Loading...</Text>
      </Flex>
    );
  }

  return (
    <Flex height="100vh" width="100vw">
      <FriendsList 
        onStartChat={handleStartChat}
        onStartCall={handleStartCall}
      />
      
      <DirectChat 
        friend={selectedFriend}
        onStartCall={handleStartCall}
      />
    </Flex>
  );
} 