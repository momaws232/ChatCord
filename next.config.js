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
}

module.exports = nextConfig 