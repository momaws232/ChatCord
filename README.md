# ChatCord

ChatCord is a real-time messaging application built with Next.js and Firebase that allows users to connect with friends, send direct messages, and engage in voice calls.

![ChatCord Screenshot](screenshot.png)

## Features

- **User Authentication**: Secure sign-up and login using Firebase Authentication
- **Friend Management**: Add friends, accept/reject friend requests
- **Real-time Messaging**: Send and receive messages instantly
- **Voice Calls**: Start voice calls with friends using WebRTC
- **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

- **Frontend**: Next.js, React, TypeScript, Chakra UI
- **Backend**: Node.js, Express, Socket.io
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Real-time Communication**: WebRTC (simple-peer)

## Getting Started

### Prerequisites

- Node.js 14+ and npm
- Firebase account

### Installation

1. Clone the repository
   ```
   git clone https://github.com/your-username/chatcord.git
   cd chatcord
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory with your Firebase config:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_SOCKET_SERVER_URL=http://localhost:3001
   ```

4. Start the application
   ```
   npm run dev:full
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Firebase Setup

1. Create a project in the [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Update the security rules for Firestore to secure your data
5. Add your local and production domains to the authorized domains in Authentication settings

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Add the environment variables from your `.env.local` file
3. Deploy the application

### Backend (Railway/Render)

1. Connect your GitHub repo to Railway or Render
2. Set the start command to `node server.js`
3. Add environment variables:
   - `ALLOWED_ORIGINS`: Your frontend URL
   - `PORT`: 3001 (or let the platform set it)

## Project Structure

```
chatcord/
├── components/           # React components
├── config/               # Firebase configuration
├── lib/                  # Utility functions and services
│   ├── contexts/         # React contexts (auth, etc.)
│   ├── chatService.ts    # Firebase interactions
│   ├── socket.ts         # Socket.io client
│   └── voiceChat.ts      # WebRTC voice chat implementation
├── pages/                # Next.js pages
├── public/               # Static assets
├── styles/               # CSS styles
└── server.js             # Socket.io server
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 