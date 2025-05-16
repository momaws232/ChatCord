import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Flex, Box, Text } from '@chakra-ui/react';
import Sidebar from '../../components/Sidebar';
import ServerDetail from '../../components/ServerDetail';
import ChatInterface from '../../components/ChatInterface';
import { useAuth } from '../../lib/contexts/AuthContext';
import { Channel } from '../../lib/chatService';

export default function ServerPage() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser, loading } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/');
    }
  }, [currentUser, loading, router]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
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
      <Sidebar />
      
      {id ? (
        <>
          <ServerDetail serverId={id as string} onChannelSelect={handleChannelSelect} />
          <ChatInterface channel={selectedChannel} />
        </>
      ) : (
        <Box
          flex={1}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="gray.700"
          color="white"
        >
          <Text fontSize="xl">Loading server...</Text>
        </Box>
      )}
    </Flex>
  );
} 