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
    const usersRef = collection(db, 'users');
    
    // Make search case-insensitive by converting to lowercase
    // This assumes you store usernames in lowercase or you convert them at creation time
    const lowercaseUsername = username.toLowerCase();
    
    // Use a simple prefix search that's more lenient
    const q = query(usersRef, where('username', '>=', lowercaseUsername), where('username', '<=', lowercaseUsername + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    
    console.log("Found users:", querySnapshot.size);
    
    // If no results, try a more lenient search
    if (querySnapshot.empty) {
      console.log("No results with exact search, trying fallback search");
      const allUsersQuery = query(usersRef, limitQuery(20));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      
      // Manual filtering for partial matches
      const manualMatches = allUsersSnapshot.docs.filter(doc => {
        const userData = doc.data();
        return userData.username && userData.username.toLowerCase().includes(lowercaseUsername);
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
  const recipientRef = doc(db, 'users', recipientId);
  await updateDoc(recipientRef, {
    friendRequests: arrayUnion(senderId)
  });
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
  await addDoc(collection(db, 'messages'), {
    senderId,
    receiverId,
    content,
    createdAt: serverTimestamp()
  });
}

export function subscribeToDirectMessages(userId: string, friendId: string, callback: (messages: Message[]) => void) {
  // Create a query that gets messages where either:
  // 1. Current user is sender and friend is receiver OR
  // 2. Friend is sender and current user is receiver
  const q = query(
    collection(db, 'messages'),
    where('senderId', 'in', [userId, friendId]),
    where('receiverId', 'in', [userId, friendId]),
    orderBy('createdAt')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Message[];
    
    // Filter to only include messages between these two users
    const filteredMessages = messages.filter(msg => 
      (msg.senderId === userId && msg.receiverId === friendId) || 
      (msg.senderId === friendId && msg.receiverId === userId)
    );
    
    callback(filteredMessages);
  });
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