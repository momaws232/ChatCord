import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  Flex,
  Avatar,
  HStack,
  useDisclosure
} from '@chakra-ui/react';
import { FaPhone, FaPhoneSlash } from 'react-icons/fa';
import { User } from '../lib/chatService';

interface CallNotificationProps {
  caller: User | null;
  onAccept: () => void;
  onDecline: () => void;
}

const CallNotification: React.FC<CallNotificationProps> = ({ 
  caller, 
  onAccept, 
  onDecline 
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    console.log('CallNotification: caller changed', caller?.username);
    if (caller) {
      console.log('CallNotification: showing notification for', caller.username);
      onOpen();
      // Play ringtone
      if (audioRef.current) {
        console.log('Playing ringtone audio');
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error('Error playing ringtone:', err);
            // Show a toast or message that autoplay was blocked
            // This happens often in browsers due to autoplay policies
          });
        }
      } else {
        console.error('Audio ref is null');
      }
    } else {
      console.log('CallNotification: no caller, hiding notification');
      if (audioRef.current) {
        console.log('Stopping ringtone audio');
        audioRef.current.pause();
      }
      onClose();
    }
  }, [caller, onOpen, onClose]);

  const handleAccept = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onAccept();
    onClose();
  };

  const handleDecline = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onDecline();
    onClose();
  };

  if (!caller) return null;

  return (
    <>
      {/* Debug caller info */}
      {caller && <div style={{ display: 'none' }}>{`Incoming call from ${caller.username} (${caller.id})`}</div>}
      
      {/* Always render the audio element */}
      <audio 
        ref={audioRef} 
        src="/sounds/ringtone.mp3" 
        loop 
      />

      {/* Modal will handle its own visibility */}
      <Modal isOpen={isOpen} onClose={handleDecline} isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader textAlign="center">Incoming Call</ModalHeader>
          <ModalBody>
            {caller && (
              <Flex direction="column" align="center">
                <Avatar 
                  size="xl" 
                  name={caller.displayName || caller.username} 
                  src={caller.photoURL} 
                  mb={4}
                />
                <Text fontSize="lg" fontWeight="bold">
                  {caller.displayName || caller.username}
                </Text>
                <Text fontSize="sm" color="gray.400" mb={4}>
                  is calling you...
                </Text>
              </Flex>
            )}
          </ModalBody>
          <ModalFooter justifyContent="center">
            <HStack spacing={6}>
              <Button 
                leftIcon={<FaPhoneSlash />} 
                colorScheme="red" 
                onClick={handleDecline}
                borderRadius="full"
                size="lg"
              >
                Decline
              </Button>
              <Button 
                leftIcon={<FaPhone />} 
                colorScheme="green" 
                onClick={handleAccept}
                borderRadius="full"
                size="lg"
              >
                Accept
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CallNotification; 