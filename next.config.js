/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://nutryhome-production.up.railway.app/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 