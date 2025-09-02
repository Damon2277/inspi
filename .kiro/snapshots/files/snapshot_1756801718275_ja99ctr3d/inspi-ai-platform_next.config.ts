import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 基础配置
  reactStrictMode: true,
  serverExternalPackages: ['mongoose', 'ioredis'],
  
  // 简化的图片配置
  images: {
    domains: ['lh3.googleusercontent.com', 'ui-avatars.com'],
    formats: ['image/webp'],
  },

};

export default nextConfig;
