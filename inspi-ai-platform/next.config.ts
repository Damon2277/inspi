import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 基础配置
  reactStrictMode: true,
  serverExternalPackages: ['mongoose', 'ioredis'],
  poweredByHeader: false,
  compress: true,
  
  // Turbopack配置
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // 实验性功能
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
    serverMinification: true,
    serverSourceMaps: false,
  },

  // Webpack配置优化
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 优化模块解析
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/core': path.resolve(__dirname, 'src/core'),
      '@/shared': path.resolve(__dirname, 'src/shared'),
      '@/features': path.resolve(__dirname, 'src/features'),
      '@/app': path.resolve(__dirname, 'src/app'),
    };

    // 优化构建性能
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // 核心库单独打包
          core: {
            test: /[\\/]src[\\/]core[\\/]/,
            name: 'core',
            priority: 10,
            chunks: 'all',
          },
          // 共享组件
          shared: {
            test: /[\\/]src[\\/]shared[\\/]/,
            name: 'shared',
            priority: 8,
            chunks: 'all',
          },
          // 功能模块
          features: {
            test: /[\\/]src[\\/]features[\\/]/,
            name: 'features',
            priority: 6,
            chunks: 'all',
          },
          // 第三方库
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 5,
            chunks: 'all',
            enforce: true,
          },
          // React相关
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            priority: 20,
            chunks: 'all',
          },
          // UI库
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|@headlessui|framer-motion)[\\/]/,
            name: 'ui',
            priority: 15,
            chunks: 'all',
          },
        },
      },
      // 生产环境优化
      ...(dev ? {} : {
        minimize: true,
        sideEffects: false,
        usedExports: true,
        providedExports: true,
      }),
    };

    // 性能优化插件
    if (!dev) {
      config.plugins.push(
        new webpack.optimize.AggressiveMergingPlugin(),
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('production'),
        })
      );
    }

    // 模块解析优化
    config.resolve.modules = ['node_modules', path.resolve(__dirname, 'src')];
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];

    // 缓存优化
    if (!dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    return config;
  },

  // 图片配置
  images: {
    domains: ['lh3.googleusercontent.com', 'ui-avatars.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 环境变量配置
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // 重定向配置
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // 头部配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
