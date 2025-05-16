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
      console.log('Connecting to socket from dashboard');
      const socket = connectSocket(currentUser.uid);
      
      // Wait for socket to connect before setting up event handlers
      const setupSocketHandlers = () => {
        if (!socket) {
          console.error('Failed to connect socket');
          return;
        }
        
        console.log('Socket connected status:', socket.connected, 'Socket ID:', socket.id);
        voiceChatService.setSocket(socket);
        
        // Setup call notification
        socket.on('call-signal', async ({ from, callId, signal }) => {
          console.log('Received call signal from:', from, 'callId:', callId, 'has signal:', !!signal);
          
          // Only show notification for the initial call (when there's no active call)
          if (!incomingCaller && !activeCallId) {
            try {
              console.log('Fetching caller profile for', from);
              const callerProfile = await getUserProfile(from);
              if (callerProfile) {
                console.log('Setting incoming caller:', callerProfile.username);
                setIncomingCaller(callerProfile);
              } else {
                console.error('Caller profile not found');
              }
            } catch (error) {
              console.error('Error fetching caller profile:', error);
            }
          } else {
            console.log('Call notification skipped - already in a call or has incoming caller');
          }
        });
        
        // Log all socket events for debugging
        socket.onAny((event, ...args) => {
          console.log(`Socket event: ${event}`, args);
        });
      };
      
      if (socket) {
        if (socket.connected) {
          setupSocketHandlers();
        } else {
          socket.on('connect', () => {
            console.log('Socket connected, now setting up handlers');
            setupSocketHandlers();
          });
        }
      } else {
        console.error('Failed to initialize socket connection');
      }
      
      // Load friends
      fetchFriends();
      
      return () => {
        if (socket) {
          socket.off('call-signal');
          socket.offAny();
        }
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