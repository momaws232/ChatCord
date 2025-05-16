import { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  IconButton,
  Avatar,
  Flex,
  Button,
  useToast,
  Badge
} from '@chakra-ui/react';
import { FaPaperPlane, FaPhone, FaPhoneSlash } from 'react-icons/fa';
import { useAuth } from '../lib/contexts/AuthContext';
import { 
  User, 
  Message, 
  sendDirectMessage, 
  subscribeToDirectMessages,
  createCall 
} from '../lib/chatService';
import { v4 as uuidv4 } from 'uuid';
import { sendDirectMessage as sendSocketMessage } from '../lib/socket';

interface DirectChatProps {
  friend: User | null;
  onStartCall: (friend: User) => void;
  activeCallId: string | null;
  onEndCall: () => void;
}

export default function DirectChat({ friend, onStartCall, activeCallId, onEndCall }: DirectChatProps) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (currentUser && friend) {
      loadMessages();
    }
  }, [currentUser, friend]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = () => {
    if (!currentUser || !friend) return;
    
    setIsLoading(true);
    
    const unsubscribe = subscribeToDirectMessages(
      currentUser.uid,
      friend.id,
      (updatedMessages) => {
        setMessages(updatedMessages);
        setIsLoading(false);
        scrollToBottom();
      }
    );
    
    return unsubscribe;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!currentUser || !friend || !messageInput.trim()) return;
    
    try {
      await sendDirectMessage(currentUser.uid, friend.id, messageInput);
      
      // Also send via socket for real-time delivery
      sendSocketMessage(friend.id, currentUser.uid, messageInput);
      
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartCall = () => {
    if (!friend) return;
    onStartCall(friend);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    if (timestamp.toDate) {
      const date = timestamp.toDate();
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return '';
  };

  // Check if call is active with current friend
  const isCallActive = () => {
    if (!activeCallId || !friend || !currentUser) return false;
    
    // The call ID is created by sorting and joining the user IDs
    const expectedCallId = [currentUser.uid, friend.id].sort().join('-');
    return activeCallId === expectedCallId;
  };

  if (!friend) {
    return (
      <Flex
        flex={1}
        direction="column"
        bg="gray.700"
        color="white"
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize="lg" color="gray.400">Select a friend to start chatting</Text>
      </Flex>
    );
  }

  return (
    <Flex flex={1} direction="column" bg="gray.700" color="white">
      {/* Friend Header */}
      <HStack
        p={4}
        bg="gray.800"
        borderBottom="1px solid"
        borderColor="gray.600"
      >
        <Avatar size="sm" name={friend.displayName || friend.username} src={friend.photoURL} />
        <VStack spacing={0} alignItems="flex-start">
          <Text fontWeight="bold">{friend.displayName || friend.username}</Text>
          {isCallActive() && (
            <Badge colorScheme="green" variant="subtle">In Call</Badge>
          )}
        </VStack>
        <Box flex={1} />
        {isCallActive() ? (
          <IconButton
            aria-label="End call"
            icon={<FaPhoneSlash />}
            variant="ghost"
            colorScheme="red"
            onClick={onEndCall}
          />
        ) : (
          <IconButton
            aria-label="Voice call"
            icon={<FaPhone />}
            variant="ghost"
            onClick={handleStartCall}
          />
        )}
      </HStack>

      {/* Messages Area */}
      <VStack
        flex={1}
        overflowY="auto"
        spacing={2}
        p={4}
        alignItems="flex-start"
      >
        {isLoading ? (
          <Text color="gray.400">Loading messages...</Text>
        ) : messages.length === 0 ? (
          <Flex width="100%" justifyContent="center" py={8}>
            <Text color="gray.400">No messages yet. Say hello!</Text>
          </Flex>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.senderId === currentUser?.uid;
            
            return (
              <Box
                key={message.id}
                alignSelf={isCurrentUser ? 'flex-end' : 'flex-start'}
                maxWidth="70%"
                bg={isCurrentUser ? 'purple.500' : 'gray.600'}
                p={3}
                borderRadius="lg"
              >
                <Text>{message.content}</Text>
                <Text fontSize="xs" color="whiteAlpha.700" textAlign="right" mt={1}>
                  {formatTime(message.createdAt)}
                </Text>
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </VStack>

      {/* Active Call Notification */}
      {isCallActive() && (
        <HStack p={2} bg="green.700" justifyContent="center">
          <FaPhone />
          <Text>Call in progress with {friend.displayName || friend.username}</Text>
          <Button size="sm" leftIcon={<FaPhoneSlash />} colorScheme="red" onClick={onEndCall}>
            End
          </Button>
        </HStack>
      )}

      {/* Message Input */}
      <HStack p={4} bg="gray.800">
        <Input
          placeholder={`Message ${friend.displayName || friend.username}`}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <IconButton
          aria-label="Send message"
          icon={<FaPaperPlane />}
          colorScheme="purple"
          onClick={handleSendMessage}
          isDisabled={!messageInput.trim()}
        />
      </HStack>
    </Flex>
  );
} 