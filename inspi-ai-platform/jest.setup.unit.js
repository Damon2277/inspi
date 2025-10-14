/**
 * Jest 单元测试环境设置
 * 专门用于单元测试的环境配置
 */

// 导入基础设置
require('./jest.setup.js');

// 单元测试专用设置
process.env.NODE_ENV = 'test';
process.env.TEST_TYPE = 'unit';

// 禁用网络请求
global.fetch = jest.fn(() =>
  Promise.reject(new Error('Network requests are not allowed in unit tests')),
);

// 模拟外部依赖
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
  headers: () => ({
    get: jest.fn(),
    set: jest.fn(),
  }),
}));

// 模拟数据库连接
jest.mock('@/lib/db/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
  disconnectDB: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/db/redis', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
  }),
}));

// 模拟AI服务
jest.mock('@/lib/ai/gemini', () => ({
  generateCards: jest.fn().mockResolvedValue([]),
  generateContent: jest.fn().mockResolvedValue('Generated content'),
}));

// 模拟邮件服务
jest.mock('@/lib/email/service', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

// 模拟文件上传
jest.mock('@/lib/upload/service', () => ({
  uploadFile: jest.fn().mockResolvedValue({
    url: 'https://example.com/test-file.jpg',
    key: 'test-file-key',
  }),
  deleteFile: jest.fn().mockResolvedValue(true),
}));

// 模拟日志系统
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// 单元测试专用的全局变量
global.testUtils = {
  isUnitTest: true,
  mockExternalServices: true,
};

console.log('🧪 Unit test environment initialized');
