import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyClGKIqIL741xQSx6aJFQKkF-TcP49cHMc",
  authDomain: "chatcord-3a02a.firebaseapp.com",
  projectId: "chatcord-3a02a",
  storageBucket: "chatcord-3a02a.appspot.com",
  messagingSenderId: "1055460904991",
  appId: "1:1055460904991:web:21b250a99f11c04019052a",
  measurementId: "G-KR1KN7FHRW"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };