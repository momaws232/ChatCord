import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  limit as limitQuery
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

// Simplified interfaces for friend-based chat
export interface User {
  id: string;
  username: string;
  displayName?: string;  // Optional display name with original casing
  email: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'away' | 'dnd';
  friends: string[];
  friendRequests: string[];
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: Timestamp;
}

export interface Call {
  id: string;
  creatorId: string;
  participants: string[];
  isActive: boolean;
  createdAt: Timestamp;
}

// User related methods
export async function createUserProfile(userId: string, username: string, email: string) {
  try {
    console.log(`Creating user profile for: ${userId}, username: ${username}`);
    
    // Store username in lowercase for easier searching
    const lowercaseUsername = username.toLowerCase();
    
    // Store the display version in a separate field
    await setDoc(doc(db, 'users', userId), {
      id: userId,
      username: lowercaseUsername,
      displayName: username,  // Keep original casing for display
      email,
      status: 'online',
      friends: [],
      friendRequests: [],
      createdAt: serverTimestamp()
    });
    
    console.log(`User profile created successfully for: ${username}`);
  } catch (error) {
    console.error(`Error creating user profile:`, error);
    throw error;
  }
}

export async function getUserProfile(userId: string) {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as User;
  }
  
  return null;
}

export async function updateUserStatus(userId: string, status: 'online' | 'offline' | 'away' | 'dnd') {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { status });
}

export async function updateUserProfile(userId: string, data: Partial<User>) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { ...data });
}

// Friend methods
export async function searchUsersByUsername(username: string) {
  try {
    console.log("Searching for username:", username);
    
    if (!username || username.trim() === '') {
      console.log("Empty username search, returning empty results");
      return [];
    }
    
    const usersRef = collection(db, 'users');
    
    // Make search case-insensitive by converting to lowercase
    const lowercaseUsername = username.toLowerCase().trim();
    console.log("Lowercase search term:", lowercaseUsername);
    
    // First try an exact match
    let q = query(usersRef, where('username', '==', lowercaseUsername));
    let querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log(`Found ${querySnapshot.size} users with exact match`);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as User);
    }
    
    // Then try a prefix search
    q = query(usersRef, where('username', '>=', lowercaseUsername), where('username', '<=', lowercaseUsername + '\uf8ff'));
    querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.size} users with prefix search`);
    
    // If no results, get all users and filter manually
    if (querySnapshot.empty) {
      console.log("No results with prefix search, trying manual search");
      const allUsersQuery = query(usersRef, limitQuery(20));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      
      // Log all users to help with debugging
      console.log("All users in database:");
      allUsersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        console.log(`- ${userData.username} (${doc.id})`);
      });
      
      // Manual filtering for partial matches
      const manualMatches = allUsersSnapshot.docs.filter(doc => {
        const userData = doc.data();
        if (!userData.username) return false;
        const match = userData.username.toLowerCase().includes(lowercaseUsername);
        if (match) {
          console.log(`Manual match found: ${userData.username}`);
        }
        return match;
      });
      
      console.log("Manual search found:", manualMatches.length);
      return manualMatches.map(doc => ({ id: doc.id, ...doc.data() }) as User);
    }
    
    return querySnapshot.docs.map(doc => {
      const userData = doc.data();
      console.log("Found user:", userData.username);
      return { id: doc.id, ...userData } as User;
    });
  } catch (error) {
    console.error("Error in searchUsersByUsername:", error);
    throw error;
  }
}

// Debug function - list all users
export async function listAllUsers(limit: number = 50) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limitQuery(limit));
    const querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.size} users in the database`);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`User: ${data.username}, ID: ${doc.id}`);
      return { id: doc.id, ...data } as User;
    });
  } catch (error) {
    console.error("Error listing users:", error);
    throw error;
  }
}

export async function sendFriendRequest(senderId: string, recipientId: string) {
  try {
    console.log(`Sending friend request from ${senderId} to ${recipientId}`);
    
    // First check if the recipient exists
    const recipientDoc = await getDoc(doc(db, 'users', recipientId));
    if (!recipientDoc.exists()) {
      console.error(`Recipient with ID ${recipientId} does not exist`);
      throw new Error('Recipient user does not exist');
    }
    
    // Make sure the sender exists too
    const senderDoc = await getDoc(doc(db, 'users', senderId));
    if (!senderDoc.exists()) {
      console.error(`Sender with ID ${senderId} does not exist`);
      throw new Error('Sender user does not exist');
    }
    
    // Check if the request already exists
    const recipientData = recipientDoc.data() as User;
    if (recipientData.friendRequests && recipientData.friendRequests.includes(senderId)) {
      console.log(`Friend request from ${senderId} to ${recipientId} already exists`);
      return; // Request already exists, no need to add it again
    }
    
    // Update recipient's friend requests
    const recipientRef = doc(db, 'users', recipientId);
    await updateDoc(recipientRef, {
      friendRequests: arrayUnion(senderId)
    });
    
    console.log(`Friend request successfully sent from ${senderId} to ${recipientId}`);
  } catch (error) {
    console.error('Error in sendFriendRequest:', error);
    throw error;
  }
}

