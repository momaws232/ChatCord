import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Flex, Box, Text, Button, useToast } from '@chakra-ui/react';
import { useAuth } from '../lib/contexts/AuthContext';
import FriendsList from '../components/FriendsList';
import DirectChat from '../components/DirectChat';
import CallNotification from '../components/CallNotification';
import { User, getFriends, getUserProfile } from '../lib/chatService';
import { connectSocket, getSocket } from '../lib/socket';
import { VoiceChatService } from '../lib/voiceChat';

export default function Dashboard() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [voiceChatService] = useState(new VoiceChatService());
  const [incomingCaller, setIncomingCaller] = useState<User | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/');
    } else if (currentUser) {
      // Connect to socket
      const socket = connectSocket(currentUser.uid);
      voiceChatService.setSocket(socket);
      
      // Setup call notification
      socket.on('call-signal', async ({ from, callId }) => {
        console.log('Received call signal from:', from, 'callId:', callId);
        
        // Only show notification for the first signal (initiator)
        if (!incomingCaller && !activeCallId) {
          try {
            const callerProfile = await getUserProfile(from);
            if (callerProfile) {
              setIncomingCaller(callerProfile);
            }
          } catch (error) {
            console.error('Error fetching caller profile:', error);
          }
        }
      });
      
      // Load friends
      fetchFriends();
      
      return () => {
        socket.off('call-signal');
      };
    }
  }, [currentUser, loading, router, incomingCaller, activeCallId]);

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
      if (activeCallId) {
        toast({
          title: 'Already in a call',
          description: 'Please end your current call before starting a new one',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      // Create a unique call ID using both user IDs
      const callId = [currentUser!.uid, friend.id].sort().join('-');
      setActiveCallId(callId);
      
      // Start voice chat
      await voiceChatService.startCall(callId, currentUser!.uid);
      
      toast({
        title: `Calling ${friend.displayName || friend.username}...`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error starting call:', error);
      setActiveCallId(null);
      toast({
        title: 'Error starting call',
        description: 'Could not access microphone',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleAcceptCall = async () => {
    if (!incomingCaller || !currentUser) return;
    
    try {
      // Create a unique call ID using both user IDs
      const callId = [currentUser.uid, incomingCaller.id].sort().join('-');
      setActiveCallId(callId);
      
      // Join the call
      await voiceChatService.joinExistingCall(callId, currentUser.uid);
      
      toast({
        title: `Connected to ${incomingCaller.displayName || incomingCaller.username}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Set the caller as the selected friend for chat
      setSelectedFriend(incomingCaller);
      setIncomingCaller(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      setActiveCallId(null);
      toast({
        title: 'Error accepting call',
        description: 'Could not access microphone',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleDeclineCall = () => {
    setIncomingCaller(null);
    
    toast({
      title: 'Call declined',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };
  
  const handleEndCall = () => {
    if (activeCallId) {
      voiceChatService.leaveCurrentCall();
      setActiveCallId(null);
      
      toast({
        title: 'Call ended',
        status: 'info',
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
        activeCallId={activeCallId}
        onEndCall={handleEndCall}
      />
      
      <CallNotification
        caller={incomingCaller}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />
    </Flex>
  );
} 