/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  rewrites: async () => {
    return [
      {
        source: '/socket.io/:path*',
        destination: process.env.NEXT_PUBLIC_SOCKET_SERVER_URL 
          ? `${process.env.NEXT_PUBLIC_SOCKET_SERVER_URL}/socket.io/:path*` 
          : 'http://localhost:3001/socket.io/:path*',
      },
    ];
  },
  // Add CORS headers to enable WebSocket connections
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
}

module.exports = nextConfig 