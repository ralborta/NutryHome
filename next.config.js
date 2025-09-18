/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      // Solo redirigir rutas específicas que no tenemos localmente
      {
        source: '/api/elevenlabs/:path*',
        destination: 'https://nutryhome-production.up.railway.app/api/elevenlabs/:path*',
      },
      {
        source: '/api/isabela/:path*',
        destination: 'https://nutryhome-production.up.railway.app/api/isabela/:path*',
      },
      // Las rutas /api/conversation/[id] y /api/audio/[id] se manejan localmente
    ];
  },
};

module.exports = nextConfig; 