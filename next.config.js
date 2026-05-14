const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    unoptimized: true, // For local development
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
}

module.exports = nextConfig
