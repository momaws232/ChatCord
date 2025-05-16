import { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  IconButton,
  Text,
  Avatar,
  Flex,
  Divider,
  Button,
  useToast,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import { FaPaperPlane, FaPaperclip, FaMicrophone, FaSmile, FaHeadphones, FaPhoneSlash } from 'react-icons/fa';
import { Channel, Message, subscribeToChannelMessages, sendMessage, getUserProfile } from '../lib/chatService';
import { useAuth } from '../lib/contexts/AuthContext';
import { VoiceChatService } from '../lib/voiceChat';
import { connectSocket, getSocket } from '../lib/socket';

interface ChatInterfaceProps {
  channel: Channel | null;
}

export default function ChatInterface({ channel }: ChatInterfaceProps) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isInVoiceChannel, setIsInVoiceChannel] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const voiceChatServiceRef = useRef<VoiceChatService | null>(null);
  
  useEffect(() => {
    if (!voiceChatServiceRef.current) {
      voiceChatServiceRef.current = new VoiceChatService();
    }
    
    if (currentUser) {
      const socket = connectSocket(currentUser.uid);
      if (voiceChatServiceRef.current) {
        voiceChatServiceRef.current.setSocket(socket);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (channel) {
      const unsubscribe = subscribeToChannelMessages(channel.id, (updatedMessages) => {
        setMessages(updatedMessages);
        scrollToBottom();
      });
      
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [channel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!currentUser || !channel || (!messageInput.trim() && !attachment)) return;

    try {
      await sendMessage(
        channel.id,
        messageInput,
        currentUser.uid,
        attachment || undefined
      );
      
      setMessageInput('');
      setAttachment(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachment(e.target.files[0]);
    }
  };

  const joinVoiceChannel = async () => {
    if (!currentUser || !channel || channel.type !== 'voice' || !voiceChatServiceRef.current) return;
    
    try {
      await voiceChatServiceRef.current.joinVoiceChannel(channel.id, currentUser.uid);
      setIsInVoiceChannel(true);
      
      toast({
        title: 'Joined voice channel',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error joining voice channel:', error);
      toast({
        title: 'Error joining voice channel',
        description: 'Please check your microphone permissions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const leaveVoiceChannel = () => {
    if (!voiceChatServiceRef.current) return;
    
    voiceChatServiceRef.current.leaveVoiceChannel();
    setIsInVoiceChannel(false);
    
    toast({
      title: 'Left voice channel',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const renderMessageGroup = (message: Message, index: number) => {
    const isSameUser = index > 0 && messages[index - 1].senderId === message.senderId;
    
    return (
      <Box key={message.id} width="100%" pl={isSameUser ? 12 : 2} pr={2} mb={2}>
        {!isSameUser && (
          <HStack spacing={2} mb={1}>
            <Avatar size="sm" name={message.senderId} />
            <Text fontWeight="bold">{message.senderId}</Text>
            <Text fontSize="xs" color="gray.500">
              {message.createdAt?.toDate().toLocaleTimeString()}
            </Text>
          </HStack>
        )}
        
        <Box ml={isSameUser ? 0 : 10}>
          <Text>{message.content}</Text>
          {message.attachmentUrl && (
            <Box mt={2} maxW="300px">
              <img
                src={message.attachmentUrl}
                alt="Attachment"
                style={{ maxWidth: '100%', borderRadius: '4px' }}
              />
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  if (!channel) {
    return (
      <Flex
        flex={1}
        direction="column"
        bg="gray.600"
        color="white"
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize="xl">Select a channel to start chatting</Text>
      </Flex>
    );
  }

  return (
    <Flex flex={1} direction="column" bg="gray.600" color="white">
      {/* Channel Header */}
      <HStack
        p={4}
        bg="gray.700"
        borderBottom="1px solid"
        borderColor="gray.500"
      >
        {channel.type === 'text' ? (
          <Box fontSize="lg" fontWeight="bold">
            # {channel.name}
          </Box>
        ) : (
          <HStack>
            <FaHeadphones />
            <Box fontSize="lg" fontWeight="bold">
              {channel.name}
            </Box>
            {!isInVoiceChannel ? (
              <Button
                leftIcon={<FaMicrophone />}
                colorScheme="green"
                size="sm"
                onClick={joinVoiceChannel}
              >
                Join Voice
              </Button>
            ) : (
              <Button
                leftIcon={<FaPhoneSlash />}
                colorScheme="red"
                size="sm"
                onClick={leaveVoiceChannel}
              >
                Leave
              </Button>
            )}
          </HStack>
        )}
      </HStack>

      {/* Messages Container */}
      <VStack
        flex={1}
        overflowY="auto"
        spacing={0}
        p={4}
        alignItems="flex-start"
      >
        {messages.map((message, index) => renderMessageGroup(message, index))}
        <div ref={messagesEndRef} />
      </VStack>

      {/* Message Input */}
      <Box p={4} bg="gray.700">
        {attachment && (
          <HStack mb={2} p={2} bg="gray.600" borderRadius="md">
            <Text noOfLines={1} flex={1}>{attachment.name}</Text>
            <Button size="xs" onClick={() => setAttachment(null)}>
              Remove
            </Button>
          </HStack>
        )}
        
        <HStack>
          <Input
            placeholder={`Message #${channel.name}`}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={channel.type === 'voice'}
          />
          
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleAttachmentChange}
          />
          
          <Tooltip label="Attach File">
            <IconButton
              aria-label="Attach file"
              icon={<FaPaperclip />}
              onClick={handleAttachmentClick}
              disabled={channel.type === 'voice'}
            />
          </Tooltip>
          
          <Tooltip label="Send Message">
            <IconButton
              aria-label="Send message"
              icon={<FaPaperPlane />}
              colorScheme="purple"
              onClick={handleSendMessage}
              disabled={(!messageInput.trim() && !attachment) || channel.type === 'voice'}
            />
          </Tooltip>
        </HStack>
      </Box>
    </Flex>
  );
} 