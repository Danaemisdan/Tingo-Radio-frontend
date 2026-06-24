import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-940ccf6255b54fa799a9b01050e6c227.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        // iTunes / Apple Music album art CDN
        protocol: 'https',
        hostname: '**.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'is1-ssl.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'is2-ssl.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'is3-ssl.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'is4-ssl.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'is5-ssl.mzstatic.com',
      },
    ],
  },
};


export default nextConfig;