export async function acceptFriendRequest(userId: string, friendId: string) {
  const userRef = doc(db, 'users', userId);
  const friendRef = doc(db, 'users', friendId);
  
  await updateDoc(userRef, {
    friends: arrayUnion(friendId),
    friendRequests: arrayRemove(friendId)
  });
  
  await updateDoc(friendRef, {
    friends: arrayUnion(userId)
  });
}

export async function rejectFriendRequest(userId: string, friendId: string) {
  const userRef = doc(db, 'users', userId);
  
  await updateDoc(userRef, {
    friendRequests: arrayRemove(friendId)
  });
}

export async function removeFriend(userId: string, friendId: string) {
  const userRef = doc(db, 'users', userId);
  const friendRef = doc(db, 'users', friendId);
  
  await updateDoc(userRef, {
    friends: arrayRemove(friendId)
  });
  
  await updateDoc(friendRef, {
    friends: arrayRemove(userId)
  });
}

export async function getFriends(userId: string) {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return [];
  
  const userData = userDoc.data() as User;
  const friendIds = userData.friends || [];
  
  const friends: User[] = [];
  for (const friendId of friendIds) {
    const friendProfile = await getUserProfile(friendId);
    if (friendProfile) {
      friends.push(friendProfile);
    }
  }
  
  return friends;
}

export async function getFriendRequests(userId: string) {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) return [];
  
  const userData = userDoc.data() as User;
  const requestIds = userData.friendRequests || [];
  
  const requests: User[] = [];
  for (const requestId of requestIds) {
    const requesterProfile = await getUserProfile(requestId);
    if (requesterProfile) {
      requests.push(requesterProfile);
    }
  }
  
  return requests;
}

// Direct messaging methods
export async function sendDirectMessage(senderId: string, receiverId: string, content: string) {
  try {
    console.log(`Sending message from ${senderId} to ${receiverId}: ${content}`);
    
    await addDoc(collection(db, 'messages'), {
      senderId,
      receiverId, 
      content,
      createdAt: serverTimestamp()
    });
    
    console.log('Message sent successfully');
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export function subscribeToDirectMessages(userId: string, friendId: string, callback: (messages: Message[]) => void) {
  // Create a query that gets messages where:
  // The combination of the two users is in the senderId and receiverId fields
  // Sort by creation time to show messages in order
  
  // First, create a conversation ID by sorting the two user IDs
  const conversationId = [userId, friendId].sort().join('-');
  
  // Create a composite index in Firestore before using this query
  // where we store a conversationId field in messages
  const messagesRef = collection(db, 'messages');
  
  // Query for messages that have either userId as sender and friendId as receiver,
  // or friendId as sender and userId as receiver
  const q = query(
    messagesRef,
    where('senderId', '==', userId),
    where('receiverId', '==', friendId),
    orderBy('createdAt')
  );
  
  const q2 = query(
    messagesRef,
    where('senderId', '==', friendId),
    where('receiverId', '==', userId),
    orderBy('createdAt')
  );
  
  // We need to use two separate listeners, one for each direction of messages
  const unsubscribe1 = onSnapshot(q, (querySnapshot) => {
    const outgoingMessages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Message[];
    
    // Get the incoming messages from the second query
    const unsubscribe2 = onSnapshot(q2, (querySnapshot2) => {
      const incomingMessages = querySnapshot2.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      // Combine and sort all messages by timestamp
      const allMessages = [...outgoingMessages, ...incomingMessages]
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return aTime - bTime;
        });
      
      callback(allMessages);
    });
  });
  
  // Return a function that unsubscribes from both listeners
  return () => {
    unsubscribe1();
  };
}

// Call methods
export async function createCall(creatorId: string, participants: string[] = []) {
  const callId = uuidv4();
  const allParticipants = [creatorId, ...participants];
  
  await setDoc(doc(db, 'calls', callId), {
    id: callId,
    creatorId,
    participants: allParticipants,
    isActive: true,
    createdAt: serverTimestamp()
  });
  
  return callId;
}

export async function getCall(callId: string) {
  const callRef = doc(db, 'calls', callId);
  const callDoc = await getDoc(callRef);
  
  if (callDoc.exists()) {
    return { id: callDoc.id, ...callDoc.data() } as Call;
  }
  
  return null;
}

export async function joinCall(callId: string, userId: string) {
  const callRef = doc(db, 'calls', callId);
  
  await updateDoc(callRef, {
    participants: arrayUnion(userId)
  });
}

export async function leaveCall(callId: string, userId: string) {
  const callRef = doc(db, 'calls', callId);
  const callDoc = await getDoc(callRef);
  
  if (callDoc.exists()) {
    const call = callDoc.data() as Call;
    const participants = call.participants.filter(id => id !== userId);
    
    if (participants.length === 0) {
      // End the call if no participants left
      await updateDoc(callRef, {
        isActive: false,
        participants: []
      });
    } else {
      await updateDoc(callRef, {
        participants: participants
      });
    }
  }
}

export function subscribeToCall(callId: string, callback: (call: Call | null) => void) {
  const callRef = doc(db, 'calls', callId);
  
  return onSnapshot(callRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Call);
    } else {
      callback(null);
    }
  });
} 