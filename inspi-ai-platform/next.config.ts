import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 基础配置
  reactStrictMode: false, // 临时禁用以调试双导航问题
  serverExternalPackages: ['mongoose', 'ioredis'],
  
  // 简化的图片配置
  images: {
    domains: ['lh3.googleusercontent.com', 'ui-avatars.com'],
    formats: ['image/webp'],
  },

};

export default nextConfig;
